const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
function getArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
}

const sourceDir = getArg('--source')
  ? path.resolve(process.cwd(), getArg('--source'))
  : path.join(rootDir, 'frontend');
const outDir = getArg('--out')
  ? path.resolve(process.cwd(), getArg('--out'))
  : path.join(rootDir, 'dist');

const textExtensions = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const eq = trimmed.indexOf('=');
    if (eq === -1) return;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const basename = path.basename(src);
  if ([
    '.env',
    '.env.example',
    'package.json',
    'package-lock.json',
    'vercel.json'
  ].includes(basename)) {
    return;
  }

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    fs.readdirSync(src).forEach(entry => {
      if (entry === 'dist' || entry === 'node_modules' || entry === '.env') return;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    });
    return;
  }

  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function walkFiles(dir, files = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  });
  return files;
}

function minifyHtml(input) {
  const preserved = [];
  const withPlaceholders = input.replace(/<(script|style|pre|textarea)\b[\s\S]*?<\/\1>/gi, match => {
    const token = `%%TEKAGON_PRESERVE_${preserved.length}%%`;
    preserved.push(match);
    return token;
  });

  const minified = withPlaceholders
    .replace(/<!--(?!\[if|<!|>)[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s+(<\/?(?:html|head|body|meta|link|script|div|span|section|main|aside|nav|button|img|input|textarea|footer|header)\b)/g, '$1')
    .trim();

  return preserved.reduce((html, content, index) => {
    return html.replace(`%%TEKAGON_PRESERVE_${index}%%`, content.trim());
  }, minified);
}

function minifyCss(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyJs(input) {
  return input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .join('\n');
}

function obfuscateJs(input) {
  const payload = Buffer.from(input, 'utf8').toString('base64');
  return `(()=>{const c='${payload}';(0,eval)(atob(c));})();`;
}

function publicEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

function writeRuntimeConfig() {
  const config = {
    API_URL: publicEnv('VITE_PUBLIC_API_URL', publicEnv('PUBLIC_API_URL', '')),
    FIREBASE_API_KEY: publicEnv('VITE_FIREBASE_API_KEY', publicEnv('PUBLIC_FIREBASE_API_KEY', '')),
    FIREBASE_AUTH_DOMAIN: publicEnv('VITE_FIREBASE_AUTH_DOMAIN', publicEnv('PUBLIC_FIREBASE_AUTH_DOMAIN', '')),
    FIREBASE_PROJECT_ID: publicEnv('VITE_FIREBASE_PROJECT_ID', publicEnv('PUBLIC_FIREBASE_PROJECT_ID', '')),
    FIREBASE_STORAGE_BUCKET: publicEnv('VITE_FIREBASE_STORAGE_BUCKET', publicEnv('PUBLIC_FIREBASE_STORAGE_BUCKET', '')),
    FIREBASE_MESSAGING_SENDER_ID: publicEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', publicEnv('PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '')),
    FIREBASE_APP_ID: publicEnv('VITE_FIREBASE_APP_ID', publicEnv('PUBLIC_FIREBASE_APP_ID', '')),
    FIREBASE_MEASUREMENT_ID: publicEnv('VITE_FIREBASE_MEASUREMENT_ID', publicEnv('PUBLIC_FIREBASE_MEASUREMENT_ID', '')),
    INDEX_FIREBASE_API_KEY: publicEnv('VITE_INDEX_FIREBASE_API_KEY', publicEnv('PUBLIC_INDEX_FIREBASE_API_KEY', '')),
    INDEX_FIREBASE_AUTH_DOMAIN: publicEnv('VITE_INDEX_FIREBASE_AUTH_DOMAIN', publicEnv('PUBLIC_INDEX_FIREBASE_AUTH_DOMAIN', '')),
    INDEX_FIREBASE_PROJECT_ID: publicEnv('VITE_INDEX_FIREBASE_PROJECT_ID', publicEnv('PUBLIC_INDEX_FIREBASE_PROJECT_ID', '')),
    INDEX_FIREBASE_STORAGE_BUCKET: publicEnv('VITE_INDEX_FIREBASE_STORAGE_BUCKET', publicEnv('PUBLIC_INDEX_FIREBASE_STORAGE_BUCKET', '')),
    INDEX_FIREBASE_MESSAGING_SENDER_ID: publicEnv('VITE_INDEX_FIREBASE_MESSAGING_SENDER_ID', publicEnv('PUBLIC_INDEX_FIREBASE_MESSAGING_SENDER_ID', '')),
    INDEX_FIREBASE_APP_ID: publicEnv('VITE_INDEX_FIREBASE_APP_ID', publicEnv('PUBLIC_INDEX_FIREBASE_APP_ID', '')),
    INDEX_FIREBASE_MEASUREMENT_ID: publicEnv('VITE_INDEX_FIREBASE_MEASUREMENT_ID', publicEnv('PUBLIC_INDEX_FIREBASE_MEASUREMENT_ID', '')),
    CLOUDINARY_CLOUD_NAME: publicEnv('VITE_CLOUDINARY_CLOUD_NAME', ''),
    CLOUDINARY_UPLOAD_PRESET: publicEnv('VITE_CLOUDINARY_UPLOAD_PRESET', '')
  };

  const contents = `window.TEKAGON_PUBLIC_CONFIG=${JSON.stringify(config)};`;
  const target = path.join(outDir, 'js', 'runtime-config.js');
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, contents);
}

