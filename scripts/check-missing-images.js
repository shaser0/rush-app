'use strict';

const fs   = require('fs');
const path = require('path');

const cards    = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/cards.json'), 'utf8'));
const imgUrls  = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/image-urls.json'), 'utf8'));

function cleanFile(f) {
  return (f || '').replace(/^\d+\.\d+;\s*/, '').trim();
}

const missing = [];

for (const card of cards) {
  if (!card.images || card.images.length === 0) {
    missing.push({ name: card.raw_name_en || card.name_en || card.title, file: '(no image entries)' });
    continue;
  }
  const jpImages = card.images.filter(i => {
    const cf = cleanFile(i.file);
    return cf && !/-KRS?-/.test(cf);
  });
  if (jpImages.length === 0) {
    missing.push({ name: card.raw_name_en || card.name_en || card.title, file: '(no JP images)' });
    continue;
  }
  const hasUrl = jpImages.some(i => imgUrls[cleanFile(i.file)]);
  if (!hasUrl) {
    const files = jpImages.map(i => cleanFile(i.file)).join('; ');
    missing.push({ name: card.raw_name_en || card.name_en || card.title, file: files });
  }
}

console.log(`Cards with no resolved image URL: ${missing.length} / ${cards.length}\n`);
console.log('name\tfile(s)');
for (const { name, file } of missing) {
  console.log(`${name}\t${file}`);
}
