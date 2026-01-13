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

### Replacing the Default `git` Command

To use `safegit` transparently as your default `git` command, you can prepend the directory containing the compiled `safegit` executable to your system's `PATH` environment variable.

The compilation script places the executable at `/home/yusham/.bun/bin/git`. Since the executable is named `git`, your shell will find and use it before the system's default Git if its directory comes first in the `PATH`.

#### For the Current Session

To try it out in your current terminal session, run the following command:

```sh
export PATH="/home/yusham/.bun/bin:$PATH"
```

After running this, any `git` command you type will automatically be processed by `safegit`.

#### Making it Permanent

To make this change permanent, add the `export` line to your shell's startup file (e.g., `~/.bashrc`, `~/.zshrc`, or `~/.profile`).

1.  Open your shell's configuration file:
    ```sh
    # For Bash users
    nano ~/.bashrc

    # For Zsh users
    nano ~/.zshrc
    ```

2.  Add the following line to the end of the file:
    ```sh
    export PATH="/home/yusham/.bun/bin:$PATH"
    ```

3.  Save the file and restart your shell, or run `source ~/.bashrc` (or `source ~/.zshrc`) to apply the changes.

## How It Works

`safegit` intercepts `git` commands by replacing the original `git` executable. The setup assumes the following mechanism:

1.  **Renaming the original `git`**: The system's original `git` executable (e.g., at `/usr/bin/git`) is renamed to `sudogit`.
2.  **Installing `safegit`**: The compiled `safegit` executable is placed where the original `git` was, effectively taking its place.
3.  **Execution Flow**: When you run a `git` command, you are actually invoking `safegit`. It processes the command, applies the security policies, and then executes the original `git` (now called `sudogit`) with the validated or modified arguments.

```
User's `git` command -> `safegit` executable -> `sudogit` (the original `git`)
```

This setup allows `safegit` to act as a transparent security guard without altering user workflows.

## Command Policies

`safegit` enforces the following rules on `git` commands:

### Disallowed Commands

The following commands are completely blocked and will result in an error:

*   `git branch -d` / `git branch -D`
*   `git clean -fd`

*   `git restore`
*   `git rebase`
*   `git push --force`
*   `git push --force-with-lease`
*   `git filter-repo`
*   `git filter-branch`
*   `git checkout -f <branch>` / `git checkout --force <branch>`
*   `git checkout <file>` / `git checkout -- <file>` (without the `-f` flag, when the file exists)

### Modified Commands

*   **`git commit`**: Always executed with the `--no-edit` flag.
*   **`git pull`**: Always executed with the `--no-edit` flag.
*   **`git merge`**: Always executed with the `--no-edit` flag.
*   **`git cherry-pick`**: Always executed with the `--no-edit` flag.
*   **`git reset`**: 
    *   Only `git reset --hard` without a force flag (`-f` or `--force`) and `git reset --mixed` without a force flag (`-f` or `--force`) are blocked.
    *   If no reset mode (like `--hard`, `--mixed`, or `--soft`) is provided, `safegit` will force the use of `--soft` and display a warning message.
*   **`git checkout <file>`**: This command is disabled by default to prevent accidental file reverts. To execute it, you must use the `-f` flag: `safegit checkout -f <file>`.

### Allowed Commands

All other `git` commands not listed above are allowed and will be passed through without modification.