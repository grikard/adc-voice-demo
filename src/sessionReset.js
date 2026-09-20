import {connectMessaging} from './messaging.js';
// Supported clearing for authenticated and anonymous chat; never edit SF storage.
export async function clearCustomerSession(win=window,doc=document){
 const connection=connectMessaging(win,doc);
 await new Promise((resolve,reject)=>{
  let off=()=>{};
  const timer=win.setTimeout(()=>{off();reject(Error('Reset readiness timed out'));},30000);
  const sync=()=>{
   if(connection.getStatus()==='ready'){win.clearTimeout(timer);off();resolve();}
   else if(connection.getStatus()==='error'){win.clearTimeout(timer);off();reject(Error('Salesforce unavailable'));}
  };
  off=connection.subscribe(sync);sync();
 });
 const bootstrap=win.embeddedservice_bootstrap;
 if(typeof bootstrap?.userVerificationAPI?.clearSession!=='function')throw Error('Session reset unavailable');
 let timer;
 try{
  const result=bootstrap.userVerificationAPI.clearSession();
  if(!result||typeof result.then!=='function')throw Error('Session reset completion unavailable');
  await Promise.race([result,new Promise((_,reject)=>{timer=win.setTimeout(()=>reject(Error('Session reset timed out')),30000);})]);
  bootstrap.utilAPI?.removeAllComponents?.();
 }finally{win.clearTimeout(timer);}
}
