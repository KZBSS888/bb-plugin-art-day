import {systemLanguage} from './i18n.mjs';
const fields=['title','story','detail','museum','medium'];
export function createLocalization(db,store){
 db.exec('CREATE TABLE IF NOT EXISTS art_translations(id TEXT NOT NULL,language TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(id,language))');
 function full(){return store.get().artworks.filter(a=>!a.compact)}
 function prune(){const ids=new Set(full().map(a=>a.id));for(const r of db.prepare('SELECT DISTINCT id FROM art_translations').all())if(!ids.has(r.id))db.prepare('DELETE FROM art_translations WHERE id=?').run(r.id)}
 function pending(){prune();return full().filter(a=>!db.prepare("SELECT 1 FROM art_translations WHERE id=? AND language='en'").get(a.id)).map(a=>a.id)}
 function work(){const ids=new Set(pending().slice(0,5));return full().filter(a=>ids.has(a.id)).map(a=>({id:a.id,artist:a.artist,...Object.fromEntries(fields.map(k=>[k,a[k]]))}))}
 function save(b){
  if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['id','language',...fields].includes(k))||!['ru','en'].includes(b.language)||typeof b.id!=='string'||!full().some(a=>a.id===b.id))throw Error('Invalid translation');
  for(const k of fields)if(typeof b[k]!=='string'||!b[k].trim()||b[k].length>3000)throw Error('Invalid translation field');
  const value=Object.fromEntries(fields.map(k=>[k,b[k]]));
  db.prepare('INSERT OR REPLACE INTO art_translations VALUES(?,?,?)').run(b.id,b.language,JSON.stringify(value));
 }
 function get(locale){const language=systemLanguage(locale),state=store.get();prune();let translationPending=false;
  const artworks=state.artworks.map(a=>{if(a.compact)return a;const row=db.prepare('SELECT data FROM art_translations WHERE id=? AND language=?').get(a.id,language);if(!row&&language==='en')translationPending=true;return row?{...a,...JSON.parse(row.data)}:a});
  return {...state,artworks,language,translationPending};
 }
 return {pending,work,save,get};
}
