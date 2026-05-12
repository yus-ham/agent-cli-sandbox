import { $ } from "bun";

const args = Bun.argv.slice(2);

try {
  await $`pwsh ${args}`;
} catch (err: any) {
  process.exit(err.exitCode ?? 1);
}
