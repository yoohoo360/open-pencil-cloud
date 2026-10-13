//! Desktop loads the React app over HTTP. The default origin mirrors
//! `packages/react/src/config` (`FRONTEND_BASE_URL`). Non-prod builds may
//! change it from the native menu and persist the choice.

use std::{
    fs,
    path::PathBuf,
    process::Command,
};
use tauri::{AppHandle, Manager, Runtime, Url};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

const OVERRIDE_FILE: &str = "frontend-url.txt";

const PRESET_LOCAL: &str = "http://localhost:8000";
const PRESET_DEV: &str = "https://pencil.dev.yoohoo.cn";

/// Baked at compile time from `OPENPENCIL_FRONTEND_URL` / `OPENPENCIL_APP_ENV`,
/// matching the React config tables.
pub fn default_frontend_url() -> &'static str {
    if let Some(url) = option_env!("OPENPENCIL_FRONTEND_URL") {
        if !url.is_empty() {
            return url;
        }
    }
    match option_env!("OPENPENCIL_APP_ENV") {
        Some("prod") => "https://pencil.yoohoo.cn",
        Some("dev") | Some("test") => PRESET_DEV,
        _ => PRESET_LOCAL,
    }
}

pub fn allows_frontend_url_override() -> bool {
    !matches!(option_env!("OPENPENCIL_APP_ENV"), Some("prod"))
}

fn override_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    Ok(dir.join(OVERRIDE_FILE))
}

fn read_override<R: Runtime>(app: &AppHandle<R>) -> Option<String> {
    let path = override_path(app).ok()?;
    let raw = fs::read_to_string(path).ok()?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_string())
}

fn validate_frontend_url(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw.trim()).map_err(|error| error.to_string())?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err("Frontend URL must use http or https".into());
    }
    if url.host_str().is_none() {
        return Err("Frontend URL must include a host".into());
    }
    Ok(url)
}

pub fn resolved_frontend_url<R: Runtime>(app: &AppHandle<R>) -> String {
    if allows_frontend_url_override() {
        if let Some(override_url) = read_override(app) {
            if validate_frontend_url(&override_url).is_ok() {
                return override_url;
            }
        }
    }
    default_frontend_url().to_string()
}

pub fn apply_frontend_url<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let url = resolved_frontend_url(app);
    let parsed = validate_frontend_url(&url)?;
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is missing".to_string())?;
    window
        .navigate(parsed)
        .map_err(|error| error.to_string())
}

fn persist_and_apply<R: Runtime>(app: &AppHandle<R>, url: &str) -> Result<(), String> {
    if !allows_frontend_url_override() {
        return Err("Frontend URL cannot be changed in this build".into());
    }
    let parsed = validate_frontend_url(url)?;
    let path = override_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&path, parsed.as_str()).map_err(|error| error.to_string())?;
    apply_frontend_url(app)
}

fn clear_override_and_apply<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    if !allows_frontend_url_override() {
        return Err("Frontend URL cannot be changed in this build".into());
    }
    if let Ok(path) = override_path(app) {
        let _ = fs::remove_file(path);
    }
    apply_frontend_url(app)
}

fn show_error<R: Runtime>(app: &AppHandle<R>, message: &str) {
    app.dialog()
        .message(message)
        .kind(MessageDialogKind::Error)
        .title("Frontend URL")
        .blocking_show();
}

fn prompt_custom_url(current: &str) -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"try
  set answer to text returned of (display dialog "Frontend URL:" default answer {current:?} with title "OpenPencil")
  return answer
on error
  return ""
end try"#
        );
        let output = Command::new("osascript").arg("-e").arg(script).output().ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if text.is_empty() {
            return None;
        }
        return Some(text);
    }

    #[cfg(target_os = "windows")]
    {
        let script = format!(
            r#"Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('Frontend URL:','OpenPencil',{current:?})"#
        );
        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if text.is_empty() {
            return None;
        }
        return Some(text);
    }

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("zenity")
            .args([
                "--entry",
                "--title=OpenPencil",
                "--text=Frontend URL:",
                &format!("--entry-text={current}"),
            ])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if text.is_empty() {
            return None;
        }
        return Some(text);
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = current;
        None
    }
}

/// Native menu actions for non-prod frontend URL switching.
pub fn handle_frontend_menu_event<R: Runtime>(app: &AppHandle<R>, event_id: &str) -> bool {
    if !allows_frontend_url_override() {
        return false;
    }
    let result = match event_id {
        "frontend-url-default" => clear_override_and_apply(app),
        "frontend-url-local" => persist_and_apply(app, PRESET_LOCAL),
        "frontend-url-dev" => persist_and_apply(app, PRESET_DEV),
        "frontend-url-custom" => {
            let current = resolved_frontend_url(app);
            match prompt_custom_url(&current) {
                Some(url) => persist_and_apply(app, &url),
                None => return true,
            }
        }
        _ => return false,
    };
    if let Err(error) = result {
        show_error(app, &error);
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_rejects_non_http() {
        assert!(validate_frontend_url("file:///tmp").is_err());
        assert!(validate_frontend_url("not a url").is_err());
    }

    #[test]
    fn validate_accepts_http_origins() {
        assert!(validate_frontend_url("http://localhost:8000").is_ok());
        assert!(validate_frontend_url("https://pencil.dev.yoohoo.cn/").is_ok());
    }
}
