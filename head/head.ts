import { $ } from "bun";

const rawArgs = Bun.argv.slice(2);

let n = 10;
const nIndex = rawArgs.indexOf("-n");
if (nIndex !== -1 && rawArgs[nIndex + 1]) {
  n = parseInt(rawArgs[nIndex + 1]);
}

const files = rawArgs.filter((arg, i) => {
  if (arg === "-n") return false;
  if (i > 0 && rawArgs[i - 1] === "-n") return false;
  if (arg.startsWith("-")) return false;
  return true;
});

try {
  if (files.length > 0) {
    const fileList = files.map(f => `'${f}'`).join(',');
    await $`powershell -NoProfile -Command "Get-Content -Path ${fileList} -TotalCount ${n}"`;
  } else {
    // Handle stdin by piping it to PowerShell's Select-Object
    const pwshCmd = `$input | Select-Object -First ${n}`;
    await $`powershell -NoProfile -Command "${pwshCmd}" < ${Bun.stdin}`;
  }
} catch (e) {
  process.exit(1);
}
