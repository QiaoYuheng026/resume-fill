const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const dependencyRequire = process.env.NODE_MODULES_PATH ? createRequire(path.join(process.env.NODE_MODULES_PATH, 'package.json')) : require;
const sharp = dependencyRequire('sharp');

async function main() {
  const directory = path.join(__dirname, 'src', 'icons');
  const source = await fs.readFile(path.join(directory, 'icon.svg'));
  for (const size of [16, 32, 48, 128]) {
    await sharp(source).resize(size, size).png().toFile(path.join(directory, `icon-${size}.png`));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
