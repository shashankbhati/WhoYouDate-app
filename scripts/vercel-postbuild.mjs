import { writeFileSync, mkdirSync, renameSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const functionsDir = '.vercel/output/functions';
const funcDir = join(functionsDir, 'index.func');

if (!existsSync(functionsDir)) {
  console.log('No .vercel/output/functions found — skipping post-build');
  process.exit(0);
}

mkdirSync(funcDir, { recursive: true });

// Move all files/dirs from functions/ into functions/index.func/
for (const file of readdirSync(functionsDir)) {
  if (file !== 'index.func') {
    renameSync(join(functionsDir, file), join(funcDir, file));
  }
}

// Vercel function config
writeFileSync(join(funcDir, '.vc-config.json'), JSON.stringify({
  runtime: 'nodejs20.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
}, null, 2));

// Vercel routing config
writeFileSync('.vercel/output/config.json', JSON.stringify({
  version: 3,
  routes: [
    {
      src: '/assets/(.*)',
      headers: { 'cache-control': 'public,max-age=31536000,immutable' },
      continue: true,
    },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.func' },
  ],
}, null, 2));

console.log('Vercel Build Output API structure created.');
