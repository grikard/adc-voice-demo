import test from 'node:test';import assert from 'node:assert/strict';
import {parseChecks,connectChecks} from '../src/checks.js';
const card=(extra={})=>({schemaVersion:1,conversationId:'conv-1',personaKey:'HELEN',retrievedAt:new Date().toISOString(),conclusion:'Last recorded checks',nextAction:'Ask about readings',checks:[{key:'phoneBluetooth',label:'Bluetooth',text:'On — confirmed by you',state:'CUSTOMER_CONFIRMED',success:true,sourceKind:'CUSTOMER_STATEMENT',observedAt:new Date(Date.now()-1000).toISOString(),beforeContact:true}],...extra});
test('rejects other conversation and missing/invalid scope',()=>{assert.equal(parseChecks(card(),'conv-2'),null);assert.equal(parseChecks(card({personaKey:'OTHER'}),'conv-1'),null);assert.equal(parseChecks(card(),null),null);});
test('keeps original times, source and precontact distinction; projects away internal fields',()=>{const input=card({caseId:'private',address:'private'}),out=parseChecks(input,'conv-1');assert.equal(out.checks[0].sourceKind,'CUSTOMER_STATEMENT');assert.equal(out.checks[0].beforeContact,true);assert.equal(out.checks[0].observedAt,Date.parse(input.checks[0].observedAt));assert.equal(out.caseId,undefined);assert.equal(out.address,undefined);});
test('unknown/checking/stale never render success even with contradictory success flag',()=>{for(const state of ['UNAVAILABLE','CHECKING','STALE','ATTENTION']){const input=card();input.checks[0].state=state;assert.equal(parseChecks(input,'conv-1').checks[0].success,false);}});
test('rejects duplicate fields, future evidence and malformed records',()=>{let input=card();input.checks.push(input.checks[0]);assert.equal(parseChecks(input,'conv-1'),null);input=card();input.checks[0].observedAt='2099-01-01';assert.equal(parseChecks(input,'conv-1'),null);assert.equal(parseChecks(card({checks:[{}]}),'conv-1'),null);});
test('reported updates retain provenance without changing telemetry or exposing staff scope',()=>{
 const input=card({customerReports:[{id:'report1',text:'Readings visible again',recordedAt:new Date(Date.now()-500).toISOString(),source:'CUSTOMER_REPORTED',currentTelemetry:false,caseId:'private',sessionId:'private'}]});
 input.checks[0].state='STALE';input.checks[0].success=false;
 const result=parseChecks(input,'conv-1');assert.equal(result.checks[0].success,false);assert.equal(result.customerReports[0].text,'Readings visible again');assert.equal(result.customerReports[0].caseId,undefined);
 assert.equal(parseChecks(input,'retired-conversation'),null);
 input.customerReports[0].currentTelemetry=true;assert.equal(parseChecks(input,'conv-1'),null);
});
test('new conversations clear old results and ended summaries ignore late updates',()=>{
 const win=new EventTarget();const c=connectChecks(win);const fire=(name,detail)=>win.dispatchEvent(new CustomEvent(name,{detail}));
 fire('onADCYourChecks',card());assert.equal(c.snapshot().card,null);
 fire('onEmbeddedMessagingConversationStarted',{conversationId:'conv-1'});fire('onADCYourChecks',card());assert.ok(c.snapshot().card);
 fire('onEmbeddedMessagingConversationClosed',{conversationId:'conv-1'});assert.equal(c.snapshot().ended,true);const prior=c.snapshot().card;
 fire('onADCYourChecks',card({conclusion:'Changed'}));assert.equal(c.snapshot().card,prior);
 fire('onEmbeddedMessagingConversationStarted',{conversationId:'conv-2'});assert.equal(c.snapshot().card,null);assert.equal(c.snapshot().ended,false);
 fire('onADCYourChecks',card());assert.equal(c.snapshot().card,null);c.dispose();
});
