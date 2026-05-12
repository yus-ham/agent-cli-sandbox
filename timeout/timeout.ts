import { spawn } from "bun";

const rawArgs = Bun.argv.slice(2);

if (rawArgs.length < 2) {
  process.exit(1);
}

const durationStr = rawArgs[0];
let commandArgs = rawArgs.slice(1);

function parseToMs(s: string): number {
  const value = parseFloat(s);
  if (s.endsWith('m')) return value * 60000;
  if (s.endsWith('h')) return value * 3600000;
  return value * 1000;
}

const timeoutMs = parseToMs(durationStr);

try {
  const proc = spawn(commandArgs, {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const timer = setTimeout(() => {
    console.error("\nprocess exited: timeout");
    proc.kill();
    process.exit(124);
  }, timeoutMs);

  const exitCode = await proc.exited;
  clearTimeout(timer);
  process.exit(exitCode);

} catch (err) {
  console.error(`Error: ${err}`);
  process.exit(1);
}