# OpenPencil (Yoohoo fork)

A product fork of the open-source [OpenPencil](https://github.com/open-pencil/open-pencil) design editor. It keeps the upstream engine (`.fig` / `.pen`, CanvasKit rendering, SceneGraph) and adds a React shell, cloud documents, and internal deployment.

> Upstream OpenPencil is under active development. This fork focuses on a React app shell and backend integration for business use.

**[Live preview →](http://pencil.dev.yoohoo.cn/)** · [Upstream demo](https://app.openpencil.dev/demo) · [Upstream docs](https://openpencil.dev)




---

## Relationship to upstream OpenPencil

| | Upstream OpenPencil | This fork (Yoohoo) |
| --- | --- | --- |
| Focus | Open-source editor + CLI / MCP / Vue SDK | Productized editor on the same engine |
| App UI | Vue 3 app under `src/` | Primary shell: `packages/react` |
| Backend | Local-first, no required account | Java `server/` + cloud docs / OSS |
| Hosting | Official web / desktop releases | Static web app + Docker Compose API |
| Engine | `@open-pencil/core` and related packages | Same packages; product diffs prefer `*.override.ts` |
| License | MIT | MIT (upstream) + fork-owned config / deploy |

**Same:** `.fig` I/O, SceneGraph, CanvasKit, Yoga layout, components/instances, and the programmable core.

**Different:** React product shell, cloud open/save, Aliyun OSS, and performance overrides (for example lazy `.fig` page load) without patching upstream sources in place.

---

## Live preview

| Environment | URL |
| --- | --- |
| Dev preview | **http://pencil.dev.yoohoo.cn/** |


<img width="1503" height="791" alt="image" src="https://github.com/user-attachments/assets/07ef8662-7f8e-4cce-9929-ebea6d1749f3" />


<img width="1910" height="924" alt="image" src="https://github.com/user-attachments/assets/f1607c74-9e7a-4942-a161-f00b993292bf" />




<img width="1899" height="1108" alt="image" src="https://github.com/user-attachments/assets/672d7848-db6e-48cb-a45f-beb40ea07c32" />






---

## Local development

### Requirements

- [Bun](https://bun.sh/) (latest stable recommended)
- Optional: Docker (to run the API locally via Compose)

### Install

From the repo root:

```sh
bun install
```



### Start the React editor

```sh
cd packages/react
bun run start
# NODE_ENV=development APP_ENV=local rspack server
```

Uses `config.local.ts` (API defaults to `http://localhost:8080`). Open **http://localhost:8000**.



Useful builds:

```sh
cd packages/react
bun run build:test   # APP_ENV=test (dev preview build)
bun run build:prod   # APP_ENV=prod
```

### Start the API locally (optional)

Point Compose at a published image (adjust the tag as needed):



```server/.env
DATABASE_URL=jdbc:postgresql://xxx:5432/open-pencil
DATABASE_USERNAME=open-pencil
DATABASE_PASSWORD=xx
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
SPRING_PROFILES_ACTIVE=dev

REDIS_HOST=xx
REDIS_PORT=xxx
REDIS_PASSWORD=xxx
REDIS_DATABASE=0

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:1420,http://localhost:8000


JWT_EXPIRATION=8640000000
JWT_REFRESH_EXPIRATION=604800000


OAUTH_GITHUB_CLIENT_ID=xx
OAUTH_GITHUB_CLIENT_SECRET=xx
OAUTH_GOOGLE_CLIENT_ID=xx
OAUTH_GOOGLE_CLIENT_SECRET=xxx


# SMTP (leave MAIL_HOST empty to log verification codes in the API console)
MAIL_HOST=xxx
MAIL_PORT=xx
MAIL_USERNAME=xx
MAIL_PASSWORD=xx


# Storage: local / oss
STORAGE_TYPE=local

OSS_ENDPOINT=oss-cn-shanghai.aliyuncs.com
OSS_ACCESS_KEY=xx
OSS_SECRET_KEY=xx
OSS_BUCKET=xx
OSS_BASE_PATH=xx/
OSS_PRESIGN_EXPIRATION_SECONDS=900


```

cd server

Maven run  Springboot 

Without the API, the editor still opens local `.fig` files; cloud open/save needs the server (or a remote API URL in config).

---

## Cloud deployment

### Frontend (React static app)

Build and publish the `packages/react` `dist` (for example via `.github/workflows/react-ui-deploy.yml`), then serve it behind nginx. Dev preview: **http://pencil.dev.yoohoo.cn/**.

| `APP_ENV` | Config | Typical use |
| --- | --- | --- |
| `local` | `config.local.ts` | Local rspack |
| `test` | `config.dev.ts` | Dev preview site |
| `prod` | `config.prod.ts` | Production site |

### Backend (Docker Compose)

Run the API with Docker Compose on the host (same shape as local):

```.env
DATABASE_URL=jdbc:postgresql://xxx:5432/open-pencil
DATABASE_USERNAME=open-pencil
DATABASE_PASSWORD=xx
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
SPRING_PROFILES_ACTIVE=dev

REDIS_HOST=xx
REDIS_PORT=xxx
REDIS_PASSWORD=xxx
REDIS_DATABASE=0

CORS_ALLOWED_ORIGINS=xxx,http://pencil.dev.yoohoo.cn


JWT_EXPIRATION=8640000000
JWT_REFRESH_EXPIRATION=604800000


OAUTH_GITHUB_CLIENT_ID=xx
OAUTH_GITHUB_CLIENT_SECRET=xx
OAUTH_GOOGLE_CLIENT_ID=xx
OAUTH_GOOGLE_CLIENT_SECRET=xxx


# SMTP (leave MAIL_HOST empty to log verification codes in the API console)
MAIL_HOST=xxx
MAIL_PORT=xx
MAIL_USERNAME=xx
MAIL_PASSWORD=xx


# Storage: local / oss
STORAGE_TYPE=oss

OSS_ENDPOINT=oss-cn-shanghai.aliyuncs.com
OSS_ACCESS_KEY=xx
OSS_SECRET_KEY=xx
OSS_BUCKET=yoohoo-oss
OSS_BASE_PATH=xx/
OSS_PRESIGN_EXPIRATION_SECONDS=900


```

```yaml
services:
  open-pencil-server:
    image: registry.cn-hangzhou.aliyuncs.com/jongwong/open-pencil-server:0.0.1-beta.28
    container_name: open-pencil-server
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=dev
      - LOCAL_STORAGE_PATH=/app/storage
    volumes:
      - /data/docker-mnt/open-pencil-server/.env:/app/.env
      - /data/docker-mnt/open-pencil-server/storage:/app/storage
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    external: true
```

```sh
# Ensure app-network exists, then:
docker compose pull open-pencil-server
docker compose up -d open-pencil-server
```

Update the image tag when releasing a new server build. Mount a real `.env` and persistent `storage` directory on the host. Use `SPRING_PROFILES_ACTIVE=prod` for production if that profile is configured in `server/`.

Image source: `server/Dockerfile` (multi-stage Maven → JRE).

---

## Repository layout (excerpt)

```
packages/
  scene-graph/   graph model (may include index.override.ts)
  fig/           .fig parse / instances (*.override.ts)
  core/          engine / renderer / editor (performance overrides)
  react/         React product shell + cloud integration (primary app)
  cli/ mcp/ …    upstream programmable tooling
server/          cloud API (Java)
```

Prefer `*.override.ts` for product/engine diffs so upstream files stay mergeable; rspack remaps overrides at build time.

---

## Upstream capabilities

Upstream still ships CLI (`@open-pencil/cli`), MCP, desktop AI agents, P2P collab, and token analysis. See:

- https://openpencil.dev  
- https://openpencil.dev/development/roadmap  

This fork’s day-to-day path is the **React shell + Compose API**.

---

## Checks

```sh
bun run check        # full gate
bun run test:unit    # unit tests
bun run format       # format
```

---

## License

[MIT License](./LICENSE) (upstream).

Upstream copyright belongs to OpenPencil contributors. Fork-owned React shell, cloud config, and deploy compose belong to this project’s maintainers.
