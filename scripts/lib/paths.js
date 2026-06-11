'use strict';

const path = require('path');

// In pkg mode, RUSH_DATA_DIR is set by server.js before spawning the worker.
// In standalone node mode, default to the data/ directory at the repo root.
const DATA_DIR = process.env.RUSH_DATA_DIR || path.join(__dirname, '../../data');

const YUGIPEDIA_API = 'https://yugipedia.com/api.php';

module.exports = { DATA_DIR, YUGIPEDIA_API };
