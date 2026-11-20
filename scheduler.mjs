import {artDate} from './fresh-art.mjs';
// Durable daily gate. Cron runs each minute, but at most three agent attempts per museum day.
export function createScheduler({kv,store,enabled,spawn,getThread,stopThread=/** @param {string} id */ async(id)=>{},clock=()=>new Date()}) {
 let busy=false;
 return async function tick(manual=false){
  if(busy)return;busy=true;
  try {
   if(!await enabled()||!store.get().stale)return;
   const now=clock(),day=artDate(now);
   let job=await kv.get('job');
   if(job?.threadId){
    let thread=await getThread(job.threadId);
    const finished=t=>['idle','error','archived'].includes(t?.status);
    if(!finished(thread)){
     if(now.getTime()-(job.at||now.getTime())<20*60*1000)return;
     job={...job,timedOut:true,status:'Подбор превысил 20 минут. Останавливаем перед повтором.'};await kv.set('job',job);
     try{await stopThread(job.threadId);thread=await getThread(job.threadId)}catch{
      await kv.set('job',{...job,status:'Не удалось подтвердить остановку. Повтор пока заблокирован.'});return;
     }
     if(!finished(thread))return;
    }
    if(!store.get().stale||!await enabled())return;
    job={...job,status:'Выпуск пока не готов. Можно повторить поиск.'};await kv.set('job',job);
   }
   if(job?.day!==day)job={day,attempts:0};
   if(job.attempts>=3){await kv.set('job',{...job,status:'Три попытки исчерпаны. Следующий поиск — в новом музейном дне.'});return;}
   if(!manual&&!job.timedOut&&now.getTime()-(job.at||0)<3600000)return;
   // Persist attempt before spawn: crashes cannot cause an unbounded paid-agent loop.
   job={day,attempts:job.attempts+1,at:now.getTime(),status:'Запускается подбор'};
   await kv.set('job',job);
   try {const thread=await spawn(day);await kv.set('job',{...job,threadId:thread.id,status:'Агент готовит свежий выпуск'});}
   catch {await kv.set('job',{...job,status:'Агент недоступен. Проверьте подключение в BB.'});}
  } finally {busy=false;}
 };
}
