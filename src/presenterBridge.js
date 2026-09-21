// Authenticated presenter stays in Salesforce. This bridge carries no SF credentials.
// A URL persona/launch ID is not authorization. Only the exact opener/origin handshake
// can enable the launch; the server additionally enforces operator, owner and scope.
export function readLaunch(hash){
 const p=new URLSearchParams(hash.replace(/^#/,''));
 if(!p.has('launch'))return null;
 const launch=p.get('launch'),nonce=p.get('nonce'),origin=p.get('presenterOrigin');
 if(!/^[a-zA-Z0-9]{18}$/.test(launch||'')||!/^[-a-f0-9]{36}$/i.test(nonce||'')||origin!=='https://hc1781018629519--c.vf.force.com')return {invalid:true};
 return {launch,nonce,origin};
}
export function connectPresenter(win,persona){
 const config=readLaunch(win.location.hash);let state=config?'waiting':'manual';
 let conversationId=null,timer=null;const listeners=new Set();
 const notify=()=>{for(const f of listeners)f();};
 const send=(type,extra={})=>{if(config&&!config.invalid&&win.opener)win.opener.postMessage({type,nonce:config.nonce,...extra},config.origin);};
 function onMessage(e){
  if(!config||config.invalid||e.origin!==config.origin||e.source!==win.opener||e.data?.nonce!==config.nonce)return;
  const d=e.data;
  if(d.type==='ADC_LAUNCH_READY'&&d.persona===persona&&state==='waiting'){state='prepared';notify();}
  if(d.type==='ADC_BOUND'&&d.persona===persona&&d.conversationId===conversationId){state='bound';notify();}
  if(d.type==='ADC_CHECKS'&&state==='bound'&&d.checks?.conversationId===conversationId&&d.checks?.personaKey===persona){win.dispatchEvent(new win.CustomEvent('onADCYourChecks',{detail:d.checks}));}
  if(d.type==='ADC_BINDING_ERROR'||d.type==='ADC_CHECKS_UNAVAILABLE'){state='error';notify();}
  if(d.type==='ADC_ENDED'){state='ended';notify();}
 }
 function started(e){
  if(!config||config.invalid||state==='error'||state==='ended')return;
  const id=e.detail?.conversationId;
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))return;
  if(conversationId&&conversationId!==id){state='error';notify();return;}
  conversationId=id;state='binding';send('ADC_CONVERSATION',{conversationId});notify();
 }
 function ended(e){if(e.detail?.conversationId!==conversationId)return;state='ended';send('ADC_SESSION_ENDED');notify();}
 win.addEventListener('message',onMessage);win.addEventListener('onEmbeddedMessagingConversationStarted',started);win.addEventListener('onEmbeddedMessagingConversationClosed',ended);
 if(config){if(config.invalid||!win.opener)state='error';else{send('ADC_HELLO');timer=win.setInterval(()=>{if(state==='waiting')send('ADC_HELLO');},1000);}}
 return {config,snapshot:()=>({state,conversationId}),subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},dispose:()=>{win.clearInterval(timer);win.removeEventListener('message',onMessage);win.removeEventListener('onEmbeddedMessagingConversationStarted',started);win.removeEventListener('onEmbeddedMessagingConversationClosed',ended);}};
}
