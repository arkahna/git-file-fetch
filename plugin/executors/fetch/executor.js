import { execFileSync } from 'child_process';
export default async function runExecutor(options, _context) {
    try {
        const args = options.args.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
        const sanitized = args.map((a) => a.replace(/^['"]|['"]$/g, ''));
        console.log(`Running: npx git-file-fetch ${sanitized.join(' ')}`);
        execFileSync('npx', ['git-file-fetch', ...sanitized], { stdio: 'inherit' });
        return { success: true };
    }
    catch (error) {
        console.error('Fetch failed:', error);
        return { success: false };
    }
}
