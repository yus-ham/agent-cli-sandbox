import { readFileSync } from 'fs';

const rawArgs = Bun.argv.slice(2);

if (rawArgs.length === 0 || rawArgs.includes("-h")) {
  console.log("Usage: tail [-n lines] [file]");
  process.exit(0);
}

let lines = 10;
let filePath = "";

// Simple argument parsing
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === "-n" && i + 1 < rawArgs.length) {
    lines = parseInt(rawArgs[i + 1]);
    i++;
  } else {
    filePath = rawArgs[i];
  }
}

if (!filePath) {
  console.error("Error: File path is required.");
  process.exit(1);
}

try {
  const content = readFileSync(filePath, 'utf-8');
  const allLines = content.split(/\r?\n/);
  const result = allLines.slice(-lines);
  console.log(result.join('\n'));
} catch (e) {
  console.error(`Error reading file: ${e}`);
  process.exit(1);
}
