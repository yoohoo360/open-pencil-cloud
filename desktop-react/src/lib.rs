mod agents;
mod credentials;
mod deep_link;
mod fig_container;
mod fonts;
mod frontend;
mod http;
mod menu;
mod menu_events;
#[cfg(target_os = "macos")]
mod window;

use credentials::{
    credential_access_paused, credential_read, credential_remove, credential_retry_access,
    credential_status, credential_store_availability, credential_write,
};
use deep_link::path_matches_suffix;
use fig_container::build_fig_file;
use fonts::{list_system_fonts, load_system_font};
use frontend::{apply_frontend_url, resolved_frontend_url};
use http::proxy_http_request;
use menu::{install_app_menu, native_menu_checked, set_native_menu_checked};
use menu_events::handle_menu_event;
use std::{
    collections::HashMap,
    fs::{create_dir_all, OpenOptions},
    io::Write,
    net::TcpStream,
    path::{Path, PathBuf},
    process::{Command as ProcessCommand, Stdio},
    sync::Mutex,
    time::Duration,
};
use tauri::{Emitter, Manager};
use tauri_plugin_fs::FsExt;
#[cfg(target_os = "macos")]
use window::show_main_window;

#[derive(Clone, serde::Serialize)]
struct PendingOpenFile {
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    node: Option<String>,
    /// Which producer queued this entry: a `openpencil://` link (true) or a file
    /// association / argv path (false). The frontend cannot tell them apart from
    /// the path alone — a canonicalized Windows path is verbatim (`\\?\C:\…`).
    #[serde(rename = "deepLink")]
    deep_link: bool,
}

struct PendingOpen(Mutex<Vec<PendingOpenFile>>);

/// Rooms from `openpencil://join` links, waiting for the frontend to open them.
struct PendingRooms(Mutex<Vec<String>>);

#[tauri::command]
fn take_pending_rooms(state: tauri::State<PendingRooms>) -> Vec<String> {
    state
        .0
        .lock()
        .map(|mut pending| pending.drain(..).collect())
        .unwrap_or_default()
}

#[tauri::command]
fn take_pending_open(state: tauri::State<PendingOpen>) -> Vec<PendingOpenFile> {
    state
        .0
        .lock()
        .map(|mut pending| pending.drain(..).collect())
        .unwrap_or_default()
}

/// Version of the system WebView engine the app is rendering in, so the
/// startup support gate can name it when the engine is too old. Uses the
/// WebKit bundle version on macOS, the WebKitGTK version on Linux, and the
/// WebView2 runtime version on Windows; `None` when the runtime cannot report it.
#[tauri::command]
fn webview_version() -> Option<String> {
    tauri::webview_version().ok()
}

#[tauri::command]
fn set_recent_files(app: tauri::AppHandle, paths: Vec<String>) -> Result<(), String> {
    install_app_menu(&app, &paths).map_err(|error| error.to_string())
}

/// Name of the MCP entry point installed by `@open-pencil/mcp`.
const MCP_EXECUTABLE: &str = "openpencil-mcp-http";
/// Bound on the directories reported back to the settings diagnostics.
const MAX_REPORTED_SEARCH_DIRS: usize = 12;
/// Local MCP HTTP port (same as `@open-pencil/core` `AUTOMATION_HTTP_PORT`).
/// Also serves `GET /ok` for the React chat runtime badge (no separate :2024 process).
const MCP_HTTP_PORT: u16 = 7600;

