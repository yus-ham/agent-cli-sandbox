#!/usr/bin/env bun
import { spawn, which } from "bun";
import { join, dirname, basename, resolve } from "path";
import { existsSync, promises as fs } from "fs";
import { randomUUID } from "crypto";

async function main() {
    const args = Bun.argv.slice(2);

    if (args.length < 3 || args.includes("-h") || args.includes("--help")) {
        console.log("Usage: lnwd <duration> <source> <destination> [--pm2-name name] [--pm2-keep] [--hash]");
        console.log("Example: lnwd 30m ./my-folder ./link-name --hash");
        process.exit(1);
    }

    const duration = args[0];
    const source = resolve(args[1]);
    let destination = resolve(args[2]);

    // Parse optional flags
    const pm2NameIdx = args.indexOf("--pm2-name");
    const pm2Name = pm2NameIdx !== -1 ? args[pm2NameIdx + 1] : null;
    const pm2Keep = args.includes("--pm2-keep");
    const useHash = args.includes("--hash");

    if (useHash) {
        const hash = randomUUID().split("-")[0]; 
        const dir = dirname(destination);
        const name = basename(destination);
        destination = join(dir, `${hash}-${name}`);
    }


    // 1. Create the symlink
    console.log(`Creating link: ${destination} -> ${source}`);
    
    let lnCmd: string[];
    const isDir = existsSync(source) && (await fs.stat(source)).isDirectory();

    if (process.platform === "win32") {
        // Use Junction (/j) for directories on Windows as it often doesn't require admin
        const type = isDir ? "/j" : "";
        lnCmd = ["cmd.exe", "/c", `mklink ${type} "${destination}" "${source}"`];
    } else {
        lnCmd = ["ln", "-s", source, destination];
    }

    const lnProc = spawn(lnCmd, { stdout: "inherit", stderr: "inherit" });
    await lnProc.exited;

    if (lnProc.exitCode !== 0) {
        console.error("Failed to create symbolic link.");
        process.exit(1);
    }

    // 2. Schedule removal via 'at' tool
    const atToolPath = join(dirname(import.meta.path), "..", "at", "at.ts");
    
    // Command to remove the link
    // On Windows: 'rmdir' for junctions/dir-links, 'del' for file links
    const finalRmCmd = process.platform === "win32" ? 
        (isDir ? `cmd.exe /c rmdir "${destination}"` : `cmd.exe /c del "${destination}"`) : 
        `rm "${destination}"`;

    const atArgs = ["run", atToolPath, `now + ${duration}`];
    if (pm2Name) {
        atArgs.push("--pm2-name", pm2Name);
    }
    if (pm2Keep) {
        atArgs.push("--pm2-keep");
    }

    console.log(`Scheduling removal in ${duration}...`);
    const atProc = spawn(["bun", ...atArgs], {
        stdin: Buffer.from(finalRmCmd),
        stdout: "inherit",
        stderr: "inherit"
    });

    await atProc.exited;
}

main().catch(console.error);
