import { readFileSync } from 'fs';

const rawArgs = Bun.argv.slice(2);

// Membaca dari stdin (pipe) atau argumen file
async function run() {
  let content = "";

  if (rawArgs.length > 0 && !rawArgs[0].startsWith("-")) {
    // Membaca dari file jika argumen diberikan
    try {
      content = readFileSync(rawArgs[0], 'utf-8');
    } catch (e) {
      console.error(`Error reading file: ${e}`);
      process.exit(1);
    }
  } else {
    // Membaca dari stdin jika pipe digunakan
    for await (const chunk of Bun.stdin) {
      content += new TextDecoder().decode(chunk);
    }
  }

  const lines = content.split(/\r?\n/).filter(line => line.length > 0).length;
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  const chars = content.length;

  console.log(`${lines}\t${words}\t${chars}`);
}

run();
