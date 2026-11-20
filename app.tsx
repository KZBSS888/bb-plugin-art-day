import {definePluginApp, experimental_Icon as Icon} from '@get-bb/plugin-sdk/app';
import {useEffect,useState} from 'react';
import {PictureDayProject} from './art-day';
function DailyPaintingIcon({className}:{className?:string}){
 const [id,setId]=useState<string|null>(null),[broken,setBroken]=useState(false);
 useEffect(()=>{let alive=true;const controller=new AbortController();const load=async()=>{try{const r=await fetch('/api/v1/plugins/art-day/http/picture-day/brief',{signal:controller.signal,cache:'no-store'});if(!r.ok)return;const data=await r.json();if(alive){setId(data.currentId||null);setBroken(false)}}catch{}};void load();const timer=setInterval(load,60000);return()=>{alive=false;controller.abort();clearInterval(timer)}},[]);
 return id&&!broken?<svg className={className} width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" style={{display:'block',flexShrink:0,borderRadius:4,overflow:'hidden'}}><image href={'/api/v1/plugins/art-day/http/picture-day/image?id='+encodeURIComponent(id)} width="24" height="24" preserveAspectRatio="xMidYMid slice" onError={()=>setBroken(true)}/><rect x="0.5" y="0.5" width="23" height="23" rx="3.5" fill="none" stroke="rgba(100,90,65,.45)"/></svg>:<Icon name="Palette" className={className}/>;
}
export default definePluginApp(app=>{app.experimental_icons.register({name:'ArtDayPainting',component:DailyPaintingIcon});app.slots.navPanel({id:'picture-day',title:'Art Day',icon:'ArtDayPainting',path:'picture-day',component:PictureDayProject})});
