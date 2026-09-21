// Display-only projection delivered by the supported Salesforce CLT host event.
// No credentials, fetch, transcript parsing or customer-authorized writes here.
const allowedKeys=new Set(['phoneBluetooth','phoneProximity','sensorCommunication','mostRecentValidReading','localDisplay','cloudUpload','sensorLifecycle','sensorError','appCompatibility']);
const states=new Set(['UNAVAILABLE','STALE','CHECKING','CUSTOMER_CONFIRMED','VERIFIED','ATTENTION']);
const short=(v,n=250)=>typeof v==='string'&&v.length<=n?v:null;
export function parseChecks(raw,conversationId){
 if(raw?.schemaVersion!==1||!conversationId||raw.conversationId!==conversationId||!['HELEN','DANIEL','INGRID'].includes(raw.personaKey)||!Array.isArray(raw.checks)||raw.checks.length>9)return null;
 if(!Number.isFinite(Date.parse(raw.retrievedAt))||Date.parse(raw.retrievedAt)>Date.now()+60000||!short(raw.conclusion)||!short(raw.nextAction))return null;
 const seen=new Set(), rows=[];
 for(const row of raw.checks){
  if(!allowedKeys.has(row.key)||seen.has(row.key)||!states.has(row.state)||!short(row.label,80)||!short(row.text)||!['CUSTOMER_STATEMENT','RECORDED_OBSERVATION','UNAVAILABLE'].includes(row.sourceKind))return null;
  seen.add(row.key);
  const at=row.observedAt==null?null:Date.parse(row.observedAt);
  if(at!==null&&(!Number.isFinite(at)||at>Date.parse(raw.retrievedAt)))return null;
  const success=row.success===true&&['VERIFIED','CUSTOMER_CONFIRMED'].includes(row.state)&&at!==null;
  rows.push({key:row.key,label:row.label,text:row.text,state:row.state,success,observedAt:at,sourceKind:row.sourceKind,beforeContact:row.beforeContact===true&&at!==null});
 }
 return {conversationId,personaKey:raw.personaKey,retrievedAt:Date.parse(raw.retrievedAt),conclusion:raw.conclusion,nextAction:raw.nextAction,checks:rows,backgroundContinues:raw.backgroundContinues===true};
}
export function connectChecks(win,expectedPersona=null){
 let conversationId=null,card=null,ended=false;const retired=new Set(),listeners=new Set(),handlers=[];
 const publish=()=>{for(const f of listeners)f();};
 const on=(n,f)=>{win.addEventListener(n,f);handlers.push([n,f]);};
 on('onADCSessionBound',e=>{const id=e.detail?.conversationId;if(typeof id!=='string'||retired.has(id)||(expectedPersona&&e.detail?.personaKey!==expectedPersona))return;if(id!==conversationId){if(conversationId)retired.add(conversationId);conversationId=id;card=null;ended=false;publish();}});
 on('onADCChecksUnavailable',e=>{if(e.detail?.conversationId===conversationId){card=null;publish();}});
 on('onEmbeddedMessagingConversationStarted',e=>{
  const id=e.detail?.conversationId;if(typeof id!=='string'||retired.has(id)||id===conversationId)return;
  if(conversationId)retired.add(conversationId);conversationId=id;card=null;ended=false;publish();
 });
 on('onEmbeddedMessagingSessionStatusUpdate',e=>{
  let p;try{const raw=e.detail?.conversationEntry?.entryPayload;p=typeof raw==='string'?JSON.parse(raw):raw;}catch{return;}
  if(p?.entryType!=='SessionStatusChanged'||typeof p.conversationIdentifier!=='string'||retired.has(p.conversationIdentifier))return;
  if(conversationId&&conversationId!==p.conversationIdentifier)return;
  conversationId=p.conversationIdentifier;if(String(p.sessionStatus).toUpperCase()==='ENDED')ended=true;publish();
 });
 on('onEmbeddedMessagingConversationClosed',e=>{if(e.detail?.conversationId===conversationId){ended=true;publish();}});
 on('onADCYourChecks',e=>{
  if(ended)return;const next=parseChecks(e.detail,conversationId);
  if(!next||(expectedPersona&&next.personaKey!==expectedPersona)||card&&(next.personaKey!==card.personaKey||next.retrievedAt<=card.retrievedAt))return;
  card=next;publish();
 });
 return {snapshot:()=>({card,ended}),subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},dispose:()=>handlers.forEach(([n,f])=>win.removeEventListener(n,f))};
}
