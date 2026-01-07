#!/usr/bin/env bun
/**
 * Sweetistics runner wrapper: enforces timeouts, git policy, and trash-safe deletes before dispatching any repo command.
 * When you tweak its behavior, add a short note to AGENTS.md via `./scripts/committer "docs: update AGENTS for runner" "AGENTS.md"` so other agents know the new expectations.
 */


import process from 'node:process';
import { spawn } from 'bun';



const LONG_RUN_REPORT_THRESHOLD_MS = 60 * 1000;
const ENABLE_DEBUG_LOGS = process.env.RUNNER_DEBUG === '1';

const GIT_BIN = '/usr/bin/sudogit';



type RunnerExecutionContext = {
  commandArgs: string[];
  workspaceDir: string;
  targetCwd?: string; // Added to support -C <path>
};

(async () => {
  const { commandArgs, targetCwd } = parseArgs(process.argv.slice(2));

  if (commandArgs.length === 0) {
    printUsage('Missing command to execute.');
    process.exit(1);
  }

  const workspaceDir = process.cwd();
  const context: RunnerExecutionContext = {
    commandArgs,
    workspaceDir,
    targetCwd,
  };



  await runCommand(context);
})().catch((error) => {
  console.error('[runner] Unexpected failure:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});

// Parses the runner CLI args and rejects unsupported flags early.
function parseArgs(argv: string[]): { commandArgs: string[]; targetCwd?: string } {
  const commandArgs: string[] = [];
  let parsingOptions = true;
  let targetCwd: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (!parsingOptions) {
      commandArgs.push(token);
      continue;
    }

    if (token === '--') {
      parsingOptions = false;
      continue;
    }

    if (token === '--help' || token === '-h') {
      printUsage();
      process.exit(0);
    }

    if (token === '--timeout' || token.startsWith('--timeout=')) {
      console.error('[runner] --timeout is no longer supported; rely on the automatic timeouts.');
      process.exit(1);
    }

    // Handle -C or --directory option
    if (token === '-C' || token === '--directory') {
      if (i + 1 < argv.length) {
        targetCwd = argv[i + 1];
        i++; // Skip the next argument as it's the path
      } else {
        console.error('[runner] Option -C or --directory requires a path.');
        process.exit(1);
      }
      continue; // Do not add -C or its path to commandArgs
    }

    if (token.startsWith('-C')) { // Handle -C/path/to/dir
      targetCwd = token.substring(2);
      continue; // Do not add -C/path/to/dir to commandArgs
    }

    // Handle --cwd or --cwd=<path> option
    if (token === '--cwd') {
      if (i + 1 < argv.length) {
        targetCwd = argv[i + 1];
        i++; // Skip the next argument as it's the path
      } else {
        console.error('[runner] Option --cwd requires a path.');
        process.exit(1);
      }
      continue; // Do not add --cwd or its path to commandArgs
    }

    if (token.startsWith('--cwd=')) { // Handle --cwd=/path/to/dir
      targetCwd = token.substring('--cwd='.length);
      continue; // Do not add --cwd=/path/to/dir to commandArgs
    }

    parsingOptions = false;
    commandArgs.push(token);
  }

  return { commandArgs, targetCwd };
}

// Removes wrapper binaries/env assignments so heuristics see the real command.

// Kicks off the requested command with logging, timeouts, and monitoring.
async function runCommand(context: RunnerExecutionContext): Promise<void> {
  const { command, args, env } = buildExecutionParams(context.commandArgs);
  const commandLabel = formatDisplayCommand(context.commandArgs);

  const startTime = Date.now();

  const child = spawn([command, ...args], {
    cwd: context.targetCwd || context.workspaceDir,
    env,
    stdio: ['pipe', 'pipe', 'pipe'], // Capture stdout and stderr
  });

  try {
    const stdout = await new Response(child.stdout).text();
    const stderr = await new Response(child.stderr).text();
    const exitCode = await child.exited;

    if (stdout.length > 0) {
      process.stdout.write(stdout);
    }
    if (stderr.length > 0) {
      process.stderr.write(stderr);
    }
    
    const elapsedMs = Date.now() - startTime;

    if (elapsedMs >= LONG_RUN_REPORT_THRESHOLD_MS) {
      console.error(
        `[runner] Completed in ${formatDuration(elapsedMs)}. For long-running tasks, prefer tmux directly.`
      );
    }

    process.exit(exitCode);
  } catch (error) {
    console.error('[runner] Failed to launch command:', error instanceof Error ? error.message : String(error));
    process.exit(1);
    return;
  }
}

// Prepares the executable, args, and sanitized env for the child process.

function isEnvAssignment(token: string): boolean {
  return token.includes('=') && !token.startsWith('-');
}

function buildExecutionParams(commandArgs: string[]): { command: string; args: string[]; env: NodeJS.ProcessEnv } {

    const env = { ...process.env };
    const processedArgs: string[] = [];
  
    let commandStarted = false;
  
    for (const token of commandArgs) {
      if (!commandStarted && isEnvAssignment(token)) {
        const [key, ...rest] = token.split('=');
        if (key) {
          env[key] = rest.join('=');
        }
        continue;
      }
      commandStarted = true;
      processedArgs.push(token);
    }
  
    // If the first argument is 'git', remove it to normalize the command for subsequent checks.
    // This allows 'safegit git status' to be treated like 'safegit status'.
    if (processedArgs.length > 0 && processedArgs[0] === 'git') {
      processedArgs.shift();
    }
  
    if (processedArgs.length === 0 || !processedArgs[0]) {
      printUsage('Missing command to execute.');
      process.exit(1);
    }
  
    let [subcommand, ...restArgs] = processedArgs; // Renamed 'command' to 'subcommand'
    let finalArgs: string[] = [];

    switch (subcommand) {
      case 'status':
        finalArgs = ['status', ...restArgs];
        break;
      case 'config':
        finalArgs = ['config', ...restArgs];
        break;
      case 'commit': {
        const filteredRestArgs = restArgs.filter(arg => arg !== '--edit');
        finalArgs = ['commit', '--no-edit', ...filteredRestArgs];
        break;
      }
      case 'add':
        finalArgs = ['add', ...restArgs];
        break;
      case 'remote':
        finalArgs = ['remote', ...restArgs];
        break;
      case 'pull': {
        const filteredRestArgs = restArgs.filter(arg => arg !== '--edit');
        finalArgs = ['pull', '--no-edit', ...filteredRestArgs];
        break;
      }
      case 'branch':
        if (restArgs.includes('-d') || restArgs.includes('--delete') || restArgs.includes('-D')) {
          console.error("git branch -d/-D is not allowed.");
          process.exit(1);
        }
        finalArgs = ['branch', ...restArgs];
        break;
      case 'merge': {
        const filteredRestArgs = restArgs.filter(arg => arg !== '--edit');
        finalArgs = ['merge', '--no-edit', ...filteredRestArgs];
        break;
      }
      case 'checkout': {
        const isForce = restArgs.includes('-f') || restArgs.includes('--force');
        const isFileOperation = restArgs.includes('--');

        if (isFileOperation) {
          if (isForce) {
            // Allow 'checkout -f -- <file>', but filter out the force flag
            const filteredArgs = restArgs.filter(arg => arg !== '-f' && arg !== '--force');
            finalArgs = ['checkout', ...filteredArgs];
          } else {
            // Disallow 'checkout -- <file>' without force
            console.error("git checkout -- <file> is not allowed.");
            process.exit(1);
          }
        } else {
          // This is a branch/commit checkout, disallow force
          if (isForce) {
            console.error("git checkout -f/--force to switch branches is not allowed.");
            process.exit(1);
          }
          finalArgs = ['checkout', ...restArgs];
        }
        break;
      }
      case 'clean':
        if (restArgs.includes('-fd')) {
          console.error("git clean -fd is not allowed.");
          process.exit(1);
        }
        finalArgs = ['clean', ...restArgs];
        break;
      case 'reset':
        console.error("git reset is not allowed.");
        process.exit(1);
        break;
      case 'restore':
        console.error("git restore is not allowed.");
        process.exit(1);
        break;
      case 'rebase':
        console.error("git rebase is not allowed.");
        process.exit(1);
        break;
      case 'push':
        if (restArgs.includes('--force') || restArgs.includes('--force-with-lease')) {
          console.error("git push --force or --force-with-lease is not allowed.");
          process.exit(1);
        }
        finalArgs = ['push', ...restArgs];
        break;
      case 'cherry-pick': {
        const filteredRestArgs = restArgs.filter(arg => arg !== '--edit');
        finalArgs = ['cherry-pick', '--no-edit', ...filteredRestArgs];
        break;
      }
      case 'clone':
        finalArgs = ['clone', ...restArgs];
        break;
      case 'init':
        finalArgs = ['init', ...restArgs];
        break;
      case 'filter-repo':
      case 'filter-branch':
        console.error(`git ${subcommand} is not allowed.`);
        process.exit(1);
        break;
      default:
        // Default case: Pass through unrecognized commands directly
        finalArgs = [subcommand, ...restArgs];
        break;
    }

    return { command: GIT_BIN, args: finalArgs, env };
}





// Shows CLI usage plus optional error messaging.
function printUsage(message?: string) {
  if (message) {
    console.error(`[runner] ${message}`);
  }
  console.error('Usage: runner [--] <command...>');

}



// Joins the command args in a shell-friendly way for log display.
function formatDisplayCommand(commandArgs: string[]): string {
  return commandArgs.map((token) => (token.includes(' ') ? `"${token}"` : token)).join(' ');
}

// Tells whether the runner is already executing inside the tmux guard.
function isRunnerTmuxSession(): boolean {
  const value = process.env.RUNNER_TMUX;
  if (value) {
    return value !== '0' && value.toLowerCase() !== 'false';
  }
  return Boolean(process.env.TMUX);
}
