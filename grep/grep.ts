import { Glob } from "bun";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { stat } from "node:fs/promises";
import { join } from "node:path";

const rawArgs = Bun.argv.slice(2);

if (rawArgs.length === 0 || rawArgs.includes("-h")) {
  console.log("Usage: grep [options] pattern [file...]");
  console.log("Options:");
  console.log("  -i              Ignore case");
  console.log("  -v              Invert match");
  console.log("  -r, -R          Recursive");
  console.log("  -n              Show line number");
  console.log("  --include=GLOB  Search only files that match GLOB");
  console.log("  --exclude=GLOB  Skip files that match GLOB");
  process.exit(0);
}

const includes: string[] = [];
const excludes: string[] = [];
const flags: string[] = [];
const positional: string[] = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg.startsWith("--include=")) {
    includes.push(arg.slice(10));
  } else if (arg === "--include") {
    if (i + 1 < rawArgs.length) includes.push(rawArgs[++i]);
  } else if (arg.startsWith("--exclude=")) {
    excludes.push(arg.slice(10));
  } else if (arg === "--exclude") {
    if (i + 1 < rawArgs.length) excludes.push(rawArgs[++i]);
  } else if (arg.startsWith("-")) {
    flags.push(arg);
  } else {
    positional.push(arg);
  }
}

const searchPatternStr = positional[0] || "";
const targets = positional.slice(1);

const isIgnoreCase = flags.some(f => f.includes("i"));
const isInvert = flags.some(f => f.includes("v"));
const isRecursive = flags.some(f => f.includes("r") || f.includes("R"));
const showLineNumber = flags.some(f => f.includes("n"));

const searchRegex = new RegExp(searchPatternStr, isIgnoreCase ? "i" : "");

async function grepFile(filePath: string, showPath: boolean) {
  try {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber++;
      const isMatch = searchRegex.test(line);
      if (isMatch !== isInvert) {
        let output = "";
        if (showPath) output += `${filePath}:`;
        if (showLineNumber) output += `${lineNumber}:`;
        output += line;
        console.log(output);
      }
    }
  } catch (err) {
    // Silently skip files that cannot be read (e.g., binary files, permission denied)
  }
}

async function run() {
  if (targets.length === 0) {
    // Read from stdin
    const rl = createInterface({
      input: Bun.stdin.stream(),
      crlfDelay: Infinity
    });
    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber++;
      const isMatch = searchRegex.test(line);
      if (isMatch !== isInvert) {
        let output = "";
        if (showLineNumber) output += `${lineNumber}:`;
        output += line;
        console.log(output);
      }
    }
    return;
  }

  const filesToSearch: string[] = [];

  for (const target of targets) {
    try {
      const stats = await stat(target);
      if (stats.isFile()) {
        filesToSearch.push(target);
      } else if (stats.isDirectory()) {
        if (!isRecursive) {
          console.error(`grep: ${target}: Is a directory`);
          continue;
        }
        
        // Use Bun.Glob for recursive search
        const globPatterns = includes.length > 0 ? includes : ["**/*"];
        for (const p of globPatterns) {
          // Normalize pattern for Bun.Glob if it's a simple extension
          const pattern = p.includes("/") || p.includes("**") ? p : `**/${p}`;
          const glob = new Glob(pattern);
          
          for await (const file of glob.scan({ cwd: target })) {
            const fullPath = join(target, file);
            
            // Apply excludes
            if (excludes.some(ex => fullPath.includes(ex))) continue;
            
            filesToSearch.push(fullPath);
          }
        }
      }
    } catch (e) {
      console.error(`grep: ${target}: No such file or directory`);
    }
  }

  // Deduplicate files
  const uniqueFiles = Array.from(new Set(filesToSearch));
  const showPath = uniqueFiles.length > 1 || isRecursive;

  for (const file of uniqueFiles) {
    await grepFile(file, showPath);
  }
}

run().catch(() => process.exit(1));
