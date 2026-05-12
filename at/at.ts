#!/usr/bin/env bun
import { spawn, which } from "bun";

async function main() {
    const args = Bun.argv.slice(2);

    // internal execute mode
    if (args[0] === "--exec") {
        const delay = parseInt(args[1]);
        const command = args[2];
        const outputFile = args[3] !== "null" ? args[3] : null;
        const pm2Name = args[4] !== "null" ? args[4] : null;
        const pm2Keep = args[5] === "true";
        
        if (delay > 0) {
            await new Promise(r => setTimeout(r, delay));
        }

        // Execute the command in a shell
        const shell = process.platform === "win32" ? "cmd.exe" : "sh";
        const shellArgs = process.platform === "win32" ? ["/c", command] : ["-c", command];

        const spawnOptions: any = {
            stdout: "inherit",
            stderr: "inherit",
        };

        if (outputFile) {
            const out = Bun.file(outputFile);
            spawnOptions.stdout = out;
            spawnOptions.stderr = out;
        }

        const proc = spawn([shell, ...shellArgs], spawnOptions);
        await proc.exited;

        // PM2 Cleanup
        if (pm2Name && !pm2Keep) {
            const pm2Path = which("pm2");
            if (pm2Path) {
                // We use spawn but don't await much because we're about to exit anyway
                spawn([pm2Path, "delete", pm2Name], { detached: true }).unref();
            }
        }
        
        process.exit(0);
        return;
    }

    if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
        console.log("Usage: at <time> [-f input_file] [-o output_file] [--pm2-name name] [--pm2-keep]");
        console.log("Example: echo \"ls\" | at 10:30 --pm2-name my-job");
        console.log("         at now + 1m --pm2-name test --pm2-keep");
        process.exit(1);
    }

    let timeStr = "";
    let inputFile: string | null = null;
    let outputFile: string | null = null;
    let pm2Name: string | null = null;
    let pm2Keep = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "-f" && args[i + 1]) {
            inputFile = args[++i];
        } else if (args[i] === "-o" && args[i + 1]) {
            outputFile = args[++i];
        } else if (args[i] === "--pm2-name" && args[i + 1]) {
            pm2Name = args[++i];
        } else if (args[i] === "--pm2-keep") {
            pm2Keep = true;
        } else {
            timeStr += (timeStr ? " " : "") + args[i];
        }
    }

    let targetDate = parseTime(timeStr);
    if (!targetDate) {
        console.error("Invalid time format.");
        process.exit(1);
    }

    const now = new Date();
    let delay = targetDate.getTime() - now.getTime();

    if (delay < 0) {
        console.error("Target time is in the past.");
        process.exit(1);
    }

    let command = "";
    if (inputFile) {
        command = await Bun.file(inputFile).text();
    } else {
        // Read from stdin
        command = await Bun.stdin.text();
    }

    if (!command.trim()) {
        console.error("No command provided.");
        process.exit(1);
    }

    const execArgs = [
        "run", import.meta.path, "--exec", 
        delay.toString(), 
        command, 
        outputFile || "null", 
        pm2Name || "null", 
        pm2Keep.toString()
    ];

    if (pm2Name) {
        const pm2Path = which("pm2");
        if (!pm2Path) {
            console.error("PM2 not found in PATH.");
            process.exit(1);
        }

        console.log(`Manage job via PM2: ${pm2Name}`);
        
        const nullFile = process.platform === "win32" ? "NUL" : "/dev/null";
        const outLog = outputFile || nullFile;
        const errLog = outputFile || nullFile;

        // Add --no-autorestart so it doesn't loop
        const proc = spawn([
            pm2Path, "start", "bun", 
            "--name", pm2Name, 
            "--no-autorestart", 
            "--output", outLog,
            "--error", errLog,
            "--", ...execArgs
        ], {
            stdout: "ignore",
            stderr: "inherit",
        });
        await proc.exited;
    } else {
        // Spawn detached process to wait and execute
        const proc = spawn(["bun", ...execArgs], {
            detached: true,
            stdout: "ignore",
            stderr: "ignore",
            stdin: "ignore",
        });

        proc.unref();
        console.log(`job ${proc.pid} at ${targetDate.toLocaleString()}${outputFile ? ` -> ${outputFile}` : ""}`);
    }
}

function parseTime(str: string): Date | null {
    str = str.toLowerCase().trim();
    const now = new Date();

    // now + N seconds/minutes/hours/days (English & Indonesian & Short)
    const relativeMatch = str.match(/^now\s*\+\s*(\d+)\s*(s|second|detik|m|minute|menit|h|hour|jam|d|day|hari)s?$/);
    if (relativeMatch) {
        const amount = parseInt(relativeMatch[1]);
        const unit = relativeMatch[2];
        const date = new Date(now);
        if (unit === "second" || unit === "detik" || unit === "s") date.setSeconds(date.getSeconds() + amount);
        else if (unit === "minute" || unit === "menit" || unit === "m") date.setMinutes(date.getMinutes() + amount);
        else if (unit === "hour" || unit === "jam" || unit === "h") date.setHours(date.getHours() + amount);
        else if (unit === "day" || unit === "hari" || unit === "d") date.setDate(date.getDate() + amount);
        return date;
    }

    // HH:mm or HH:mm:ss
    const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
        const date = new Date(now);
        date.setHours(hours, minutes, seconds, 0);
        
        // If time has passed today, assume tomorrow
        if (date.getTime() <= now.getTime()) {
            date.setDate(date.getDate() + 1);
        }
        return date;
    }

    // Just "now"
    if (str === "now") {
        return now;
    }

    return null;
}

main().catch(console.error);
