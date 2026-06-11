'use strict';

const fs = require('fs');

// Write JSON atomically: write to a .tmp sibling, then rename over the target.
// A failed write never leaves a corrupted target file; on rename failure the
// .tmp file is cleaned up before rethrowing.
function writeJsonAtomic(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  try {
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch {}
    throw e;
  }
}

module.exports = { writeJsonAtomic };
