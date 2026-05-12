import { existsSync, readFileSync } from "node:fs";

const rawArgs = Bun.argv.slice(2);

const showLineNumbers = rawArgs.includes("-n");
const files = rawArgs.filter(arg => arg !== "-n" && !arg.startsWith("-"));

let exitCode = 0;
let lineNumber = 1;

async function printFile(path: string | null) {
  try {
    if (path !== null && !existsSync(path)) {
      console.error(`cat: ${path}: No such file or directory`);
      exitCode = 1;
      return;
    }

    let content: string;
    if (path === null) {
      // Read from stdin
      content = await Bun.stdin.text();
    } else {
      // Bun.file().text() handles BOMs (UTF-8, UTF-16LE, etc.) automatically
      content = await Bun.file(path).text();
    }

    if (!showLineNumbers) {
      process.stdout.write(content);
    } else {
      const splitLines = content.split(/\r?\n/);
      
      // If the content is empty, don't print anything
      if (content === "" && path !== null) return;

      for (let i = 0; i < splitLines.length; i++) {
        const line = splitLines[i];
        // Don't print a numbered line for the very last empty split if the file ends with a newline
        if (i === splitLines.length - 1 && line === "" && content.endsWith("\n")) {
          break;
        }
        process.stdout.write(`${lineNumber.toString().padStart(6, " ")}  ${line}\n`);
        lineNumber++;
      }
    }
  } catch (e) {
    console.error(`cat: ${path || "stdin"}: ${(e as Error).message}`);
    exitCode = 1;
  }
}

if (files.length > 0) {
  for (const file of files) {
    await printFile(file);
  }
} else {
  await printFile(null);
}

process.exit(exitCode);