/// Directories that commonly hold a globally installed Node/Bun CLI.
///
/// GUI launches inherit launchd's minimal `PATH`, so a package installed by
/// npm, Bun, Volta, or Homebrew can be invisible even though the user's shell
/// finds it. `fix_path_env::fix()` reads the login shell first; these entries
/// cover managers that only modify an interactive rc file.
fn mcp_candidate_dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();
    if let Some(home) = std::env::var_os("HOME").map(PathBuf::from) {
        dirs.push(home.join(".bun/bin"));
        dirs.push(home.join(".local/bin"));
        dirs.push(home.join(".npm-global/bin"));
        dirs.push(home.join(".volta/bin"));
        dirs.push(home.join("n/bin"));
        dirs.push(home.join(".local/share/mise/shims"));
    }
    #[cfg(target_os = "macos")]
    {
        dirs.push(PathBuf::from("/opt/homebrew/bin"));
        dirs.push(PathBuf::from("/usr/local/bin"));
        dirs.push(PathBuf::from("/opt/local/bin"));
    }
    #[cfg(target_os = "linux")]
    {
        dirs.push(PathBuf::from("/usr/local/bin"));
        dirs.push(PathBuf::from("/home/linuxbrew/.linuxbrew/bin"));
    }
    #[cfg(windows)]
    {
        if let Some(appdata) = std::env::var_os("APPDATA").map(PathBuf::from) {
            dirs.push(appdata.join("npm"));
        }
    }
    dirs
}

fn push_unique_dir(dirs: &mut Vec<String>, dir: String) {
    if !dirs.contains(&dir) {
        dirs.push(dir);
    }
}

/// Existing candidate directories, most specific first, for diagnostics.
fn mcp_search_dirs() -> Vec<PathBuf> {
    mcp_candidate_dirs()
        .into_iter()
        .filter(|dir| dir.is_dir())
        .collect()
}

/// Append candidate directories that the current process `PATH` is missing.
fn augment_path(path: &str, candidates: &[PathBuf]) -> String {
    let mut entries: Vec<PathBuf> = std::env::split_paths(path).collect();
    for candidate in candidates {
        if candidate.is_dir() && !entries.contains(candidate) {
            entries.push(candidate.clone());
        }
    }
    std::env::join_paths(entries)
        .map(|joined| joined.to_string_lossy().into_owned())
        .unwrap_or_else(|_| path.to_string())
}

/// Make globally installed CLIs visible to `which` and to spawned children.
fn augment_mcp_path() {
    let current = std::env::var("PATH").unwrap_or_default();
    let next = augment_path(&current, &mcp_candidate_dirs());
    if next != current {
        std::env::set_var("PATH", next);
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct McpLookup {
    available: bool,
    path: Option<String>,
    /// Existing directories that were searched, for diagnostics.
    searched: Vec<String>,
}

struct McpLaunch {
    program: PathBuf,
    args: Vec<String>,
    cwd: Option<PathBuf>,
    /// Path shown in diagnostics / settings.
    display: PathBuf,
}

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn repo_root() -> Option<PathBuf> {
    crate_dir().parent().map(Path::to_path_buf)
}

fn host_target_triple() -> &'static str {
    #[cfg(all(target_arch = "aarch64", target_os = "macos"))]
    {
        "aarch64-apple-darwin"
    }
    #[cfg(all(target_arch = "x86_64", target_os = "macos"))]
    {
        "x86_64-apple-darwin"
    }
    #[cfg(all(target_arch = "aarch64", target_os = "windows"))]
    {
        "aarch64-pc-windows-msvc"
    }
    #[cfg(all(target_arch = "x86_64", target_os = "windows"))]
    {
        "x86_64-pc-windows-msvc"
    }
    #[cfg(all(target_arch = "aarch64", target_os = "linux"))]
    {
        "aarch64-unknown-linux-gnu"
    }
    #[cfg(all(target_arch = "x86_64", target_os = "linux"))]
    {
        "x86_64-unknown-linux-gnu"
    }
    #[cfg(not(any(
        all(target_os = "macos", any(target_arch = "aarch64", target_arch = "x86_64")),
        all(target_os = "windows", any(target_arch = "aarch64", target_arch = "x86_64")),
        all(target_os = "linux", any(target_arch = "aarch64", target_arch = "x86_64")),
    )))]
    {
        "unknown"
    }
}

fn cargo_profile_dir() -> &'static str {
    if cfg!(debug_assertions) {
        "debug"
    } else {
        "release"
    }
}

fn mcp_binary_name() -> PathBuf {
    #[cfg(windows)]
    {
        PathBuf::from(format!("{MCP_EXECUTABLE}.exe"))
    }
    #[cfg(not(windows))]
    {
        PathBuf::from(MCP_EXECUTABLE)
    }
}

