'use strict';
const { execSync } = require('child_process');
const fs = require('fs');

execSync('pkg . --targets node20-win-x64   --output dist/rush-app-win.exe', { stdio: 'inherit' });
execSync('pkg . --targets node20-linux-x64 --output dist/rush-app-linux',   { stdio: 'inherit' });
execSync('pkg . --targets node20-macos-x64 --output dist/rush-app-macos',   { stdio: 'inherit' });

// Patch the Windows exe PE header: change subsystem from console (3) to GUI (2).
// This tells Windows not to create a terminal window when the exe is launched,
// regardless of how it is started (double-click, launcher, etc.).
(function patchToGui(exePath) {
  const buf = fs.readFileSync(exePath);
  const peOffset = buf.readUInt32LE(0x3C);
  const optHeaderOffset = peOffset + 4 + 20; // skip PE sig + COFF header
  const magic = buf.readUInt16LE(optHeaderOffset);
  // PE32 = 0x010B (subsystem at +64), PE32+ = 0x020B (subsystem at +68)
  const subsystemOff = optHeaderOffset + (magic === 0x020B ? 68 : 64);
  buf.writeUInt16LE(2, subsystemOff); // 2 = IMAGE_SUBSYSTEM_WINDOWS_GUI
  fs.writeFileSync(exePath, buf);
  console.log('Patched to GUI subsystem:', exePath);
})('dist/rush-app-win.exe');

fs.cpSync('data', 'dist/data', { recursive: true });
fs.copyFileSync('README.md', 'dist/README.md');
fs.chmodSync('dist/rush-app-linux', 0o755);
fs.chmodSync('dist/rush-app-macos', 0o755);



console.log('Build complete. dist/ is ready to share.');
