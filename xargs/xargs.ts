#!/usr/bin/env bun
import { spawn } from "bun";

async function main() {
    const args = Bun.argv.slice(2);
    
    // Read stdin lines
    const input = await Bun.stdin.text();
    const lines = input.split(/\r?\n/).filter(line => line.trim() !== "");

    if (lines.length === 0) process.exit(0);

    // If no command is provided, just print lines (mimics default xargs behavior)
    if (args.length === 0) {
        console.log(lines.join(" "));
        process.exit(0);
    }

    // Command + arguments
    const cmd = args[0];
    const cmdArgs = args.slice(1);

    // Execute command for each line
    for (const line of lines) {
        const fullArgs = [...cmdArgs, line];
        
        console.info(`[xargs] Executing: ${cmd} ${fullArgs.join(" ")}`);
        
        const proc = spawn([cmd, ...fullArgs], {
            stdout: "inherit",
            stderr: "inherit",
        });
        
        await proc.exited;
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
