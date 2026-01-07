# safegit

`safegit` is a wrapper for the `git` command designed to provide a layer of security. It prevents the execution of potentially destructive `git` commands and enforces policies for safer usage, especially in automated environments.

## How to Use

### Compilation

This project uses `bun`. To compile `safegit`, use the script provided in `package.json`:

```sh
bun run compile:safegit
```

This command will compile `src/safegit.ts` and place the executable at `/home/yusham/.bun/bin/git`.

### Execution

Once compiled, `safegit` can be called as a replacement for `git`. It will intercept the command, apply policies, and then pass it on to the actual `git` executable.

```sh
safegit status
safegit add .
safegit commit -m "My safe commit"
```

## Command Policies

`safegit` enforces the following rules on `git` commands:

### Disallowed Commands

The following commands are completely blocked and will result in an error:

*   `git branch -d` / `git branch -D`
*   `git clean -fd`
*   `git reset`
*   `git restore`
*   `git rebase`
*   `git push --force`
*   `git push --force-with-lease`
*   `git filter-repo`
*   `git filter-branch`
*   `git checkout -f <branch>` / `git checkout --force <branch>`
*   `git checkout -- <file>` (without the `-f` flag)

### Modified Commands

*   **`git commit`**: Always executed with the `--no-edit` flag.
*   **`git pull`**: Always executed with the `--no-edit` flag.
*   **`git merge`**: Always executed with the `--no-edit` flag.
*   **`git cherry-pick`**: Always executed with the `--no-edit` flag.
*   **`git checkout -- <file>`**: This command is disabled by default. To execute it, you must use the `-f` flag: `safegit checkout -f -- <file>`.

### Allowed Commands

All other `git` commands not listed above are allowed and will be passed through without modification.