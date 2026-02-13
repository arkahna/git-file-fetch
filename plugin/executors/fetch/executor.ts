import { execFileSync } from 'child_process';

export interface FetchExecutorOptions {
  args: string;
}

// Minimal context shape to avoid depending on @nx/devkit types at build time
export interface NxExecutorContext {
  root?: string;
  projectName?: string;
  [key: string]: unknown;
}

export default async function runExecutor(
  options: FetchExecutorOptions,
  _context: NxExecutorContext,
) {
  try {
    const args = options.args.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
    const sanitized = args.map((a) => a.replace(/^['"]|['"]$/g, ''));
    console.log(`Running: npx git-file-fetch ${sanitized.join(' ')}`);
    execFileSync('npx', ['git-file-fetch', ...sanitized], { stdio: 'inherit' });
    return { success: true };
  } catch (error) {
    console.error('Fetch failed:', error);
    return { success: false };
  }
}
