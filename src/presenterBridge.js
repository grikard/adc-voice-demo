// A presenter URL is not identity. Binding is authorized by the authenticated opener and server.
export function readLaunch(hash){
 const p=new URLSearchParams(hash.replace(/^#/,''));if(!p.has('launch'))return null;
 const launch=p.get('launch'),nonce=p.get('nonce'),origin=p.get('presenterOrigin');
 if(!/^[a-zA-Z0-9]{18}$/.test(launch||'')||!/^[-a-f0-9]{36}$/i.test(nonce||'')||origin!=='https://hc1781018629519--c.vf.force.com')return {invalid:true};
 return {launch,nonce,origin};
}
export function connectPresenter(win,persona){
 const config=readLaunch(win.location.hash);let state=config?'waiting':'manual',conversationId=null,timer=null,deadline=Date.now()+60000;
 const listeners=new Set(),retired=new Set();
 const notify=()=>{for(const f of listeners)f();};
 const send=(type,extra={})=>{if(config&&!config.invalid&&win.opener&&!win.opener.closed)win.opener.postMessage({type,nonce:config.nonce,...extra},config.origin);};
 const fail=()=>{state='error';notify();};
 const publishBound=()=>win.dispatchEvent(new win.CustomEvent('onADCSessionBound',{detail:{conversationId,personaKey:persona}}));
 function onMessage(e){
  if(!config||config.invalid||e.origin!==config.origin||e.source!==win.opener||e.data?.nonce!==config.nonce)return;
  const d=e.data;
  if(d.type==='ADC_LAUNCH_READY'&&d.persona===persona&&state==='waiting'){state='prepared';notify();}
  if(d.type==='ADC_BOUND'&&d.persona===persona&&typeof d.conversationId==='string'&&!retired.has(d.conversationId)&&(!conversationId||d.conversationId===conversationId)){
   conversationId=d.conversationId;state='bound';publishBound();notify();
  }
  if(d.type==='ADC_CHECKS'&&state==='bound'&&d.checks?.conversationId===conversationId&&d.checks?.personaKey===persona)win.dispatchEvent(new win.CustomEvent('onADCYourChecks',{detail:d.checks}));
  if(d.type==='ADC_BINDING_ERROR'&&(!d.conversationId||d.conversationId===conversationId))fail();
  if(d.type==='ADC_CHECKS_UNAVAILABLE')win.dispatchEvent(new win.CustomEvent('onADCChecksUnavailable',{detail:{conversationId}}));
  if(d.type==='ADC_ENDED'&&d.conversationId===conversationId)finish();
 }
 function started(e){
  if(!config||config.invalid)return;const id=e.detail?.conversationId;
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id)||retired.has(id))return;
  if(id===conversationId&&state==='bound')return;
  if(conversationId&&conversationId!==id)retired.add(conversationId);
  conversationId=id;state='binding';deadline=Date.now()+60000;send('ADC_CONVERSATION',{conversationId});notify();
 }
 function finish(){if(!conversationId)return;state='ended';send('ADC_SESSION_ENDED',{conversationId});notify();}
 function payload(e){try{const raw=e.detail?.conversationEntry?.entryPayload;return typeof raw==='string'?JSON.parse(raw):raw;}catch{return null;}}
 function ended(e){const p=payload(e),id=e.detail?.conversationId||p?.conversationIdentifier;if(id===conversationId)finish();}
 function sessionStatus(e){const p=payload(e);if(p?.entryType==='SessionStatusChanged'&&p.conversationIdentifier===conversationId&&String(p.sessionStatus).toUpperCase()==='ENDED')finish();}
 win.addEventListener('message',onMessage);win.addEventListener('onEmbeddedMessagingConversationStarted',started);
 win.addEventListener('onEmbeddedMessagingConversationClosed',ended);win.addEventListener('onEmbeddedMessagingSessionStatusUpdate',sessionStatus);
 if(config){if(config.invalid||!win.opener)state='error';else{send('ADC_HELLO');timer=win.setInterval(()=>{
  if(['waiting','connecting','binding'].includes(state)&&(Date.now()>deadline||win.opener.closed)){fail();return;}
  if(state==='waiting')send('ADC_HELLO');
  if(state==='binding')send('ADC_CONVERSATION',{conversationId});
 },1500);}}
 return {config,snapshot:()=>({state,conversationId}),begin:()=>{if(!['prepared','ended','bound'].includes(state))throw Error('Presenter authorization required');if(state!=='bound'){state='connecting';deadline=Date.now()+60000;notify();}},fail,subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},dispose:()=>{win.clearInterval(timer);win.removeEventListener('message',onMessage);win.removeEventListener('onEmbeddedMessagingConversationStarted',started);win.removeEventListener('onEmbeddedMessagingConversationClosed',ended);win.removeEventListener('onEmbeddedMessagingSessionStatusUpdate',sessionStatus);}};
}
