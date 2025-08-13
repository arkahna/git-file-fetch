import { execSync } from 'child_process';

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
    const command = `npx @arkahna/fetch-git-file ${options.args}`;
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return { success: true };
  } catch (error) {
    console.error('Fetch failed:', error);
    return { success: false };
  }
}
