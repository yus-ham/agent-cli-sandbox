#!/usr/bin/env bun
import { Bun } from "bun";

async function main() {
    const args = Bun.argv.slice(2);
    
    // Simple parsing for: sed -i 's/pattern/replacement/g' file
    // Note: This implementation is simplified for basic search/replace
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

    // Parse 's/pattern/replacement/g'
    const match = expression.match(/^'s\/(.*)\/(.*)\/g'$/);
    if (!match) {
        console.error("Invalid expression format. Use 's/pattern/replacement/g'");
        process.exit(1);
    }

    const pattern = new RegExp(match[1], 'g');
    const replacement = match[2];

    const content = await Bun.file(file).text();
    const newContent = content.replace(pattern, replacement);

    if (inplace) {
        await Bun.write(file, newContent);
    } else {
        process.stdout.write(newContent);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
