import test from 'node:test';import assert from 'node:assert/strict';import {readLaunch,connectPresenter} from '../src/presenterBridge.js';
const origin='https://hc1781018629519--c.vf.force.com',nonce='12345678-1234-1234-1234-123456789abc',cid='abcdef01-1234-1234-1234-123456789abc';
function fixture(){const events=new Map(),sent=[],outputs=[];const win={location:{hash:'#'+new URLSearchParams({launch:'a00000000000001AAA',nonce,presenterOrigin:origin})},opener:{postMessage:d=>sent.push(d)},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n),setInterval:()=>1,clearInterval:()=>{},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail;}},dispatchEvent:e=>outputs.push(e)};return {win,sent,outputs,emit:(n,e)=>events.get(n)?.(e)};}
test('rejects unapproved presenter origin and malformed launch',()=>{assert.equal(readLaunch(''),null);assert.equal(readLaunch('#launch=foo').invalid,true);assert.equal(readLaunch('#'+new URLSearchParams({launch:'a00000000000001AAA',nonce,presenterOrigin:'https://evil.test'})).invalid,true);});
test('requires exact opener origin nonce persona and conversation for checks',()=>{const f=fixture(),b=connectPresenter(f.win,'DANIEL');const send=d=>f.emit('message',{origin,source:f.win.opener,data:{nonce,...d}});
 f.emit('message',{origin:'https://evil.test',source:f.win.opener,data:{nonce,type:'ADC_LAUNCH_READY',persona:'DANIEL'}});assert.equal(b.snapshot().state,'waiting');
 send({type:'ADC_LAUNCH_READY',persona:'HELEN'});assert.equal(b.snapshot().state,'waiting');send({type:'ADC_LAUNCH_READY',persona:'DANIEL'});assert.equal(b.snapshot().state,'prepared');
 f.emit('onEmbeddedMessagingConversationStarted',{detail:{conversationId:cid}});assert.equal(b.snapshot().state,'binding');
 send({type:'ADC_BOUND',persona:'DANIEL',conversationId:cid});assert.equal(b.snapshot().state,'bound');
 send({type:'ADC_CHECKS',checks:{conversationId:cid,personaKey:'HELEN'}});assert.equal(f.outputs.length,0);
 send({type:'ADC_CHECKS',checks:{conversationId:cid,personaKey:'DANIEL'}});assert.equal(f.outputs.length,1);
 f.emit('onEmbeddedMessagingConversationStarted',{detail:{conversationId:'abcdef02-1234-1234-1234-123456789abc'}});assert.equal(b.snapshot().state,'error');
 send({type:'ADC_CHECKS',checks:{conversationId:cid,personaKey:'DANIEL'}});assert.equal(f.outputs.length,1);b.dispose();});
