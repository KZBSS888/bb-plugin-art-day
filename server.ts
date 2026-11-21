import {writeFileSync,renameSync} from 'node:fs';
import {dirname,join} from 'node:path';
import type {BbPluginApi} from '@get-bb/plugin-sdk';
import {createArtStore,fetchImage,validateArtwork} from './fresh-art.mjs';
import {createScheduler} from './scheduler.mjs';
import {dailyPrompt} from './prompt.mjs';
import {createLocalization} from './localization.mjs';

export default async function plugin(bb:BbPluginApi){
 const settings=bb.settings.define({enabled:{type:'boolean',label:'Ежедневный подбор (использует агента BB)',default:true}});
 const db=bb.storage.database(),profile=join(dirname(db.name),'ART-TASTE.md');
 const store=createArtStore(db,{writeProfile:(text="")=>{writeFileSync(profile+'.tmp',text,{mode:0o600});renameSync(profile+'.tmp',profile)}});
 const localization=createLocalization(db,store);
 const get=async(language="ru")=>({...localization.get(language),enabled:(await settings.get()).enabled,jobStatus:(await bb.storage.kv.get<{status:string}>('job'))?.status||''});
 async function body(c:any){
  if(Number(c.req.header('content-length')||0)>32768)throw Error('Запрос слишком большой');
  const reader=c.req.raw.body?.getReader();if(!reader)throw Error('Нет данных');
  let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768)throw Error('Запрос слишком большой');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }
 const tick=createScheduler({kv:bb.storage.kv,store:{get:()=>({stale:store.get().stale||localization.pending().length>0})},enabled:async()=>(await settings.get()).enabled,
  stopThread:async(id:string)=>{await bb.sdk.threads.stop({threadId:id})},
  getThread:async(id:string)=>bb.sdk.threads.get({threadId:id}),
  spawn:async(day:string)=>{
   const personal=(await bb.sdk.projects.list({includePersonal:true})).find(p=>p.kind==='personal');
   if(!personal)throw Error('Личное пространство BB недоступно');
   return bb.sdk.threads.spawn({projectId:personal.id,environment:{type:'host',workspace:{type:'personal'}},title:'Картина дня · '+day,prompt:dailyPrompt(bb.server.loopbackBaseUrl+'/api/v1/plugins/art-day/http/picture-day',day),visibility:'hidden',permissionMode:'auto',pluginMetadata:{purpose:'daily-art',day}});
  }});
 bb.background.schedule('daily-art','* * * * *',()=>tick());
 bb.http.route('POST','/picture-day/retry',async c=>{try{const b=await body(c);if(!b||Object.keys(b).length)throw Error();await tick(true);return c.json(await get())}catch{return c.text('Повтор недоступен',400)}});
 // The durable schedule starts automatically; a fresh install does not need an extra setup agent.
 bb.http.route('GET','/picture-day',async c=>{c.header('Cache-Control','no-store');return c.json(await get(c.req.query('language')||'ru'))});
 bb.http.route('GET','/picture-day/brief',c=>{c.header('Cache-Control','no-store');return c.json({...store.brief(),missingTranslations:localization.pending()})});
 bb.http.route('GET','/picture-day/translation-work',c=>{c.header('Cache-Control','no-store');return c.json({cards:localization.work()})});
 bb.http.route('POST','/picture-day/translate',async c=>{try{if(!(await settings.get()).enabled)return c.text('Disabled',409);localization.save(await body(c));return c.json({ok:true})}catch{return c.text('Invalid translation',400)}});
 bb.http.route('GET','/picture-day/seen',c=>{c.header('Cache-Control','no-store');const query=Object.fromEntries(['id','artist','title'].map(k=>[k,(c.req.query(k)||'').slice(0,3000)]));return c.json({seen:store.seen(query)})});
 bb.http.route('GET','/picture-day/profile',()=>new Response(store.profile(),{headers:{'Content-Type':'text/markdown; charset=utf-8','Cache-Control':'no-store'}}));
 bb.http.route('POST','/picture-day/preference',async c=>{try{store.rate(await body(c));return c.json({ok:true})}catch{return c.text('Некорректная оценка',400)}});
 bb.http.route('POST','/picture-day/schedule',async c=>{try{const b=await body(c);if(typeof b.enabled!=='boolean'||Object.keys(b).length!==1)throw Error();await settings.experimental_set({enabled:b.enabled});return c.json(await get())}catch{return c.text('Некорректное расписание',400)}});
 let publishing=false;
 bb.http.route('POST','/picture-day/publish',async c=>{
  if(publishing)return c.text('Публикация уже выполняется',409);
  publishing=true;try{if(!(await settings.get()).enabled)return c.text('Подбор выключен',409);const a=await body(c);validateArtwork(a);if(!store.get().stale)return c.json({changed:false});const image=await fetchImage(a);if(!(await settings.get()).enabled)return c.text('Подбор выключен',409);store.publish(a,image.sha,image);await bb.storage.kv.set('job',{...await bb.storage.kv.get<any>('job'),day:a.date,status:'Свежий выпуск готов; переводится рассказ'});return c.json({ok:true,date:a.date,id:a.id})}catch{return c.text('Карточка отклонена: проверьте дату, повтор, поля, права и доступность изображения.',400)}finally{publishing=false}
 });
 // No arbitrary URL proxy. Both image routes accept only an ID already validated by publish.
 for(const path of ['image','download'])bb.http.route('GET','/picture-day/'+path,async c=>{const a=store.get().artworks.find((a:any)=>a.id===c.req.query('id'));if(!a||a.compact)return c.text('Не сохранено',404);try{let img=store.image(a.id);if(!img){img=await fetchImage(a);store.saveImage(a.id,img);}const ext=img.type==='image/png'?'png':img.type==='image/webp'?'webp':'jpg';return new Response(new Uint8Array(img.bytes),{headers:{'Content-Type':img.type,'X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=300',...(path==='download'?{'Content-Disposition':`attachment; filename="art-day.${ext}"`}:{})}})}catch(e){bb.log.warn('Image fetch/cache failed: '+(e instanceof Error?e.message:'unknown')+' '+String((e as any)?.cause?.code||''));return c.text('Изображение недоступно',502)}});
}
