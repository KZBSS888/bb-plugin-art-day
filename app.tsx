import {definePluginApp} from '@get-bb/plugin-sdk/app';
import {PictureDayProject} from './art-day';
export default definePluginApp(app=>{app.slots.navPanel({id:'picture-day',title:'Art Day',icon:'Images',path:'picture-day',component:PictureDayProject})});
