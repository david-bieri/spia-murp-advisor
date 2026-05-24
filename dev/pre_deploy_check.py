"""
pre_deploy_check.py
-------------------
Static pre-deployment checks for the Jane MURP advising bot.
Run from the repo root before every git push.

Usage:
    python dev/pre_deploy_check.py
    python dev/pre_deploy_check.py --fix   # auto-fix safe issues (case renames)
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC  = ROOT / "src"

PASS  = "\033[92m✓\033[0m"
FAIL  = "\033[91m✗\033[0m"
WARN  = "\033[93m⚠\033[0m"
BOLD  = "\033[1m"
RESET = "\033[0m"

errors   = []
warnings = []


def check(name: str, passed: bool, detail: str = "", warn: bool = False):
    if passed:
        print(f"  {PASS} {name}")
    elif warn:
        print(f"  {WARN} {name}{': ' + detail if detail else ''}")
        warnings.append(f"{name}: {detail}")
    else:
        print(f"  {FAIL} {name}{': ' + detail if detail else ''}")
        errors.append(f"{name}: {detail}")


# ---------------------------------------------------------------------------
# 1.1 TypeScript build
# ---------------------------------------------------------------------------
def check_typescript():
    print(f"\n{BOLD}1.1 TypeScript build{RESET}")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        shell=(sys.platform == "win32"),
    )
    passed = result.returncode == 0
    if passed:
        check("npm run build", True)
    else:
        # Extract first error line for summary
        lines = (result.stdout + result.stderr).splitlines()
        error_lines = [l for l in lines if "error" in l.lower() or "Error" in l]
        detail = error_lines[0] if error_lines else "see output above"
        check("npm run build", False, detail)
        for line in error_lines[:5]:
            print(f"       {line.strip()}")


# ---------------------------------------------------------------------------
# 1.2 Case-sensitive filenames
# ---------------------------------------------------------------------------
def check_case_sensitivity():
    print(f"\n{BOLD}1.2 Case-sensitive filenames{RESET}")

    components = list((SRC / "components").glob("*.tsx")) if (SRC / "components").exists() else []
    for f in components:
        ok = f.stem[0].isupper()
        check(f"components/{f.name}", ok,
              "must start with uppercase for Linux builds")

    lib_files = list((SRC / "lib").glob("*.ts")) if (SRC / "lib").exists() else []
    for f in lib_files:
        ok = f.stem[0].islower()
        check(f"lib/{f.name}", ok, "must start with lowercase")

    content_files = list((SRC / "content").glob("*.md")) if (SRC / "content").exists() else []
    bad_case = [f for f in content_files if f.stem[0].isupper()]
    if bad_case:
        for f in bad_case:
            check(f"content/{f.name}", False, "content files must be lowercase")
    else:
        check("content/ filenames all lowercase", True)


# ---------------------------------------------------------------------------
# 1.3 Dependency completeness
# ---------------------------------------------------------------------------
def check_dependencies():
    print(f"\n{BOLD}1.3 Dependencies{RESET}")
    pkg_path = ROOT / "package.json"
    if not pkg_path.exists():
        check("package.json exists", False)
        return

    with open(pkg_path) as f:
        pkg = json.load(f)

    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

    required = {
        "react-markdown": "needed by Message.tsx",
        "@anthropic-ai/sdk": "needed by route.ts",
        "next": "framework",
        "react": "framework",
    }

    for dep, reason in required.items():
        check(dep, dep in deps, f"missing — {reason}")


# ---------------------------------------------------------------------------
# 1.4 Environment variable references
# ---------------------------------------------------------------------------
def check_env_vars():
    print(f"\n{BOLD}1.4 Environment variables{RESET}")
    ts_files = list(SRC.rglob("*.ts")) + list(SRC.rglob("*.tsx"))
    env_refs = set()
    for f in ts_files:
        content = f.read_text(encoding="utf-8", errors="ignore")
        env_refs.update(re.findall(r'process\.env\.([A-Z_]+)', content))

    for ref in sorted(env_refs):
        # Can only check if set locally — flag as warning if not
        val = os.environ.get(ref)
        check(f"process.env.{ref}", val is not None,
              "not set in current shell (verify in Vercel dashboard)",
              warn=True)


# ---------------------------------------------------------------------------
# 1.5 Content directory integrity
# ---------------------------------------------------------------------------
def check_content():
    print(f"\n{BOLD}1.5 Content directory{RESET}")
    content_dir = SRC / "content"

    if not content_dir.exists():
        check("src/content/ exists", False)
        return

    md_files = list(content_dir.glob("*.md"))
    check(f"file count ({len(md_files)} files)",
          len(md_files) >= 20,
          f"only {len(md_files)} files — KB may not be committed",
          warn=(len(md_files) < 80))

    empty = [f for f in md_files if f.stat().st_size == 0]
    check("no zero-byte files", not empty,
          f"empty: {[f.name for f in empty]}")

    doc_patterns = re.compile(
        r'renaming|changes|instructions|checklist|protocol|jane_|_changes', re.I)
    bad_docs = [f for f in md_files if doc_patterns.search(f.name)]
    check("no documentation files in content/", not bad_docs,
          f"found: {[f.name for f in bad_docs]}")

    placeholder_re = re.compile(r'\{[A-Z][A-Z_]+\}')
    placeholder_files = []
    for f in md_files:
        content = f.read_text(encoding="utf-8", errors="ignore")
        if placeholder_re.search(content):
            placeholder_files.append(f.name)
    check("no unfilled placeholders", not placeholder_files,
          f"check: {placeholder_files[:5]}")


# ---------------------------------------------------------------------------
# 1.6 Topic type consistency
# ---------------------------------------------------------------------------
def check_topic_type():
    print(f"\n{BOLD}1.6 Topic type consistency{RESET}")

    sidebar = SRC / "components" / "Sidebar.tsx"
    if not sidebar.exists():
        check("Sidebar.tsx exists", False)
        return

    content = sidebar.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r'export type Topic = ([^;]+);', content)
    if not m:
        check("Topic type found in Sidebar.tsx", False)
        return

    type_values = set(re.findall(r'"([^"]+)"', m.group(1)))
    check(f"Topic type defined: {sorted(type_values)}", True)

    # Check all other files for string literals that look like topic values
    files_to_check = [
        SRC / "components" / "ChatWindow.tsx",
        SRC / "lib" / "knowledge.ts",
        SRC / "app" / "page.tsx",
    ]

    old_topics = {"uap5174", "program_overview"}  # known removed values
    for f in files_to_check:
        if not f.exists():
            continue
        file_content = f.read_text(encoding="utf-8", errors="ignore")
        for old in old_topics:
            if f'"{old}"' in file_content or f"'{old}'" in file_content:
                check(f"{f.name} — no stale topic '{old}'", False,
                      f"'{old}' found but removed from type")


# ---------------------------------------------------------------------------
# 1.7 Required files exist
# ---------------------------------------------------------------------------
def check_required_files():
    print(f"\n{BOLD}1.7 Required files{RESET}")

    required = [
        "src/lib/knowledge.ts",
        "src/lib/system-prompt.ts",
        "src/lib/opening-message.ts",
        "src/app/api/chat/route.ts",
        "src/app/page.tsx",
        "src/components/StarterPrompts.tsx",
        "src/components/Message.tsx",
        "src/components/ChatWindow.tsx",
        "src/components/Sidebar.tsx",
    ]

    for path in required:
        full = ROOT / path
        check(path, full.exists())

    # knowledge.ts should NOT have hardcoded FILES array
    kt = ROOT / "src/lib/knowledge.ts"
    if kt.exists():
        content = kt.read_text(encoding="utf-8", errors="ignore")
        has_dynamic = "readdir" in content
        has_hardcoded = re.search(r'const FILES\s*=\s*\[', content)
        check("knowledge.ts uses readdir (not hardcoded FILES)",
              has_dynamic and not has_hardcoded,
              "hardcoded FILES array found — dynamic loading not active")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"\n{BOLD}Jane — Pre-deployment checks{RESET}")
    print(f"Repo root: {ROOT}\n")

    check_typescript()
    check_case_sensitivity()
    check_dependencies()
    check_env_vars()
    check_content()
    check_topic_type()
    check_required_files()

    print(f"\n{'='*50}")
    if errors:
        print(f"\n{BOLD}ERRORS ({len(errors)}) — fix before pushing:{RESET}")
        for e in errors:
            print(f"  {FAIL} {e}")
    if warnings:
        print(f"\n{BOLD}WARNINGS ({len(warnings)}) — verify before sharing:{RESET}")
        for w in warnings:
            print(f"  {WARN} {w}")
    if not errors and not warnings:
        print(f"\n  {PASS}{BOLD} All checks passed — safe to push.{RESET}")
    elif not errors:
        print(f"\n  {WARN}{BOLD} Warnings only — review before colleague share.{RESET}")
    else:
        print(f"\n  {FAIL}{BOLD} Fix errors before pushing.{RESET}")
        sys.exit(1)


if __name__ == "__main__":
    main()
