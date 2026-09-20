import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeasurements, connectMeasurements, durationLabel, presenterMode} from '../src/measurements.js';
test('launch duration includes connection wait, freezes at end and never merges a new session',()=>{
 const p=harness();p.controller.markLaunch();p.advance(5000);p.start('launch-one');p.advance(10000);
 assert.equal(p.controller.snapshot().current.totalElapsedMs,15000);
 p.controller.markLaunch();p.emit('onEmbeddedMessagingConversationClosed',{conversationId:'launch-one'});p.advance(3000);
 assert.equal(p.controller.snapshot().finalSummary.totalElapsedMs,15000);
 assert.equal(p.controller.snapshot().finalSummary.conversationId,'launch-one');
 assert.equal(p.controller.snapshot().finalSummary.successfulReads,null);
 p.controller.markLaunch();p.advance(2000);p.start('launch-two');
 assert.equal(p.controller.snapshot().current.totalElapsedMs,2000);
 p.controller.setPersona('INGRID');p.start('launch-three');
 assert.equal(p.controller.snapshot().current.totalElapsedMs,null);
});
function harness() {
 const win = new EventTarget(), storage = new Map();
 win.sessionStorage = {getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v)};
 let time = Date.UTC(2026, 8, 20);
 const controller = createMeasurements(win, 'HELEN', () => time);
 const emit = (name, detail) => win.dispatchEvent(new CustomEvent(name, {detail}));
 return {win, controller, storage, emit, advance: ms => time += ms, now: () => time,
  start: id => emit('onEmbeddedMessagingConversationStarted', {conversationId: id}),
  status: (id, sessionId, status, start, end) => emit('onEmbeddedMessagingSessionStatusUpdate', {conversationId: id,
   conversationEntry: {entryPayload: JSON.stringify({entryType: 'SessionStatusChanged', conversationIdentifier: id,
    sessionId, sessionStatus: status, sessionStartTime: start, sessionEndTime: end})}})};
}
test('presenter mode is explicit, durations are MM:SS, missing values stay unavailable', () => {
 assert.equal(presenterMode(''), false); assert.equal(presenterMode('?presenter=0'), false);
 assert.equal(presenterMode('?presenter=1'), true);
 assert.equal(durationLabel(null), 'Unavailable'); assert.equal(durationLabel(61001), '01:01');
 const p = harness(); assert.equal(p.controller.snapshot().current, null);
});
test('duplicate starts, messages, delivery and window close never count actions or stop duration', () => {
 const p = harness(); p.start('conversation-1'); p.advance(65000); p.start('conversation-1');
 for (const name of ['onEmbeddedMessageSent','onEmbeddedMessageDelivered','onEmbeddedMessagingWindowClosed','onEmbeddedMessagingWindowMinimized']) p.emit(name, {text: 'Success! Replacement requested.'});
 const s = p.controller.snapshot().current;
 assert.equal(s.durationMs,65000); assert.equal(s.ended,false);
 for (const field of ['successfulActions','failedActions','retryAttempts','checksBeforeContact','latestOutcome','timeToFirstOutcomeMs']) assert.equal(s[field],null);
});
test('documented session payload uses server start/end and retains a final summary', () => {
 const p = harness(), start = p.now()/1000;
 p.start('conversation-1'); p.status('conversation-1','session-1','ACTIVE',start);
 p.advance(90000); p.status('conversation-1','session-1','ENDED',start,start+80);
 p.advance(60000); const s=p.controller.snapshot();
 assert.equal(s.current.durationMs,80000); assert.equal(s.finalSummary.durationMs,80000);
 assert.equal(s.finalSummary.reason,'Ended'); assert.equal(s.finalSummary.timeToFirstOutcomeMs,null);
 const restored=createMeasurements(p.win,'HELEN'); assert.equal(restored.snapshot().current,null);
 assert.equal(restored.snapshot().finalSummary.durationMs,80000); restored.dispose();
});
test('new session resets, duplicate and old session events cannot end the new measurement', () => {
 const p=harness(), start=p.now()/1000;
 p.status('conversation-1','session-1','ACTIVE',start); p.advance(20000);
 p.status('conversation-1','session-1','ENDED',start,start+20); p.advance(20000);
 p.status('conversation-1','session-2','ACTIVE',start+40); p.advance(10000);
 p.status('conversation-1','session-1','ENDED',start,start+20);
 assert.equal(p.controller.snapshot().current.sessionId,'session-2');
 assert.equal(p.controller.snapshot().current.durationMs,10000);
 p.start('conversation-2'); p.emit('onEmbeddedMessagingConversationClosed',{conversationId:'conversation-1'});
 assert.equal(p.controller.snapshot().current.ended,false);
});
test('persona changes clear measurements and quarantine the previous conversation', () => {
 const p=harness(); p.start('conversation-1'); p.advance(12000); p.controller.setPersona('DANIEL');
 assert.equal(p.controller.snapshot().current,null); assert.equal(p.controller.snapshot().finalSummary.reason,'Persona changed');
 p.start('conversation-1'); p.status('conversation-1','old-session','ACTIVE',p.now()/1000);
 assert.equal(p.controller.snapshot().current,null); p.start('conversation-2');
 assert.equal(p.controller.snapshot().current.durationMs,0);
});
test('restored conversation without known start, malformed payload and unknown status fail closed', () => {
 const p=harness(); p.emit('onEmbeddedMessagingConversationOpened',{});
 p.emit('onEmbeddedMessagingSessionStatusUpdate',{conversationEntry:{entryPayload:'invalid'}});
 p.status('conversation-1','session-1','NOT_REAL',p.now()/1000);
 assert.equal(p.controller.snapshot().current,null);
 p.status('conversation-1','session-1','ACTIVE',undefined);
 assert.equal(p.controller.snapshot().current.durationMs,null);
});
test('conversation closure matches its ID; leaving page is an explicitly partial summary', () => {
 const p=harness(); p.start('conversation-1'); p.advance(2000);
 p.emit('onEmbeddedMessagingConversationClosed',{conversationId:'other'});
 assert.equal(p.controller.snapshot().current.ended,false);
 p.emit('onEmbeddedMessagingConversationClosed',{conversationId:'conversation-1'});
 assert.equal(p.controller.snapshot().finalSummary.durationMs,2000);
 p.start('conversation-2'); p.advance(1000); p.emit('pagehide',{});
 assert.equal(p.controller.snapshot().finalSummary.reason,'Page left');
});
test('storage cannot inject verified metrics; singleton avoids duplicate subscriptions', () => {
 const p=harness(); p.storage.set('adc.presenter.last-summary.v1',JSON.stringify({version:1,reason:'Ended',durationMs:3000,successfulActions:42,latestOutcome:'fake'}));
 const store=connectMeasurements('HELEN',p.win);
 assert.equal(connectMeasurements('HELEN',p.win),store);
 assert.equal(store.snapshot().finalSummary.successfulActions,null); assert.equal(store.snapshot().finalSummary.latestOutcome,null);
 store.dispose();
});
test('back/forward restoration waits for evidence and retains an unavailable final summary', () => {
 const p=harness(); p.status('conversation-1','session-1','ACTIVE',undefined);
 p.emit('pagehide',{});
 const restored=createMeasurements(p.win,'HELEN');
 assert.equal(restored.snapshot().finalSummary.durationMs,null); restored.dispose();
 const event=new Event('pageshow'); event.persisted=true; p.win.dispatchEvent(event);
 assert.equal(p.controller.snapshot().current,null);
 assert.equal(p.controller.snapshot().finalSummary.reason,'Page left');
});
