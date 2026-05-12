import { $ } from "bun";

const rawArgs = Bun.argv.slice(2);

if (rawArgs.length === 0 || rawArgs.includes("-h")) {
  console.log("Usage: grep [options] pattern [file...]");
  process.exit(0);
}

const flags = rawArgs.filter(a => a.startsWith("-"));
const nonFlags = rawArgs.filter(a => !a.startsWith("-"));
const pattern = nonFlags[0] || "";
const files = nonFlags.slice(1);

const isIgnoreCase = flags.some(f => f.includes("i"));
const isInvert = flags.some(f => f.includes("v"));
const isRecursive = flags.some(f => f.includes("r") || f.includes("R"));
const showLineNumber = flags.some(f => f.includes("n"));

let slsParams = `-Pattern '${pattern.replace(/'/g, "''")}'`;
if (isIgnoreCase) slsParams += " -CaseSensitive:$false";
if (isInvert) slsParams += " -NotMatch";

let formatStr = "";
if (isRecursive || files.length > 1) formatStr += "$($_.Path):";
if (showLineNumber) formatStr += "$($_.LineNumber):";
formatStr += "$($_.Line)";

const forEachPipe = `| ForEach-Object { "${formatStr}" }`;

try {
  if (files.length > 0) {
    const fileList = files.map(f => `'${f}'`).join(',');
    let inputCmd = `Get-ChildItem -Path ${fileList}`;
    if (isRecursive) inputCmd += " -Recurse";
    inputCmd += " -File -ErrorAction SilentlyContinue";
    
    const fullCmd = `${inputCmd} | Select-String ${slsParams} ${forEachPipe}`;
    await $`powershell -NoProfile -Command "${fullCmd}"`;
  } else {
    // Gunakan operator < untuk mengalirkan Bun.stdin ke PowerShell
    const fullCmd = `$input | Select-String ${slsParams} ${forEachPipe}`;
    const pwsh = ["powershell", "-NoProfile", "-Command", fullCmd];
    await $`${pwsh} < ${Bun.stdin}`;
  }
} catch (e) {
  process.exit(1);
}
