# WSL + VS Code + Codex — Existing GitHub Repo Workflow

This document describes a canonical workflow for opening an **existing GitHub repository** locally using **WSL**, **VS Code**, and **Codex**, making changes safely, and syncing them back to GitHub.

Scope constraints:
- Use only **WSL**, **VS Code**, the **VS Code integrated terminal**, and **Codex**.
- No GitHub CLI (`gh`) required.
- No external editors or terminals required (you may start WSL from Windows, then work inside VS Code thereafter).

---

## Prerequisites

You must already have:

- WSL installed and configured (e.g., Ubuntu)
- VS Code installed on Windows
- VS Code extensions:
  - **Remote – WSL**
  - **Codex / OpenAI** (whatever your installed integration is named)
- `git` available inside WSL
- Access to the GitHub repo (HTTPS cloning is sufficient)

---

## Step 1 — Start WSL

From Windows:
- Open your WSL distro (e.g., Ubuntu)

You should see a shell prompt similar to:

```bash
username@machine:~$
```

---

## Step 2 — Create or choose a working directory (in WSL)

In WSL:

```bash
cd ~
mkdir -p projects
cd projects
```

Rationale: keep repos inside the Linux filesystem (avoid `/mnt/c` for better permissions and tooling consistency).

---

## Step 3 — Clone the existing GitHub repository (in WSL)

Clone the repository:

```bash
git clone https://github.com/<ORG_OR_USER>/<REPO_NAME>.git
```

Example:

```bash
git clone https://github.com/FraknToastr/Ileostomy-Association.git
```

Then enter the repo:

```bash
cd <REPO_NAME>
```

Example:

```bash
cd Ileostomy-Association
```

---

## Step 4 — Open the repo in VS Code **from WSL**

From inside the repo directory:

```bash
code .
```

This is critical. It ensures VS Code opens the workspace using the **WSL Remote** context so:
- Files are edited in WSL
- Git operations run in WSL
- Codex operates on the same filesystem and environment

---

## Step 5 — Confirm VS Code is running in WSL mode

In VS Code:
- Check the **bottom-left** status bar

It must show something like:

```
WSL: Ubuntu
```

If it does **not**:
1. Close VS Code
2. Re-run `code .` from the repo folder in WSL

---

## Step 6 — Verify Git is working in the VS Code terminal

In VS Code:
- Open the integrated terminal: **Terminal → New Terminal**

Run:

```bash
git status
```

Expected:
- You see the current branch (often `main`)
- You see a clean working tree (if you haven’t changed anything yet)

---

## Step 7 — Confirm Codex is active for this workspace

In VS Code:
1. Open **Extensions**
2. Confirm the Codex/OpenAI integration is **enabled** and not erroring

Then open Codex Chat/Panel and run a non-destructive test prompt, e.g.:

> “List the top-level files in this repository.”

Codex should correctly reference files in this repo.

---

## Step 8 — Create a feature branch (recommended baseline practice)

Before making changes:

```bash
git checkout -b feature/<short-description>
```

Example:

```bash
git checkout -b feature/split-html-css-js
```

Confirm:

```bash
git branch --show-current
```

---

## Step 9 — Delegate changes to Codex (with constraints)

When asking Codex to modify files, include explicit constraints:
- “No functional changes”
- “Do not rename IDs/classes/functions”
- “Do not add dependencies”
- “Do not commit unless I explicitly tell you”

Example prompt:

> Refactor the open HTML file by extracting inline CSS into `styles.css` and inline JS into `app.js`.  
> No functional changes. Do not rename identifiers. Do not add libraries. Do not commit.

---

## Step 10 — Review changes locally

In the VS Code terminal:

```bash
git diff
```

Check:
- CSS moved into `styles.css`
- JS moved into `app.js`
- HTML now links to those files with correct relative paths
- No unintended structural or behavioural changes

---

## Step 11 — Commit the change

Stage files:

```bash
git add .
```

Commit with a clear message:

```bash
git commit -m "Refactor single-file HTML into HTML + CSS + JS"
```

Notes:
- The commit message is just the description for this snapshot of changes.
- It does not change how GitHub Pages works; it is purely for history and traceability.

---

## Step 12 — Push the feature branch to GitHub

```bash
git push origin feature/<branch-name>
```

Example:

```bash
git push origin feature/split-html-css-js
```

At this point:
- Your changes are on GitHub **in the feature branch**
- `main` is unchanged

---

## Step 13 — Get changes into `main` (choose one workflow)

### Option A — Pull Request merge (recommended)

1. In GitHub, open a PR from your feature branch into `main`
2. Merge the PR
3. Optionally delete the feature branch on GitHub (safe after merge)

This creates a clean audit trail and is typically the safest approach.

### Option B — Merge locally and push `main`

Run:

```bash
git checkout main
git pull origin main
git merge feature/<branch-name>
git push origin main
```

---

## Step 14 — Sync your local workspace to the merged `main`

After merge:

```bash
git checkout main
git pull origin main
```

Optionally delete the local feature branch:

```bash
git branch -d feature/<branch-name>
```

---

## Step 15 — Tell Codex the work is complete

Codex will not always “notice” that you merged on GitHub. Tell it plainly, e.g.:

> The PR has been merged into `main`. This task is complete. Treat `main` as the current baseline.

---

## Appendix — Quick “sanity checks” for GitHub Pages dependencies

If another app references a GitHub Pages URL like:

```
https://<user>.github.io/<repo>/<path>/<file>.html
```

Then:
- The URL will not reflect feature branch changes until merged into the branch GitHub Pages serves (commonly `main` or `gh-pages`).
- After merging to the served branch, GitHub Pages rebuilds automatically and the URL updates without changing.

---

## End
