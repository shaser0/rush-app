'use strict';

// Downloads pre-built data files from the main branch of the GitHub repo.
// Used by binary users who can't run the live wiki-sync scripts.
// Atomic writes (.tmp + rename) so a failed download never corrupts existing data.

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const REPO      = 'shaser0/rush-duel-app';
const RAW_BASE  = `https://raw.githubusercontent.com/${REPO}/main/data`;
const DATA_VER  = 'data-version.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'rush-duel-app/updater' },
    }, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Invalid JSON from ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const tmpPath = destPath + '.tmp';
    const out = fs.createWriteStream(tmpPath);
    const req = https.get(url, { headers: { 'User-Agent': 'rush-duel-app/updater' } }, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        out.destroy();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      res.on('data', chunk => {
        out.write(chunk);
        received += chunk.length;
        if (onProgress && total > 0) onProgress(received / total);
      });
      res.on('end', () => {
        out.end(() => {
          try {
            fs.renameSync(tmpPath, destPath);
            resolve();
          } catch (e) {
            reject(new Error(`Rename failed: ${e.message}`));
          }
        });
      });
    });
    req.on('error', err => { out.destroy(); reject(err); });
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('download timeout')); });
  });
}

async function checkDataUpdate(appDir) {
  const localPath = path.join(appDir, 'data', DATA_VER);
  let localVersion = 0;
  try {
    const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    localVersion = local.version ?? 0;
  } catch { /* first run or missing */ }

  const remoteManifest = await fetchJson(`${RAW_BASE}/${DATA_VER}`);
  const remoteVersion = remoteManifest.version ?? 0;
  return {
    localVersion,
    remoteVersion,
    hasUpdate: remoteVersion > localVersion,
    files: remoteManifest.files || [],
    remoteManifest,
  };
}

async function downloadData(appDir, files, onProgress) {
  const dataDir = path.join(appDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const total = files.length;
  for (let i = 0; i < total; i++) {
    const file = files[i];
    const url  = `${RAW_BASE}/${file}`;
    const dest = path.join(dataDir, file);
    await downloadFile(url, dest, filePct => {
      if (onProgress) onProgress((i + filePct) / total);
    });
    if (onProgress) onProgress((i + 1) / total);
  }
}

module.exports = { checkDataUpdate, downloadData };
