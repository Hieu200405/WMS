import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const envFiles = [
  { example: 'server/.env.example', target: 'server/.env' },
  { example: 'frontend/.env.example', target: 'frontend/.env' }
];

const created = [];

for (const { example, target } of envFiles) {
  const examplePath = resolve(projectRoot, example);
  const targetPath = resolve(projectRoot, target);

  if (!existsSync(examplePath)) {
    console.warn(`Skipped ${target} because ${example} was not found.`);
    continue;
  }

  if (existsSync(targetPath)) {
    continue;
  }

  copyFileSync(examplePath, targetPath);
  created.push(target);
}

if (created.length === 0) {
  console.log('Environment files already exist. Nothing to do.');
} else {
  console.log('Created environment files:');
  for (const file of created) {
    console.log(`- ${file}`);
  }
}
