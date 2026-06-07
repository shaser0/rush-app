'use strict';

// Fetches the Rush Duel banlist from Yugipedia and saves to data/banlist.json.
// Format: { "Card Name": "Forbidden" | "Limited" | "Semi-Limited" }

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUT = path.join(__dirname, '../data/banlist.json');

// Yugipedia API query for the Rush Duel Limited Cards list page
const API = 'https://yugipedia.com/api.php?action=parse&page=List_of_Rush_Duel_Limited_Cards&prop=wikitext&format=json&origin=*';

function get(url){
  return new Promise((resolve,reject)=>{
    https.get(url,{headers:{'User-Agent':'rush-app-banlist-sync/1.0'}},res=>{
      let data='';
      res.on('data',c=>data+=c);
      res.on('end',()=>resolve(data));
    }).on('error',reject);
  });
}

async function syncBanlist(){
  console.log('Fetching banlist from Yugipedia…');
  let raw;
  try{ raw=JSON.parse(await get(API)); }
  catch(e){ console.error('Failed to fetch banlist:',e.message); process.exit(1); }

  const wikitext=raw?.parse?.wikitext?.['*']||'';
  const banlist={};

  // Parse wiki table rows: each row has a card name and status columns
  // Format is typically: | [[Card Name]] || Forbidden/Limited/Semi-Limited
  const rowRe=/\|\|\s*(Forbidden|Limited|Semi-Limited)\s*[\|\n]/gi;
  const nameRe=/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

  // Split by table rows (lines starting with |- or |)
  const lines=wikitext.split('\n');
  let currentCard=null;
  for(const line of lines){
    const nameMatch=line.match(/^\|[^|].*?\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
    if(nameMatch) currentCard=nameMatch[1].trim();
    const statusMatch=line.match(/\|\|\s*(Forbidden|Limited|Semi-Limited)/i);
    if(statusMatch&&currentCard){
      banlist[currentCard]=statusMatch[1];
      currentCard=null;
    }
  }

  // Fallback: scan for inline patterns like {{Forbidden|Card Name}}
  const inlineRe=/\{\{(Forbidden|Limited|Semi-Limited)\|([^}]+)\}\}/gi;
  let m;
  while((m=inlineRe.exec(wikitext))!==null){
    banlist[m[2].trim()]=m[1];
  }

  fs.writeFileSync(OUT, JSON.stringify(banlist, null, 2), 'utf8');
  console.log(`Banlist saved: ${Object.keys(banlist).length} entries → data/banlist.json`);
}

module.exports = { syncBanlist };
if(require.main===module) syncBanlist().catch(e=>{console.error(e);process.exit(1);});
