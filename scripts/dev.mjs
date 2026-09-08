/**
 * Direct dev launcher — runs API (wrangler) and Web (next) concurrently
 * without Turbo, avoiding jest-worker crashes on Windows with spaces in user paths.
 *
 * Usage:
 *   node scripts/dev.mjs          # Start both API and web
 *   node scripts/dev.mjs --api    # Start only the API
 *   node scripts/dev.mjs --web    # Start only the web
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const onlyApi = args.includes('--api');
const onlyWeb = args.includes('--web');

const ROOT = resolve(import.meta.dirname, '..');

// Resolve pnpm home from common locations
function findPnpmHome() {
  const candidates = [
    process.env.PNPM_HOME,
    process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, 'pnpm') : null,
    resolve(process.env.USERPROFILE || 'C:\\Users\\default', '.local', 'share', 'pnpm'),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (dir && existsSync(resolve(dir, 'pnpm.exe'))) return dir;
    if (dir && existsSync(resolve(dir, 'pnpm.cmd'))) return dir;
  }
  return process.env.PNPM_HOME || 'C:\\pnpm';
}

// NODE_ENV may leak in as "production" from the host shell/IDE, which forces
// `next dev` into production mode (it hangs compiling the proxy). Dev servers
// are development processes — always hand them a clean NODE_ENV.
const env = { ...process.env, PNPM_HOME: findPnpmHome() };
delete env.NODE_ENV;
const children = [];

if (!onlyWeb) {
  console.log('[dev] Starting API (tsx watch) on http://localhost:8787');
  const api = spawn('npx', ['tsx', 'watch', '--env-file=.env', 'src/index.ts'], {
    cwd: resolve(ROOT, 'apps/api'),
    env,
    stdio: 'inherit',
    shell: true,
  });
  children.push(api);
}

if (!onlyApi) {
  console.log('[dev] Starting Web (next dev) on http://localhost:3000');
  const web = spawn('npx', ['next', 'dev'], {
    cwd: resolve(ROOT, 'apps/web'),
    env,
    stdio: 'inherit',
    shell: true,
  });
  children.push(web);
}

process.on('SIGINT', () => {
  for (const child of children) child.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  for (const child of children) child.kill();
  process.exit();
});