function writeStaticEntrypoint() {
  const server = `
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = process.env.PORT || 3000;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};
function safeFile(url) {
  const clean = decodeURIComponent((url || '/').split('?')[0]);
  const target = path.normalize(path.join(root, clean === '/' ? '/index.html' : clean));
  if (!target.startsWith(root)) return path.join(root, 'index.html');
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  return path.join(root, 'index.html');
}
http.createServer((req, res) => {
  const file = safeFile(req.url);
  res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(port);
`.trim();

  const payload = Buffer.from(minifyJs(server), 'utf8').toString('base64');
  const entrypoint = `(()=>{const c='${payload}';eval(Buffer.from(c,'base64').toString('utf8'));})();`;
  fs.writeFileSync(path.join(outDir, 'index.js'), entrypoint);
}

function verifyOutput() {
  const required = ['index.html', 'index.js'];
  const missing = required.filter(file => !fs.existsSync(path.join(outDir, file)));
  if (missing.length > 0) {
    throw new Error(`Production build is missing required output file(s): ${missing.join(', ')}`);
  }
}

function injectRuntimeConfig(html) {
  if (html.includes('runtime-config.js')) return html;

  return html.replace(
    /(<script\s+src=["'][^"']*firebase-config\.js["']><\/script>)/,
    '<script src="../js/runtime-config.js"></script>$1'
  ).replace(
    /(<script\s+src=["'][^"']*api\.js["']><\/script>)/,
    '<script src="/js/runtime-config.js"></script>$1'
  );
}

function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!textExtensions.has(ext)) return;

  let contents = fs.readFileSync(filePath, 'utf8');
  if (ext === '.html') {
    contents = minifyHtml(injectRuntimeConfig(contents));
  } else if (ext === '.css') {
    contents = minifyCss(contents);
  } else if (ext === '.js') {
    contents = obfuscateJs(minifyJs(contents));
  }
  fs.writeFileSync(filePath, contents);
}

loadEnvFile(path.join(rootDir, '.env'));
loadEnvFile(path.join(sourceDir, '.env'));

removeDir(outDir);
copyRecursive(sourceDir, outDir);
writeRuntimeConfig();
walkFiles(outDir).forEach(processFile);
writeStaticEntrypoint();
verifyOutput();

console.log(`Production build created at ${path.relative(rootDir, outDir)}`);