/// Packaged Tauri `externalBin` lands next to the app executable (Contents/MacOS on macOS).
fn bundled_sidecar_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    let name = mcp_binary_name();
    if let Ok(dir) = app.path().executable_dir() {
        let candidate = dir.join(&name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidate = dir.join(&name);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn binary_launch(path: PathBuf) -> McpLaunch {
    McpLaunch {
        display: path.clone(),
        program: path,
        args: Vec::new(),
        cwd: None,
    }
}

/// Resolve how to start the local MCP HTTP server without requiring a global install.
///
/// Order: packaged sidecar (next to the app binary) → PATH → workspace
/// `bun run packages/mcp/src/index.ts` → `binaries/…` / `target/<profile>/…`.
fn resolve_mcp_launch(app: &tauri::AppHandle) -> Option<McpLaunch> {
    if let Some(path) = bundled_sidecar_path(app) {
        return Some(binary_launch(path));
    }

    if let Ok(path) = which::which(MCP_EXECUTABLE) {
        return Some(binary_launch(path));
    }

    if let Some(root) = repo_root() {
        let script = root.join("packages/mcp/src/index.ts");
        if script.is_file() {
            if let Ok(bun) = which::which("bun") {
                return Some(McpLaunch {
                    display: script.clone(),
                    program: bun,
                    args: vec!["run".into(), script.to_string_lossy().into_owned()],
                    cwd: Some(root),
                });
            }
        }
    }

    let crate_root = crate_dir();
    let bundled = crate_root.join("binaries").join(format!(
        "{MCP_EXECUTABLE}-{}",
        host_target_triple()
    ));
    #[cfg(windows)]
    let bundled = bundled.with_extension("exe");
    if bundled.is_file() {
        return Some(binary_launch(bundled));
    }

    let target_bin = crate_root
        .join("target")
        .join(cargo_profile_dir())
        .join(mcp_binary_name());
    if target_bin.is_file() {
        return Some(binary_launch(target_bin));
    }

    None
}

fn mcp_searched_dirs(app: &tauri::AppHandle, launch: Option<&McpLaunch>) -> Vec<String> {
    let mut searched: Vec<String> = Vec::new();
    if let Some(dir) = launch.and_then(|launch| launch.display.parent()) {
        push_unique_dir(&mut searched, dir.display().to_string());
    }
    if let Ok(dir) = app.path().executable_dir() {
        push_unique_dir(&mut searched, dir.display().to_string());
    }
    for dir in mcp_search_dirs() {
        push_unique_dir(&mut searched, dir.display().to_string());
    }
    let binaries = crate_dir().join("binaries");
    if binaries.is_dir() {
        push_unique_dir(&mut searched, binaries.display().to_string());
    }
    if let Some(root) = repo_root() {
        let mcp_src = root.join("packages/mcp/src");
        if mcp_src.is_dir() {
            push_unique_dir(&mut searched, mcp_src.display().to_string());
        }
    }
    searched.truncate(MAX_REPORTED_SEARCH_DIRS);
    searched
}

fn mcp_port_open() -> bool {
    TcpStream::connect_timeout(
        &std::net::SocketAddr::from(([127, 0, 0, 1], MCP_HTTP_PORT)),
        Duration::from_millis(200),
    )
    .is_ok()
}

/// `~/Library/Logs/OpenPencil/mcp-http.log` on macOS (Tauri app log dir).
fn mcp_log_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    let dir = app.path().app_log_dir().ok()?;
    create_dir_all(&dir).ok()?;
    Some(dir.join("mcp-http.log"))
}

fn append_mcp_log(path: &Path, line: &str) {
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{line}");
    }
    eprintln!("{line}");
}

fn record_mcp_log(app: &tauri::AppHandle, message: impl AsRef<str>) {
    let message = message.as_ref();
    if let Some(path) = mcp_log_path(app) {
        append_mcp_log(&path, message);
    } else {
        eprintln!("{message}");
    }
}

