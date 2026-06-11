'use strict';

// Re-spawn the calling script with --use-system-ca on Windows so HTTPS
// requests trust the Windows certificate store.
// Call as: ensureSystemCa(__filename) — must be first, before any https request.
// In pkg binaries the flag is baked via `--options use-system-ca`, so
// process.execArgv already contains it and no re-spawn happens.
function ensureSystemCa(callerFile) {
  if (!process.execArgv.some(a => a === '--use-system-ca')) {
    const { spawnSync } = require('child_process');
    const r = spawnSync(
      process.execPath,
      ['--use-system-ca', callerFile, ...process.argv.slice(2)],
      { stdio: 'inherit' }
    );
    process.exit(r.status ?? 0);
  }
}

const https = require('https');

// Single UA for all Yugipedia requests — identifies the app and links to the repo.
const UA = `rush-app/${require('../../package.json').version} (https://github.com/shaser0/rush-duel-app)`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// HTTPS GET with retry, timeout, and HTTP status check.
// Based on the reference implementation in sync-sets.js / sync-gallery.js.
function fetchJson(url, retries = 2) {
  return new Promise((resolve, reject) => {
    const attempt = n => {
      const req = https.get(url, { headers: { 'User-Agent': UA } }, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            if (n > 0) setTimeout(() => attempt(n - 1), 3000);
            else reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          try { resolve(JSON.parse(data)); }
          catch (e) {
            if (n > 0) setTimeout(() => attempt(n - 1), 2000);
            else reject(e);
          }
        });
      });
      req.on('error', err => {
        if (n > 0) setTimeout(() => attempt(n - 1), 2000);
        else reject(err);
      });
      req.setTimeout(30000, () => {
        req.destroy();
        if (n > 0) setTimeout(() => attempt(n - 1), 2000);
        else reject(new Error('timeout'));
      });
    };
    attempt(retries);
  });
}

module.exports = { ensureSystemCa, fetchJson, sleep, UA };
