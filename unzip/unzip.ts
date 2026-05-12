#!/usr/bin/env bun
import { Bun } from "bun";
import { resolve } from "path";
import { spawn } from "bun";

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1 || args.includes("-h") || args.includes("--help")) {
        console.log("Usage: unzip <file> [destination]");
        console.log("Supported: .zip, .tar, .tar.gz");
        process.exit(1);
    }

    const archivePath = resolve(args[0]);
    const destination = args[1] ? resolve(args[1]) : resolve(".");
    const ext = archivePath.toLowerCase();

    try {
        if (ext.endsWith('.zip')) {
            console.info(`Using native tar to extract ${archivePath}...`);
            // Windows tar supports zip natively
            const proc = spawn(["tar", "-xf", archivePath, "-C", destination], {
                stdout: "inherit",
                stderr: "inherit"
            });
            await proc.exited;
        } else if (ext.endsWith('.tar') || ext.endsWith('.tar.gz') || ext.endsWith('.tgz')) {
            console.info(`Using Bun.Archive to extract ${archivePath}...`);
            const fileData = await Bun.file(archivePath).bytes();
            const archive = new Bun.Archive(fileData);
            const count = await archive.extract(destination);
            console.info(`Successfully extracted ${count} entries.`);
        } else {
            console.error("Unsupported file format. Use .zip, .tar, or .tar.gz");
            process.exit(1);
        }
    } catch (err: any) {
        console.error(`Error extracting archive: ${err.message}`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