fn spawn_mcp_launch(
    app: &tauri::AppHandle,
    launch: &McpLaunch,
    env: &HashMap<String, String>,
) -> Result<(), String> {
    let mut command = ProcessCommand::new(&launch.program);
    command.args(&launch.args);
    if let Some(cwd) = &launch.cwd {
        command.current_dir(cwd);
    }
    for (key, value) in env {
        command.env(key, value);
    }
    // Do not inherit a parent OPENPENCIL_MCP_APP_TIMEOUT_MS — desktop-owned
    // servers must stay up until the user quits (remote frontends attach later).
    command.env_remove("OPENPENCIL_MCP_APP_TIMEOUT_MS");
    command.stdin(Stdio::null());
    record_mcp_log(
        app,
        format!(
            "[{}] spawn {} cwd={:?} PORT={}",
            chrono_like_now(),
            launch.display.display(),
            launch.cwd,
            env.get("PORT").map(String::as_str).unwrap_or("?")
        ),
    );
    if let Some(log_path) = mcp_log_path(app) {
        match OpenOptions::new().create(true).append(true).open(&log_path) {
            Ok(file) => {
                let stderr = file
                    .try_clone()
                    .map_err(|error| format!("Failed to clone MCP log handle: {error}"))?;
                command.stdout(Stdio::from(file)).stderr(Stdio::from(stderr));
            }
            Err(_) => {
                command.stdout(Stdio::null()).stderr(Stdio::null());
            }
        }
    } else {
        command.stdout(Stdio::null()).stderr(Stdio::null());
    }
    let child = command
        .spawn()
        .map_err(|error| format!("Failed to start MCP: {error}"))?;
    // Keep the MCP process running after this command returns.
    std::mem::forget(child);
    Ok(())
}

/// Lightweight stamp without pulling in a chrono dependency.
fn chrono_like_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    format!("unix:{secs}")
}

fn default_mcp_env(app: &tauri::AppHandle) -> HashMap<String, String> {
    let mut env = HashMap::new();
    env.insert("PORT".into(), MCP_HTTP_PORT.to_string());
    env.insert("OPENPENCIL_MCP_TCP".into(), "1".into());
    // Empty token disables auth so local agents can reach /health immediately.
    // Settings can still restart via `mcp_start` with a bearer when the user enables it.
    env.insert("OPENPENCIL_MCP_AUTH_TOKEN".into(), String::new());
    env.insert(
        "OPENPENCIL_MCP_CORS_ORIGIN".into(),
        resolved_frontend_url(app),
    );
    env.insert("OPENPENCIL_MCP_SCOPE".into(), "document".into());
    env
}

/// Start the bundled MCP HTTP server from the native shell.
///
/// Packaged builds load a remote frontend that may not call `ensureMCPRuntime`,
/// so the desktop must own this process itself.
fn ensure_mcp_on_startup(app: &tauri::AppHandle) {
    if mcp_port_open() {
        record_mcp_log(
            app,
            format!("[mcp] already listening on http://127.0.0.1:{MCP_HTTP_PORT}"),
        );
        return;
    }
    let Some(launch) = resolve_mcp_launch(app) else {
        record_mcp_log(
            app,
            "[mcp] openpencil-mcp-http not found next to the app binary; MCP will stay offline",
        );
        return;
    };
    record_mcp_log(
        app,
        format!(
            "[mcp] starting {} → http://127.0.0.1:{MCP_HTTP_PORT}",
            launch.display.display()
        ),
    );
    match spawn_mcp_launch(app, &launch, &default_mcp_env(app)) {
        Ok(()) => {
            let handle = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(800));
                if mcp_port_open() {
                    record_mcp_log(
                        &handle,
                        format!("[mcp] health ok — http://127.0.0.1:{MCP_HTTP_PORT}/health"),
                    );
                } else {
                    record_mcp_log(
                        &handle,
                        format!(
                            "[mcp] process spawned but :{MCP_HTTP_PORT} is still closed — see mcp-http.log"
                        ),
                    );
                }
            });
        }
        Err(error) => record_mcp_log(app, format!("[mcp] {error}")),
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct McpHealth {
    ok: bool,
    status: Option<u16>,
    version: Option<String>,
    /// JSON `status` from `/health` (`ok` / `no_app`), when parseable.
    server_status: Option<String>,
}

