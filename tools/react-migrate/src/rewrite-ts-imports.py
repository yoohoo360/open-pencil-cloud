#!/usr/bin/env python3
"""Rewrite Vue/VueUse imports in packages/react TypeScript sources toward React."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().owners[0] if False else Path("/workspace/packages/react/src")

VUE_VALUE_IMPORTS = {
    "ref",
    "shallowRef",
    "computed",
    "toValue",
    "unref",
    "isRef",
}

VUE_LIFECYCLE = {
    "onScopeDispose",
    "onMounted",
    "onBeforeUnmount",
    "onUnmounted",
    "watch",
    "watchEffect",
    "nextTick",
}

SKIP_FILES = {
    "internal/reactive.ts",
    "internal/create-context.tsx",
    "internal/scene-computed/use.ts",
    "editor/context/index.tsx",
    "editor/store/use.ts",
    "editor/events/use.ts",
    "i18n/useI18n.ts",
    "shared/dom/use-event-listener.ts",
}


def split_imports(names: str) -> list[str]:
    parts = []
    for raw in names.split(","):
        item = raw.strip()
        if not item:
            continue
        parts.append(item)
    return parts


def rewrite_file(path: Path) -> bool:
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    if rel in SKIP_FILES:
        return False
    if path.suffix not in {".ts", ".tsx"}:
        return False

    text = path.read_text()
    original = text

    # nanostores
    text = text.replace("from '@nanostores/vue'", "from '@nanostores/react'")
    text = text.replace('from "@nanostores/vue"', 'from "@nanostores/react"')

    # vue-table -> react-table
    text = text.replace("from '@tanstack/vue-table'", "from '@tanstack/react-table'")
    text = text.replace('from "@tanstack/vue-table"', 'from "@tanstack/react-table"')

    # VueUse event listener -> local helper
    text = text.replace(
        "import { useEventListener } from '@vueuse/core'",
        "import { useEventListener } from '#react/shared/dom/use-event-listener'",
    )
    text = text.replace(
        'import { useEventListener } from "@vueuse/core"',
        "import { useEventListener } from '#react/shared/dom/use-event-listener'",
    )

    # Type-only Ref from vue -> ReactiveRef / React RefObject
    text = re.sub(
        r"import\s+type\s+\{\s*Ref\s*\}\s+from\s+['\"]vue['\"]\s*",
        "import type { ReactiveRef as Ref } from '#react/internal/reactive'\n",
        text,
    )
    text = re.sub(
        r"import\s+type\s+\{\s*ComputedRef\s*\}\s+from\s+['\"]vue['\"]\s*",
        "import type { ReactiveRef as ComputedRef } from '#react/internal/reactive'\n",
        text,
    )
    text = re.sub(
        r"import\s+type\s+\{\s*InjectionKey\s*\}\s+from\s+['\"]vue['\"]\s*",
        "",
        text,
    )

    def repl_vue_import(match: re.Match[str]) -> str:
        names = split_imports(match.group(1))
        value_names = []
        type_names = []
        react_names = []
        leftover = []
        for name in names:
            base = name.split(" as ")[0].strip()
            if base in VUE_VALUE_IMPORTS or base in {"ComputedRef", "Ref"}:
                # Keep ComputedRef/Ref as type alias via reactive when used as values? 
                if base in {"ref", "shallowRef", "computed", "toValue"}:
                    value_names.append(name.replace("shallowRef", "shallowRef").replace("ref", "ref"))
                elif "as" in name:
                    type_names.append(name)
                else:
                    type_names.append(name)
            elif base in VUE_LIFECYCLE:
                if base == "onScopeDispose":
                    react_names.append("useEffect")
                elif base in {"onMounted", "onBeforeUnmount", "onUnmounted"}:
                    react_names.append("useEffect")
                elif base in {"watch", "watchEffect"}:
                    react_names.append("useEffect")
                elif base == "nextTick":
                    leftover.append(name)
                else:
                    leftover.append(name)
            elif base in {"provide", "inject"}:
                leftover.append(name)
            else:
                leftover.append(name)

        chunks: list[str] = []
        if value_names:
            # dedupe
            seen = []
            for n in value_names:
                if n not in seen:
                    seen.append(n)
            chunks.append(
                "import { " + ", ".join(seen) + " } from '#react/internal/reactive'"
            )
        if type_names:
            mapped = []
            for n in type_names:
                if n == "Ref" or n.endswith(" as Ref"):
                    mapped.append("ReactiveRef as Ref" if n == "Ref" else n.replace("Ref", "ReactiveRef"))
                elif n == "ComputedRef":
                    mapped.append("ReactiveRef as ComputedRef")
                else:
                    mapped.append(n)
            chunks.append(
                "import type { " + ", ".join(mapped) + " } from '#react/internal/reactive'"
            )
        if react_names:
            seen = []
            for n in react_names:
                if n not in seen:
                    seen.append(n)
            chunks.append("import { " + ", ".join(seen) + " } from 'react'")
        if leftover:
            chunks.append("import { " + ", ".join(leftover) + " } from 'vue' /* TODO: migrate */")
        return "\n".join(chunks) + ("\n" if chunks else "")

    text = re.sub(
        r"import\s+\{\s*([^}]+)\s*\}\s+from\s+['\"]vue['\"]\s*",
        repl_vue_import,
        text,
    )

    # onScopeDispose(fn) -> useEffect(() => fn, [])  is wrong shape; mark for manual
    # Common pattern: const stop = ...; onScopeDispose(stop)
    # Replace onScopeDispose(x) with useEffect(() => x, []) when x is a function ref
    text = re.sub(
        r"\bonScopeDispose\(([^)]+)\)",
        r"useEffect(() => () => { const __dispose = \1; if (typeof __dispose === 'function') __dispose() }, [])",
        text,
    )

    # shallowReactive -> plain object identity (app session will handle)
    text = text.replace("shallowReactive", "/* shallowReactive */ Object.assign")

    if text != original:
        path.write_text(text)
        return True
    return False


def main() -> None:
    changed = 0
    for path in sorted(ROOT.rglob("*")):
        if path.is_file() and path.suffix in {".ts", ".tsx"}:
            if rewrite_file(path):
                changed += 1
                print("rewrote", path.relative_to(ROOT))
    print(f"done: {changed} files")


if __name__ == "__main__":
    main()
