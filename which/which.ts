import { which } from "bun";

const args = Bun.argv.slice(2);
if (args.length === 0) {
    process.exit(1);
}

const path = which(args[0]);
if (path) {
    console.log(path);
    process.exit(0);
} else {
    console.log(`${args[0]} not found`);
    process.exit(1);
}