/// Probe local MCP over native HTTP so an https:// frontend is not blocked by mixed content.
#[tauri::command]
async fn mcp_health(auth_token: Option<String>) -> McpHealth {
    let url = format!("http://127.0.0.1:{MCP_HTTP_PORT}/health");
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(1000))
        .build()
    {
        Ok(client) => client,
        Err(_) => {
            return McpHealth {
                ok: false,
                status: None,
                version: None,
                server_status: None,
            }
        }
    };
    let mut request = client.get(url);
    if let Some(token) = auth_token.as_deref().map(str::trim).filter(|token| !token.is_empty()) {
        request = request.bearer_auth(token);
    }
    let Ok(response) = request.send().await else {
        return McpHealth {
            ok: false,
            status: None,
            version: None,
            server_status: None,
        };
    };
    let status = response.status().as_u16();
    let ok = response.status().is_success();
    let body: Option<serde_json::Value> = response.json().await.ok();
    let version = body
        .as_ref()
        .and_then(|value: &serde_json::Value| value.get("version"))
        .and_then(|value: &serde_json::Value| value.as_str())
        .map(str::to_owned);
    let server_status = body
        .as_ref()
        .and_then(|value: &serde_json::Value| value.get("status"))
        .and_then(|value: &serde_json::Value| value.as_str())
        .map(str::to_owned);
    McpHealth {
        ok,
        status: Some(status),
        version,
        server_status,
    }
}

#[tauri::command]
fn mcp_lookup(app: tauri::AppHandle) -> McpLookup {
    let launch = resolve_mcp_launch(&app);
    let path = launch.as_ref().map(|launch| launch.display.display().to_string());
    let searched = mcp_searched_dirs(&app, launch.as_ref());
    McpLookup {
        available: launch.is_some(),
        path,
        searched,
    }
}

#[tauri::command]
fn mcp_start(app: tauri::AppHandle, env: HashMap<String, String>) -> Result<(), String> {
    let launch = resolve_mcp_launch(&app).ok_or_else(|| {
        "openpencil-mcp-http was not found in the app bundle. Rebuild with `bun run build` in desktop-react (bundles the MCP sidecar), or run `bun run start:mcp`."
            .to_string()
    })?;
    let mut merged = default_mcp_env(&app);
    for (key, value) in env {
        // Frontend may request a timeout for its own spawn; strip it so a
        // desktop-managed restart does not orphan-kill after 30s.
        if key == "OPENPENCIL_MCP_APP_TIMEOUT_MS" {
            continue;
        }
        merged.insert(key, value);
    }
    spawn_mcp_launch(&app, &launch, &merged)
}

fn file_association_path(path: PathBuf) -> Option<PathBuf> {
    let path = path.canonicalize().ok()?;
    if !path.is_file() {
        return None;
    }
    let ext = path.extension()?.to_string_lossy().to_lowercase();
    matches!(ext.as_str(), "fig" | "pen").then_some(path)
}

fn path_from_arg(arg: String, cwd: &Path) -> Option<PathBuf> {
    if arg.starts_with('-') {
        return None;
    }

    if let Ok(url) = tauri::Url::parse(&arg) {
        if let Ok(path) = url.to_file_path() {
            return Some(path);
        }
    }

    let path = PathBuf::from(arg);
    Some(if path.is_absolute() {
        path
    } else {
        cwd.join(path)
    })
}

fn open_paths_from_args(args: Vec<String>, cwd: &Path) -> Vec<PathBuf> {
    args.into_iter()
        .filter_map(|arg| path_from_arg(arg, cwd))
        .filter_map(file_association_path)
        .collect()
}

fn queue_pending<R: tauri::Runtime>(app: &tauri::AppHandle<R>, files: Vec<PendingOpenFile>) {
    if files.is_empty() {
        return;
    }

    if let Ok(mut pending) = app.state::<PendingOpen>().0.lock() {
        pending.extend(files);
    }

    let _ = app.emit("open-associated-files", ());
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
}

