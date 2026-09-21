import test from 'node:test';import assert from 'node:assert/strict';import {readLaunch,connectPresenter} from '../src/presenterBridge.js';
const origin='https://hc1781018629519--c.vf.force.com',nonce='12345678-1234-1234-1234-123456789abc',cid='abcdef01-1234-1234-1234-123456789abc';
function fixture(){const events=new Map(),sent=[],outputs=[];const win={location:{hash:'#'+new URLSearchParams({launch:'a00000000000001AAA',nonce,presenterOrigin:origin})},opener:{postMessage:d=>sent.push(d)},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n),setInterval:()=>1,clearInterval:()=>{},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}},dispatchEvent:e=>outputs.push(e)};return {win,sent,outputs,emit:(n,e)=>events.get(n)?.(e)};}
test('rejects unapproved presenter origin and malformed launch',()=>{assert.equal(readLaunch(''),null);assert.equal(readLaunch('#launch=foo').invalid,true);assert.equal(readLaunch('#'+new URLSearchParams({launch:'a00000000000001AAA',nonce,presenterOrigin:'https://evil.test'})).invalid,true);});
test('requires exact opener origin nonce persona and conversation for checks',()=>{const f=fixture(),b=connectPresenter(f.win,'DANIEL');const send=d=>f.emit('message',{origin,source:f.win.opener,data:{nonce,...d}});
 f.emit('message',{origin:'https://evil.test',source:f.win.opener,data:{nonce,type:'ADC_LAUNCH_READY',persona:'DANIEL'}});assert.equal(b.snapshot().state,'waiting');
 send({type:'ADC_LAUNCH_READY',persona:'HELEN'});assert.equal(b.snapshot().state,'waiting');send({type:'ADC_LAUNCH_READY',persona:'DANIEL'});assert.equal(b.snapshot().state,'prepared');
 f.emit('onEmbeddedMessagingConversationStarted',{detail:{conversationId:cid}});assert.equal(b.snapshot().state,'binding');
 send({type:'ADC_BOUND',persona:'DANIEL',conversationId:cid});assert.equal(b.snapshot().state,'bound');
 send({type:'ADC_CHECKS',checks:{conversationId:cid,personaKey:'HELEN'}});assert.equal(f.outputs.filter(e=>e.type==='onADCYourChecks').length,0);
 send({type:'ADC_CHECKS',checks:{conversationId:cid,personaKey:'DANIEL'}});assert.equal(f.outputs.filter(e=>e.type==='onADCYourChecks').length,1);
 f.emit('onEmbeddedMessagingConversationStarted',{detail:{conversationId:'abcdef02-1234-1234-1234-123456789abc'}});assert.equal(b.snapshot().state,'binding');
 send({type:'ADC_CHECKS',checks:{conversationId:cid,personaKey:'DANIEL'}});assert.equal(f.outputs.filter(e=>e.type==='onADCYourChecks').length,1);b.dispose();});

test('a second conversation requires a new server acknowledgement and rejects retired messages',()=>{
 const f=fixture(),b=connectPresenter(f.win,'HELEN');const send=d=>f.emit('message',{origin,source:f.win.opener,data:{nonce,...d}});
 send({type:'ADC_LAUNCH_READY',persona:'HELEN'});b.begin();assert.equal(b.snapshot().state,'connecting');
 f.emit('onEmbeddedMessagingConversationStarted',{detail:{conversationId:cid}});send({type:'ADC_BOUND',persona:'HELEN',conversationId:cid});
 f.emit('onEmbeddedMessagingSessionStatusUpdate',{detail:{conversationEntry:{entryPayload:JSON.stringify({entryType:'SessionStatusChanged',conversationIdentifier:cid,sessionStatus:'Ended'})}}});
 assert.equal(b.snapshot().state,'ended');b.begin();assert.equal(b.snapshot().state,'connecting');
 const next='abcdef03-1234-1234-1234-123456789abc';f.emit('onEmbeddedMessagingConversationStarted',{detail:{conversationId:next}});
 send({type:'ADC_BOUND',persona:'HELEN',conversationId:cid});assert.equal(b.snapshot().state,'binding');
 send({type:'ADC_BOUND',persona:'HELEN',conversationId:next});assert.equal(b.snapshot().state,'bound');assert.equal(b.snapshot().conversationId,next);
 f.emit('onEmbeddedMessagingConversationClosed',{detail:{conversationId:cid}});assert.equal(b.snapshot().state,'bound');
});
test('page restoration requires the exact authenticated opener acknowledgement',()=>{
 const f=fixture(),b=connectPresenter(f.win,'INGRID');f.emit('message',{origin,source:f.win.opener,data:{nonce,type:'ADC_BOUND',persona:'INGRID',conversationId:cid}});
 assert.equal(b.snapshot().state,'bound');assert.equal(b.snapshot().conversationId,cid);
 assert.equal(f.outputs[0].type,'onADCSessionBound');
 f.emit('message',{origin,source:f.win.opener,data:{nonce,type:'ADC_CHECKS_UNAVAILABLE'}});assert.equal(b.snapshot().state,'bound');assert.equal(f.outputs.at(-1).type,'onADCChecksUnavailable');
});
test('ordinary URL never enables a conversation as Helen',()=>{
 const f=fixture();f.win.location.hash='';const b=connectPresenter(f.win,'HELEN');assert.equal(b.snapshot().state,'manual');assert.throws(()=>b.begin());
});
test('restored chat Opened carries no ID and only requests authenticated server revalidation',()=>{
 const f=fixture(),b=connectPresenter(f.win,'HELEN');
 f.emit('onEmbeddedMessagingConversationOpened',{detail:{}});
 assert.equal(f.sent.at(-1).type,'ADC_RESUME');assert.equal(b.snapshot().conversationId,null);assert.notEqual(b.snapshot().state,'bound');
 b.dispose();
});
test('SSE Active supplies restored correlation but never authorizes records without server acknowledgement',()=>{
 const f=fixture(),b=connectPresenter(f.win,'HELEN');
 const fire=status=>f.emit('onEmbeddedMessagingSessionStatusUpdate',{detail:{conversationId:cid,conversationEntry:{entryPayload:JSON.stringify({entryType:'SessionStatusChanged',sessionStatus:status})}}});
 fire('Active');assert.equal(b.snapshot().state,'binding');assert.equal(f.sent.at(-1).conversationId,cid);
 f.emit('message',{origin,source:f.win.opener,data:{nonce,type:'ADC_BOUND',persona:'HELEN',conversationId:cid}});
 assert.equal(b.snapshot().state,'bound');fire('Waiting');assert.equal(b.snapshot().state,'binding');
 fire('Ended');assert.equal(b.snapshot().state,'ended');
 b.dispose();
});
test('rollover acknowledgement persists only its authorized launch reference for page refresh',()=>{
 const f=fixture(),stored=new Map();let replaced;
 f.win.history={replaceState:(_a,_b,url)=>{replaced=url;}};f.win.sessionStorage={setItem:(k,v)=>stored.set(k,v)};
 const b=connectPresenter(f.win,'HELEN'),next='a00000000000002AAA';
 f.emit('message',{origin,source:f.win.opener,data:{nonce,type:'ADC_BOUND',persona:'HELEN',conversationId:cid,launchId:next}});
 assert.equal(b.snapshot().state,'bound');assert.equal(new URLSearchParams(replaced.slice(1)).get('launch'),next);
 assert.equal(stored.get('adc.presenter.launch'),next);assert.equal(b.config.launch,next);
});
