#!/usr/bin/env bun
import { Bun } from "bun";
import { createReadStream, createWriteStream } from "fs";
import { createInterface } from "readline";

async function main() {
    const args = Bun.argv.slice(2);
    
    let expression = "";
    let file = "";
    let inplace = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "-i") {
            inplace = true;
        } else if (args[i].startsWith("'s/")) {
            expression = args[i];
        } else {
            file = args[i];
        }
    }

    if (!expression || !file) {
        console.error("Usage: sed -i 's/pattern/replacement/g' <file>");
        process.exit(1);
    }

    const match = expression.match(/^'s\/(.*)\/(.*)\/g'$/);
    if (!match) {
        console.error("Invalid expression format. Use 's/pattern/replacement/g'");
        process.exit(1);
    }

    const pattern = new RegExp(match[1], 'g');
    const replacement = match[2];

    const tempFile = `${file}.tmp`;
    const rl = createInterface({
        input: createReadStream(file),
        crlfDelay: Infinity
    });

    const writeStream = createWriteStream(tempFile);
    let modified = false;

    for await (const line of rl) {
        const newLine = line.replace(pattern, replacement);
        if (newLine !== line) modified = true;
        writeStream.write(newLine + "\n");
    }

    writeStream.end();

    if (inplace) {
        if (modified) {
            console.info(`[sed] Modifying file: ${file}`);
            await Bun.file(tempFile).arrayBuffer().then(b => Bun.write(file, b));
            await Bun.file(tempFile).delete();
        } else {
            console.info(`[sed] No matches in: ${file}`);
            await Bun.file(tempFile).delete();
        }
    } else {
        // Jika tidak -i, print temp file lalu hapus
        const output = await Bun.file(tempFile).text();
        process.stdout.write(output);
        await Bun.file(tempFile).delete();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
