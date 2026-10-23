import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const cli = path.resolve('node_modules/hexo/bin/hexo');
for (const command of ['clean', 'generate']) {
  const result = spawnSync(process.execPath, [cli, command, '--config', '_config.redefine.yml'], { encoding:'utf8', maxBuffer:16 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || '');
  process.stdout.write(output);
  // Hexo can log rendering errors and still return zero.
  if (result.error || result.status !== 0 || /(?:^|\n)(?:\u001b\[[0-9;]*m)*(?:ERROR|FATAL)\b/.test(output)) {
    throw new Error(`Hexo ${command} failed; output must not be published`);
  }
}
fs.writeFileSync('dist-redefine/.nojekyll', '');
const pages = fs.readdirSync('dist-redefine', { recursive:true }).filter(name => name.endsWith('.html'));
if (!pages.length) throw new Error('No HTML pages generated');
for (const page of pages) {
  const html = fs.readFileSync(path.join('dist-redefine', page), 'utf8');
  if (!/<!doctype html>/i.test(html) || !html.includes('id="swup"')) throw new Error(`Incomplete generated page: ${page}`);
}
console.log(`Validated ${pages.length} complete generated HTML pages.`);
