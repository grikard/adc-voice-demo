import {build} from 'vite';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Supply the verified final app URL, including any reserved app subdirectory.
// This builds locally only. It never changes a repository or publishes a site.
const value = process.argv[2];
if (!value) throw new Error('Usage: npm run build:pages -- <verified HTTPS app URL ending in />');
const site = new URL(value);
if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash || !site.pathname.endsWith('/')) {
  throw new Error('Use an HTTPS app URL with a trailing slash, no credentials, query, or fragment.');
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'dist-pages');
await build({root, mode: 'pages', base: site.pathname, build: {outDir, emptyOutDir: true, sourcemap: false}});
writeFileSync(resolve(outDir, '.nojekyll'), '');

// Strictly constrain the public artifact. Never package the Salesforce workspace.
const files = [];
function inspect(dir, prefix = '') {
  for (const item of readdirSync(dir, {withFileTypes: true})) {
    const name = prefix + item.name;
    if (item.isSymbolicLink()) throw new Error(`Symlink excluded from deployment: ${name}`);
    if (item.isDirectory()) {
      if (name !== 'assets') throw new Error(`Unexpected deployment directory: ${name}`);
      inspect(resolve(dir, item.name), name + '/');
    } else {
      if (!/^(index\.html|behind\.html|\.nojekyll|assets\/[A-Za-z0-9_.-]+\.(js|css|png))$/.test(name)) {
        throw new Error(`Unexpected deployment file: ${name}`);
      }
      if (/\.(html|js|css)$/.test(name)) {
        const text = readFileSync(resolve(dir, item.name), 'utf8');
        if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\b00D[A-Za-z0-9]{12,15}![A-Za-z0-9._-]{20,}|"(?:accessToken|refreshToken|clientSecret)"\s*:\s*"[^"\s]+"/.test(text)) {
          throw new Error(`Possible credential in deployment file: ${name}`);
        }
      }
      files.push(name);
    }
  }
}
inspect(outDir);
const html = readFileSync(resolve(outDir, 'index.html'), 'utf8');
const snippetConnected = !html.includes('SALESFORCE_DEPLOYMENT_SNIPPET');
console.log(JSON.stringify({proposedAppUrl: site.href, salesforceHostname: site.hostname,
  viteBase: site.pathname, outputDirectory: outDir, files, snippetConnected, published: false}, null, 2));
if (!snippetConnected) console.warn('Salesforce snippet is still missing; this build is the customer shell only.');