fn queue_open_paths<R: tauri::Runtime>(app: &tauri::AppHandle<R>, paths: Vec<PathBuf>) {
    let files = paths
        .into_iter()
        .map(|path| {
            let _ = app.fs_scope().allow_file(&path);
            PendingOpenFile {
                path: path.to_string_lossy().into_owned(),
                node: None,
                deep_link: false,
            }
        })
        .collect::<Vec<_>>();

    queue_pending(app, files);
}

/// The scheme filter is load-bearing: on macOS the plugin forwards every
/// `RunEvent::Opened` URL here, including the `file://` URLs of a double-clicked
/// document, which `queue_open_paths` already handles.
///
/// Relative paths from a link are deliberately not passed through
/// `fs_scope().allow_file`: the frontend resolves them against open tabs or the
/// file picker and allows the resolved absolute path there.
fn queue_deep_links<R: tauri::Runtime>(app: &tauri::AppHandle<R>, urls: Vec<url::Url>) {
    let mut files = Vec::new();
    let mut rooms = Vec::new();
    for url in urls.iter().filter(|url| url.scheme() == "openpencil") {
        match deep_link::parse_deep_link(url) {
            Ok(deep_link::DeepLink::Open(open)) => files.push(PendingOpenFile {
                path: open.file,
                node: open.node,
                deep_link: true,
            }),
            Ok(deep_link::DeepLink::Join(join)) => rooms.push(join.room),
            // The sign-in that opened the browser is waiting; it checks the state itself.
            Ok(deep_link::DeepLink::OAuth(callback)) => {
                let _ = app.emit("oauth-callback", callback);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }
            Err(error) => eprintln!("[deep-link] refused {url}: {error:?}"),
        }
    }

    queue_pending(app, files);
    queue_rooms(app, rooms);
}

fn queue_rooms<R: tauri::Runtime>(app: &tauri::AppHandle<R>, rooms: Vec<String>) {
    if rooms.is_empty() {
        return;
    }

    if let Ok(mut pending) = app.state::<PendingRooms>().0.lock() {
        pending.extend(rooms);
    }

    let _ = app.emit("open-room-links", ());
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
}

/// `openpencil://` URLs among a second launch's arguments: Windows and Linux start a new
/// process for a link, and the single-instance plugin hands its arguments to this one.
fn deep_links_from_args(args: &[String]) -> Vec<url::Url> {
    args.iter()
        .filter(|arg| arg.starts_with("openpencil://"))
        .filter_map(|arg| url::Url::parse(arg).ok())
        .collect()
}

