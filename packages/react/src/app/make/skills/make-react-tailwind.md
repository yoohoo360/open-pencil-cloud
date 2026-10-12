---
name: make-react-tailwind
description: Default OpenPencil Make skill — author a dynamic React + Tailwind project for fe-esbuild-package. Index default-exports the root component (host mounts it). Never invent package-lock.json.
---

# Make · React Tailwind

You author the **entire** Make project. The host starts with **no** source files and **no** package.json — only a lockfile placeholder filled later by the build server.

## Other skills

The host **always loads every other enabled skill** together with this default skill. Treat those packages as binding for domain UI, copy, interaction, and component patterns.

- This skill owns project shape: `/src/index.tsx` (default export), `/package.json`, multi-file fences, no lockfile, no self-mounting.
- Other skills own product-specific design and behavior — follow them when they conflict with generic styling advice here.
- In the planning phase, list every other skill key that applies in `<skills>` (in addition to `make-react-tailwind`).

## Required output

Emit one or more fenced files. Put the path in the fence info line:

````
```/src/index.tsx
...
```

```/package.json
...
```
````

Add more files under `/src/**` as needed (`/src/App.tsx`, `/src/components/…`, hooks, etc.). The tree is not fixed.

## Must include

1. **`/src/index.tsx`** — playground entry. **Default-export** the root React component.

   ```tsx
   export default function App() {
     return <div className="p-4">…</div>
   }
   ```

   Or re-export from another module:

   ```tsx
   export { default } from './App'
   ```

   **Do not** mount the app yourself — no React DOM bootstrap, no `#root` lookup.
   The host already mounts the default export from `/src/index.tsx`.

2. **`/package.json`** — at least:

```json
{
  "name": "open-pencil-make",
  "version": "1.0.0",
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

Add other dependencies only when the UI needs them (keep versions explicit).

## Optional

- Split UI into `/src/App.tsx` and other `/src/**` modules; keep `/src/index.tsx` as the default-export entry.
- Use Tailwind utility classes for layout/color/type.

## Never output

- **`package-lock.json`** — the fe-esbuild-package build server generates it.
- Mounting / bootstrap code (React DOM root APIs, Tailwind CDN `<script>` injection, etc.).
- Prose outside fences, or `<thinking>` / `<plan>` / `<steps>` in the generate phase.

## Style

- React function components, TypeScript/TSX.
- Tailwind utilities for layout/color/type; avoid heavy custom CSS unless necessary.
- Prefer small components under `/src/components` when the UI is non-trivial.
- A single fence with no path is treated as `/src/App.tsx` — when the project is empty, still emit `/src/index.tsx` (default export) and `/package.json` in the same reply.
