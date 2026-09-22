import test from 'node:test';
import assert from 'node:assert/strict';
import {nextStepModel, nextStepEnabled} from '../src/nextStep.js';
import {parseChecks, connectChecks} from '../src/checks.js';

const payload = (conversationId='a') => ({schemaVersion:1, personaKey:'DANIEL', conversationId,
 retrievedAt:new Date().toISOString(), conclusion:'Earlier sensor communication; current readings unknown.',
 nextAction:'Tell Alex the exact message shown in your app.', checks:[],
 customerReports:[{id:'r1',text:'I cannot see readings.',recordedAt:new Date(Date.now()-1000).toISOString(),source:'CUSTOMER_REPORTED',currentTelemetry:false}]});

test('unbound, ended and missing projections expose no prior report or next action', () => {
 const card=parseChecks(payload(),'a');
 for(const options of [{bound:false},{bound:true,ended:true}]) {
  const model=nextStepModel(card,options); assert.equal(model.available,false);assert.deepEqual(model.reports,[]);
  assert.notEqual(model.action,card.nextAction);
 }
 assert.equal(nextStepModel(null,{bound:true}).available,false);
});
test('unsupplied guidance and receipt fields cannot become an instruction or saved outcome', () => {
 const card=parseChecks({...payload(),guidance:{instructions:'untrusted procedure'},operationSucceeded:true},'a');
 const model=nextStepModel(card,{bound:true});assert.match(model.guidance,/not available/);
 assert.equal(model.operationSucceeded,undefined);assert.equal(model.explanation,card.conclusion);
 assert.equal(model.reports[0].text,'I cannot see readings.');
});
test('new conversation, unavailable projection and wrong persona never reuse previous next step', () => {
 const win=new EventTarget(),controller=connectChecks(win,'DANIEL');
 const fire=(type,detail)=>win.dispatchEvent(new CustomEvent(type,{detail}));
 fire('onADCSessionBound',{conversationId:'a',personaKey:'DANIEL'});fire('onADCYourChecks',payload());
 assert.equal(nextStepModel(controller.snapshot().card,{bound:true}).available,true);
 fire('onADCSessionBound',{conversationId:'b',personaKey:'DANIEL'});
 fire('onADCYourChecks',payload());fire('onADCYourChecks',{...payload('b'),personaKey:'HELEN'});
 assert.equal(controller.snapshot().card,null);
 fire('onADCYourChecks',payload('b'));fire('onADCChecksUnavailable',{conversationId:'b'});
 assert.equal(controller.snapshot().card,null);controller.dispose();
});
test('release disable wins over browser query; per-page opt-out is supported', () => {
 assert.equal(nextStepEnabled('',true),true);assert.equal(nextStepEnabled('?nextStep=0',true),false);
 assert.equal(nextStepEnabled('?nextStep=1',false),false);
});
