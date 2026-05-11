#!/usr/bin/env bun
import { Bun } from "bun";
import { resolve } from "path";

async function main() {
    const args = Bun.argv.slice(2);

    if (args.length < 1 || args.includes("-h") || args.includes("--help")) {
        console.log("Usage: unzip <file.tar.gz> [destination]");
        console.log("Example: unzip package.tar.gz ./extracted");
        process.exit(1);
    }

    const archivePath = resolve(args[0]);
    const destination = args[1] ? resolve(args[1]) : resolve(".");

    try {
        const fileData = await Bun.file(archivePath).bytes();
        const archive = new Bun.Archive(fileData);
        
        console.info(`Extracting ${archivePath} to ${destination}...`);
        const count = await archive.extract(destination);
        console.info(`Successfully extracted ${count} entries.`);
    } catch (err: any) {
        console.error(`Error extracting archive: ${err.message}`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
