import {connectMessaging} from './messaging.js';
// Supported clearing for authenticated and anonymous chat; never edit SF storage.
export async function clearCustomerSession(win=window,doc=document){
 const connection=connectMessaging(win,doc);
 await new Promise((resolve,reject)=>{
  let off=()=>{};
  const timer=win.setTimeout(()=>{off();reject(Error('Reset readiness timed out'));},30000);
  const sync=()=>{
   if(connection.isApiReady()){win.clearTimeout(timer);off();resolve();}
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

// Allowlisted, non-secret diagnostics. Never display raw SDK errors or URLs.
export function preparationProblem(error){
 const message=error?.message;
 if(error?.name==='SecurityError'||error?.name==='QuotaExceededError')return {code:'BROWSER_STORAGE',text:'Browser storage is unavailable. Allow site storage for this demo and Salesforce, then reload.'};
 if(message==='Safe session switching is unavailable in this browser.')return {code:'BROWSER_LOCKS',text:'This browser cannot coordinate a safe session switch. Open the authenticated launcher in an up-to-date browser.'};
 if(message==='Reset readiness timed out'||message==='Salesforce unavailable')return {code:'MESSAGING_NOT_READY',text:'Salesforce messaging did not become ready. Check your connection and whether this browser blocked Salesforce content, then reload.'};
 if(message==='Session reset timed out')return {code:'RESET_TIMEOUT',text:'Salesforce did not confirm the browser session was cleared. Close other demo customer tabs, then reload this page. If an old chat is visible, end it using its menu first.'};
 if(message==='Session reset unavailable'||message==='Session reset completion unavailable')return {code:'RESET_API_UNAVAILABLE',text:'Salesforce session clearing is unavailable on this page. Reload to retry loading messaging.'};
 return {code:'PREPARATION_FAILED',text:'The browser session could not be prepared. Close other demo customer tabs and reload. If this repeats, report the diagnostic code below.'};
}
