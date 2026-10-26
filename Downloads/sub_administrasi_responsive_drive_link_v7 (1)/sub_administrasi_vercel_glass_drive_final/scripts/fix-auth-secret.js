const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.cwd();
const envPath = path.join(root, '.env.local');
const examplePath = path.join(root, '.env.example');
const sourcePath = fs.existsSync(envPath) ? envPath : examplePath;
let content = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '';
const secret = crypto.randomBytes(48).toString('base64url');

function upsertEnv(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) return text.replace(re, line);
  return `${line}\n${text}`;
}

content = upsertEnv(content, 'AUTH_SECRET', secret);
if (!/^SESSION_HOURS=/m.test(content)) content += '\nSESSION_HOURS=8\n';

fs.writeFileSync(envPath, content.trimEnd() + '\n');
console.log('AUTH_SECRET berhasil dibuat di .env.local');
console.log(secret);
