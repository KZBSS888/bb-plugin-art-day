import {artDate} from './fresh-art.mjs';
// Durable daily gate. Cron runs each minute, but at most three agent attempts per museum day.
export function createScheduler({kv,store,enabled,spawn,getThread,clock=()=>new Date()}) {
 let busy=false;
 return async function tick(manual=false){
  if(busy)return;busy=true;
  try {
   if(!await enabled()||!store.get().stale)return;
   const now=clock(),day=artDate(now);
   let job=await kv.get('job');
   if(job?.threadId){
    const thread=await getThread(job.threadId);
    if(!['idle','error','archived'].includes(thread.status))return;
    job={...job,status:'Выпуск пока не готов. Можно повторить поиск.'};await kv.set('job',job);
   }
   if(job?.day!==day)job={day,attempts:0};
   if(job.attempts>=3){await kv.set('job',{...job,status:'Три попытки исчерпаны. Следующий поиск — в новом музейном дне.'});return;}
   if(!manual&&now.getTime()-(job.at||0)<3600000)return;
   // Persist attempt before spawn: crashes cannot cause an unbounded paid-agent loop.
   job={day,attempts:job.attempts+1,at:now.getTime(),status:'Запускается подбор'};
   await kv.set('job',job);
   try {const thread=await spawn(day);await kv.set('job',{...job,threadId:thread.id,status:'Агент готовит свежий выпуск'});}
   catch {await kv.set('job',{...job,status:'Агент недоступен. Проверьте подключение в BB.'});}
  } finally {busy=false;}
 };
}
