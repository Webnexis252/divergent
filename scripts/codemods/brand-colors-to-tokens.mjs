/**
 * Replaces hard-coded brand hex colours in Tailwind classes with the design
 * tokens from globals.css, so a rebrand is a change to :root instead of to
 * hundreds of class names. Same colours, so nothing looks different.
 *
 *   node scripts/codemods/brand-colors-to-tokens.mjs           # dry run: counts per file
 *   node scripts/codemods/brand-colors-to-tokens.mjs --write   # apply
 *
 * Only touches Tailwind arbitrary values such as `bg-[#38c1ff]/10` →
 * `bg-(--brand-primary)/10`; hex values in JS (charts, inline styles, emails)
 * are left alone.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const TOKENS = {
  '#38c1ff': '--brand-primary',
  '#209bd2': '--brand-primary-strong',
  '#1b77ff': '--brand-primary-dark',
  '#72d3ff': '--primary-light-blue',
  '#fec600': '--accent-gold',
};

const write = process.argv.includes('--write');
const pattern = new RegExp(`-\\[(${Object.keys(TOKENS).join('|')})\\]`, 'gi');

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) yield path;
  }
}

let total = 0;
for (const path of files('src')) {
  const source = readFileSync(path, 'utf8');
  let count = 0;
  const updated = source.replace(pattern, (_, hex) => {
    count++;
    return `-(${TOKENS[hex.toLowerCase()]})`;
  });
  if (count === 0) continue;
  total += count;
  console.log(`${String(count).padStart(4)}  ${path}`);
  if (write) writeFileSync(path, updated);
}
console.log(`${write ? 'Replaced' : 'Would replace'} ${total} hard-coded brand colours.`);
