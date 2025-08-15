import { execSync } from 'child_process';
export default async function runExecutor(options, _context) {
    try {
        const command = `npx @arkahna/git-file-fetch ${options.args}`;
        console.log(`Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
        return { success: true };
    }
    catch (error) {
        console.error('Fetch failed:', error);
        return { success: false };
    }
}
