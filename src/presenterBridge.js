// A presenter URL is not identity. Binding is authorized by the authenticated opener and server.
export function readLaunch(hash){
 const p=new URLSearchParams(hash.replace(/^#/,''));if(!p.has('launch'))return null;
 const launch=p.get('launch'),nonce=p.get('nonce'),origin=p.get('presenterOrigin');
 if(!/^[a-zA-Z0-9]{18}$/.test(launch||'')||!/^[-a-f0-9]{36}$/i.test(nonce||'')||origin!=='https://hc1781018629519--c.vf.force.com')return {invalid:true};
 return {launch,nonce,origin};
}
export function connectPresenter(win,persona){
 const config=readLaunch(win.location.hash);let state=config?'waiting':'manual',conversationId=null,timer=null,deadline=Date.now()+60000;
 const listeners=new Set(),retired=new Set();let heartbeat=0,verifiedConversation=null;
 const notify=()=>{for(const f of listeners)f();};
 const send=(type,extra={})=>{if(config&&!config.invalid&&win.opener&&!win.opener.closed)win.opener.postMessage({type,nonce:config.nonce,launchId:config.launch,...extra},config.origin);};
 const fail=()=>{state='error';notify();};
 const publishBound=()=>win.dispatchEvent(new win.CustomEvent('onADCSessionBound',{detail:{conversationId,personaKey:persona}}));
 function onMessage(e){
  if(!config||config.invalid||e.origin!==config.origin||e.source!==win.opener||e.data?.nonce!==config.nonce)return;
  const d=e.data;
  if(d.type==='ADC_LAUNCH_READY'&&d.persona===persona&&state==='waiting'){state='prepared';notify();}
  if(d.type==='ADC_BOUND'&&d.persona===persona&&typeof d.conversationId==='string'&&!retired.has(d.conversationId)&&(!conversationId||d.conversationId===conversationId)){
   // Persist only the owner-checked opaque launch reference, never record facts or credentials.
   if(d.launchId&&/^[a-zA-Z0-9]{18}$/.test(d.launchId)&&d.launchId!==config.launch){
    const hash=new URLSearchParams(win.location.hash.replace(/^#/,''));hash.set('launch',d.launchId);
    try{win.history.replaceState(null,'','#'+hash);win.sessionStorage.setItem('adc.presenter.launch',d.launchId);config.launch=d.launchId;}catch{fail();return;}
   }
   conversationId=d.conversationId;verifiedConversation=conversationId;state='bound';publishBound();notify();
  }
  if(d.type==='ADC_RESTORED_ENDED'&&d.persona===persona&&!conversationId){conversationId=d.conversationId;state='ended';notify();}
  if(d.type==='ADC_CHECKS'&&state==='bound'&&d.checks?.conversationId===conversationId&&d.checks?.personaKey===persona)win.dispatchEvent(new win.CustomEvent('onADCYourChecks',{detail:d.checks}));
  if(d.type==='ADC_BINDING_ERROR'&&(!d.conversationId||d.conversationId===conversationId))fail();
  if(d.type==='ADC_CHECKS_UNAVAILABLE')win.dispatchEvent(new win.CustomEvent('onADCChecksUnavailable',{detail:{conversationId}}));
  if(d.type==='ADC_ENDED'&&d.conversationId===conversationId)finish();
  // A validated existing session may wait for a representative. Keep native chat
  // accessible, but do not authorize checks/actions from a non-Active status.
  if(d.type==='ADC_SESSION_PAUSED'&&d.persona===persona&&typeof d.conversationId==='string'&&!retired.has(d.conversationId)&&(!conversationId||d.conversationId===conversationId)&&state!=='ended'){
   conversationId=d.conversationId;verifiedConversation=conversationId;state='paused';notify();
  }
  // Compatibility with the previous presenter page: only a previously verified
  // conversation can leave the initial binding gate on this older message.
  if(d.type==='ADC_SESSION_WAITING'&&d.conversationId===conversationId&&['bound','paused','binding'].includes(state)){
   state=verifiedConversation===conversationId?'paused':'binding';notify();
  }
 }
 function started(e){
  if(!config||config.invalid)return;const id=e.detail?.conversationId;
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id)||retired.has(id))return;
  if(id===conversationId&&['bound','paused'].includes(state))return;
  if(conversationId&&conversationId!==id){retired.add(conversationId);verifiedConversation=null;}
  conversationId=id;state='binding';deadline=Date.now()+60000;send('ADC_CONVERSATION',{conversationId});notify();
 }
 function finish(){if(!conversationId)return;state='ended';send('ADC_SESSION_ENDED',{conversationId});notify();}
 function payload(e){try{const raw=e.detail?.conversationEntry?.entryPayload;return typeof raw==='string'?JSON.parse(raw):raw;}catch{return null;}}
 function ended(e){const p=payload(e),id=e.detail?.conversationId||p?.conversationIdentifier;if(id===conversationId)finish();}
 function opened(){if(config&&!config.invalid)send('ADC_RESUME');}
 function sessionStatus(e){
  const p=payload(e);if(p?.entryType!=='SessionStatusChanged')return;
  const id=e.detail?.conversationId||p.conversationIdentifier,status=String(p.sessionStatus).toUpperCase();
  if(status==='ENDED'&&id===conversationId){finish();return;}
  if(id===conversationId&&status==='WAITING'&&verifiedConversation===id&&['bound','paused','binding'].includes(state)){
   state='paused';send('ADC_RESUME');notify();return;
  }
  // Active/Waiting can arrive for a restored conversation without Started in
  // this tab. SSE IDs are only correlation; the server revalidates every bind.
  if(['ACTIVE','WAITING'].includes(status)&&typeof id==='string'&&!retired.has(id)){
   if(id===conversationId&&['bound','paused'].includes(state)){state='binding';deadline=Date.now()+60000;send('ADC_CONVERSATION',{conversationId});notify();}
   else started({detail:{conversationId:id}});
  }
 }
 win.addEventListener('message',onMessage);win.addEventListener('onEmbeddedMessagingConversationStarted',started);
 win.addEventListener('onEmbeddedMessagingConversationOpened',opened);
 win.addEventListener('onEmbeddedMessagingConversationClosed',ended);win.addEventListener('onEmbeddedMessagingSessionStatusUpdate',sessionStatus);
 if(config){if(config.invalid||!win.opener)state='error';else{send('ADC_HELLO');timer=win.setInterval(()=>{
  if(['waiting','connecting','binding'].includes(state)&&(Date.now()>deadline||win.opener.closed)){fail();return;}
  if(state==='waiting')send('ADC_HELLO');
  if(['prepared','bound','paused','ended'].includes(state)&&++heartbeat%8===0)send('ADC_HELLO');
  if(state==='binding')send('ADC_CONVERSATION',{conversationId});
 },1500);}}
 return {config,snapshot:()=>({state,conversationId}),begin:()=>{if(!['prepared','ended','bound','paused'].includes(state))throw Error('Presenter authorization required');if(!['bound','paused'].includes(state)){state='connecting';deadline=Date.now()+60000;notify();}},fail,subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},dispose:()=>{win.clearInterval(timer);win.removeEventListener('message',onMessage);win.removeEventListener('onEmbeddedMessagingConversationStarted',started);win.removeEventListener('onEmbeddedMessagingConversationOpened',opened);win.removeEventListener('onEmbeddedMessagingConversationClosed',ended);win.removeEventListener('onEmbeddedMessagingSessionStatusUpdate',sessionStatus);}};
}
