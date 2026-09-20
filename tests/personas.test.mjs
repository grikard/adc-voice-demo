import test from 'node:test';
import assert from 'node:assert/strict';
import {readRoute,personaHref,personas,prepareExperience,personaStorageKey} from '../src/personas.js';
import {connectChecks} from '../src/checks.js';
import {connectMessaging} from '../src/messaging.js';
import {clearCustomerSession} from '../src/sessionReset.js';
function browser(value){const data=new Map(value?[[personaStorageKey,value]]:[]);return {localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},navigator:{locks:{request:async(_,fn)=>fn()}}};}
test('root and every direct persona link resolve exactly; unknown/duplicate keys have no Helen fallback',()=>{
 assert.equal(readRoute('').kind,'landing');
 for(const id of Object.keys(personas)){assert.equal(readRoute(personaHref(id)).id,id);assert.equal(readRoute(personaHref(id,true)).id,id);}
 for(const query of ['?persona=other','?persona=','?persona=HELEN','?persona=helen&persona=daniel','?persona=__proto__'])assert.equal(readRoute(query).kind,'unknown');
 assert.equal(personas.daniel.enabled,false);assert.equal(personas.ingrid.enabled,false);assert.equal(personas.ingrid.language,'de');
});
test('switch awaits confirmed clearing before recording new experience; refresh preserves same experience',async()=>{
 const win=browser('helen');let release,calls=0;
 const pending=prepareExperience(win,'daniel',()=>{calls++;return new Promise(r=>release=r);});
 assert.equal(win.localStorage.getItem(personaStorageKey),'helen');release();assert.deepEqual(await pending,{reload:true});
 assert.equal(win.localStorage.getItem(personaStorageKey),'daniel');
 assert.deepEqual(await prepareExperience(win,'daniel',()=>{calls++;}),{reload:false});assert.equal(calls,1);
});
test('unknown legacy session must clear before first customer, but fresh landing loads without Salesforce',async()=>{
 const win=browser();let clears=0;const clear=async()=>{clears++;};
 assert.deepEqual(await prepareExperience(win,'landing',clear),{reload:false});assert.equal(clears,0);
 assert.deepEqual(await prepareExperience(win,'helen',clear),{reload:true});assert.equal(clears,1);
 await prepareExperience(win,'landing',clear);assert.equal(clears,2);
});
test('failed reset and unavailable storage/locking fail closed, leaving persona marker unchanged',async()=>{
 const win=browser('helen');await assert.rejects(prepareExperience(win,'daniel',async()=>{throw Error('reset');}));assert.equal(win.localStorage.getItem(personaStorageKey),'helen');
 await assert.rejects(prepareExperience({...win,navigator:{}},'daniel',async()=>{}));
 await assert.rejects(prepareExperience({...win,localStorage:{getItem:()=>{throw Error('disabled');}}},'daniel',async()=>{}));
});
test('Daniel page rejects Helen checks even with matching conversation ID',()=>{
 const win=new EventTarget(),c=connectChecks(win,'DANIEL');
 win.dispatchEvent(new CustomEvent('onEmbeddedMessagingConversationStarted',{detail:{conversationId:'current'}}));
 const payload={schemaVersion:1,conversationId:'current',personaKey:'HELEN',retrievedAt:new Date().toISOString(),conclusion:'Private Helen fact',nextAction:'Next',checks:[]};
 win.dispatchEvent(new CustomEvent('onADCYourChecks',{detail:payload}));assert.equal(c.snapshot().card,null);
 win.dispatchEvent(new CustomEvent('onADCYourChecks',{detail:{...payload,personaKey:'DANIEL',conclusion:'Daniel fact'}}));assert.equal(c.snapshot().card.personaKey,'DANIEL');c.dispose();
});
function resetPage(clear){
 const win=new EventTarget();win.setTimeout=setTimeout;win.clearTimeout=clearTimeout;
 const calls=[];win.embeddedservice_bootstrap={settings:{},init(){},userVerificationAPI:{clearSession:clear},utilAPI:{launchChat(){},removeAllComponents(){calls.push('removed');}}};
 const doc={createElement:()=>({}),head:{appendChild(){}}};connectMessaging(win,doc);win.dispatchEvent(new Event('onEmbeddedMessagingButtonCreated'));return {win,doc,calls};
}
test('uses supported clearSession then removes components only after resolved reset',async()=>{
 let release;const p=resetPage(()=>new Promise(r=>release=r));const work=clearCustomerSession(p.win,p.doc);await Promise.resolve();assert.deepEqual(p.calls,[]);release();await work;assert.deepEqual(p.calls,['removed']);
});
test('reset rejection or missing completion never removes components or claims success',async()=>{
 for(const clear of [()=>Promise.reject(Error('failed')),()=>undefined]){const p=resetPage(clear);await assert.rejects(clearCustomerSession(p.win,p.doc));assert.deepEqual(p.calls,[]);}
});