fn startup_open_paths() -> Vec<PathBuf> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    open_paths_from_args(std::env::args().skip(1).collect(), &cwd)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = fix_path_env::fix();
    augment_mcp_path();

    let mut builder = tauri::Builder::default();

    #[cfg(feature = "native-test")]
    {
        builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    }

    #[cfg(all(
        any(target_os = "macos", windows, target_os = "linux"),
        not(feature = "native-test")
    ))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            queue_deep_links(app, deep_links_from_args(&args));
            queue_open_paths(app, open_paths_from_args(args, Path::new(&cwd)));
        }));
    }

    builder = builder.plugin(tauri_plugin_deep_link::init());

    builder
        .manage(PendingOpen(Mutex::new(Vec::new())))
        .manage(PendingRooms(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![
            agents::agent_lookup,
            build_fig_file,
            credential_read,
            credential_access_paused,
            credential_retry_access,
            credential_remove,
            credential_status,
            credential_store_availability,
            credential_write,
            mcp_lookup,
            mcp_health,
            mcp_start,
            path_matches_suffix,
            list_system_fonts,
            load_system_font,
            proxy_http_request,
            set_recent_files,
            native_menu_checked,
            set_native_menu_checked,
            take_pending_open,
            take_pending_rooms,
            webview_version
        ])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .on_menu_event(|app, event| {
            handle_menu_event(app, event.id().0.as_str());
        })
        .setup(|app| {
            queue_open_paths(app.handle(), startup_open_paths());

            // Own the local MCP HTTP server (also serves GET /ok for the chat badge).
            // Packaged builds navigate to a remote frontend that may never invoke `mcp_start`.
            ensure_mcp_on_startup(app.handle());

            // Load the React app over HTTP (config default, or a non-prod override).
            if let Err(error) = apply_frontend_url(app.handle()) {
                eprintln!("[frontend] failed to navigate: {error}");
            }

            use tauri_plugin_deep_link::DeepLinkExt;
            // On macOS the plugin turns `RunEvent::Opened` into this callback, so every
            // link that arrives while the app runs is handled here; the cold-start link
            // arrives before this closure and is drained from `current` below. The
            // `Opened` arm further down keeps handling file URLs.
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                queue_deep_links(&handle, event.urls());
            });
            #[cfg(any(windows, target_os = "linux"))]
            {
                if let Err(error) = app.deep_link().register_all() {
                    eprintln!("[deep-link] register_all failed: {error}");
                }
            }
            // Every desktop platform can deliver the launch link before this closure
            // runs, which means before the listener above exists, and the plugin's
            // `deep-link://new-url` emit then reaches nobody:
            //
            // - Windows / Linux: the link is argv, and the plugin parses it in its own
            //   setup (`handle_cli_arguments`).
            // - macOS: AppKit delivers the GetURL event *before* the app's setup. Traced
            //   on a cold `open openpencil://…`: `RunEvent::Opened` at T+0.085 s, this
            //   closure at T+0.342 s, and `on_open_url` never fired.
            //
            // In all three cases the URL survives only in the plugin's `current`, so it
            // is read here. No link can be queued twice: `RunEvent::Opened` is dispatched
            // on the main thread, the same thread this closure runs on, so a link cannot
            // arrive between the registration above and this read — anything later goes
            // to `on_open_url` and is no longer in `current` by the time it is read.
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                queue_deep_links(app.handle(), urls);
            }

            Ok(install_app_menu(app.handle(), &[])?)
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| match event {
            tauri::RunEvent::ExitRequested {
                api, code: None, ..
            } if !_app.webview_windows().is_empty() => {
                api.prevent_exit();
                // The frontend asks about unsaved documents and exits when they agree.
                let _ = _app.emit("menu-event", "quit");
            }
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Opened { urls } => {
                let paths = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .filter_map(file_association_path)
                    .collect();
                queue_open_paths(_app, paths);
            }
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } => {
                if !has_visible_windows {
                    show_main_window(_app);
                }
            }
            _ => {}
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn augment_path_appends_missing_candidates_once() {
        let current_dir = std::env::temp_dir();
        let appended_dir = std::env::temp_dir().join("open-pencil-appended");
        std::fs::create_dir_all(&appended_dir).expect("create candidate dir");

        let current =
            std::env::join_paths([PathBuf::from("/open-pencil-first"), current_dir.clone()])
                .expect("join path list");
        let candidates = vec![current_dir.clone(), appended_dir.clone()];
        let entries: Vec<PathBuf> =
            std::env::split_paths(&augment_path(&current.to_string_lossy(), &candidates)).collect();

        // Existing entries keep their order and the missing candidate is
        // appended once, at the end.
        assert_eq!(
            entries,
            vec![
                PathBuf::from("/open-pencil-first"),
                current_dir,
                appended_dir.clone(),
            ]
        );

        let _ = std::fs::remove_dir(&appended_dir);
    }

    #[test]
    fn augment_path_ignores_candidates_that_do_not_exist() {
        let current =
            std::env::join_paths([PathBuf::from("/open-pencil-only")]).expect("join path list");
        let augmented = augment_path(
            &current.to_string_lossy(),
            &[PathBuf::from("/open-pencil-nonexistent")],
        );

        assert!(!augmented.contains("nonexistent"));
    }

    #[test]
    fn augment_path_keeps_an_existing_path_when_nothing_changes() {
        let current = std::env::var("PATH").unwrap_or_default();
        let augmented = augment_path(&current, &[]);
        assert_eq!(augmented, current);
    }
}
