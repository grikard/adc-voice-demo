import test from 'node:test';
import assert from 'node:assert/strict';
import {connectMessaging} from '../src/messaging.js';

function page(init = () => {}) {
 const win = new EventTarget();
 const scripts = [];
 const timers = new Map();
 let sequence = 0;
 win.setTimeout = callback => { timers.set(++sequence, callback); return sequence; };
 win.clearTimeout = id => timers.delete(id);
 win.embeddedservice_bootstrap = {settings: {}, init};
 const doc = {createElement: () => ({}), head: {appendChild: node => scripts.push(node)}};
 const buttonReady = () => {
  win.embeddedservice_bootstrap.utilAPI = {launchChat: () => Promise.resolve()};
  win.dispatchEvent(new Event('onEmbeddedMessagingButtonCreated'));
 };
 return {win, doc, scripts, timers, buttonReady};
}

test('repeated mounts and load events load/init once with the exact generated values', () => {
 const calls = [];
 const p = page((...args) => calls.push(args));
 const connection = connectMessaging(p.win, p.doc);
 assert.equal(connectMessaging(p.win, p.doc), connection);
 assert.equal(p.scripts.length, 1);
 assert.equal(p.scripts[0].src, 'https://hc1781018629519.my.site.com/ESWADCCustomerSupport1789923832906/assets/js/bootstrap.min.js');
 p.scripts[0].onload();
 p.scripts[0].onload();
 assert.equal(p.win.embeddedservice_bootstrap.settings.language, 'en_US');
 assert.deepEqual(calls, [[
  '00DgK00000R6wpv', 'ADC_Customer_Support',
  'https://hc1781018629519.my.site.com/ESWADCCustomerSupport1789923832906',
  {scrt2URL: 'https://hc1781018629519.my.salesforce-scrt.com'}
 ]]);
 assert.equal(connection.getStatus(), 'loading');
 p.win.dispatchEvent(new Event('onEmbeddedMessagingReady'));
 assert.equal(connection.getStatus(), 'loading');
 p.buttonReady();
 assert.equal(connection.getStatus(), 'ready');
 assert.equal(p.timers.size, 0);
});

test('fast readiness is retained for a later React subscriber', () => {
 const p = page(() => p.buttonReady());
 const connection = connectMessaging(p.win, p.doc);
 p.scripts[0].onload();
 assert.equal(connection.getStatus(), 'ready');
 let updates = 0;
 const unsubscribe = connection.subscribe(() => updates++);
 p.buttonReady();
 assert.equal(updates, 1);
 unsubscribe();
 p.buttonReady();
 assert.equal(updates, 1);
});

test('script load failure is visible, with no second load on remount', () => {
 const p = page();
 const connection = connectMessaging(p.win, p.doc);
 p.scripts[0].onerror();
 assert.equal(connection.getStatus(), 'error');
 connectMessaging(p.win, p.doc);
 assert.equal(p.scripts.length, 1);
 assert.equal(p.timers.size, 0);
});

test('both synchronous and asynchronous init failures are visible', async () => {
 for (const init of [() => {throw new Error('init failed');}, () => Promise.reject(new Error('init failed'))]) {
  const p = page(init);
  const connection = connectMessaging(p.win, p.doc);
  p.scripts[0].onload();
  await Promise.resolve();
  assert.equal(connection.getStatus(), 'error');
 }
});

test('missing readiness times out and late readiness recovers without reinitializing', () => {
 const p = page();
 const connection = connectMessaging(p.win, p.doc);
 p.scripts[0].onload();
 [...p.timers.values()][0]();
 assert.equal(connection.getStatus(), 'error');
 p.buttonReady();
 assert.equal(connection.getStatus(), 'ready');
 assert.equal(p.scripts.length, 1);
});

test('selected question waits for conversation load, then sends exactly once despite rapid clicks', async () => {
 const p = page();
 const connection = connectMessaging(p.win, p.doc);
 p.buttonReady();
 const sent = [];
 p.win.embeddedservice_bootstrap.utilAPI.sendTextMessage = async text => sent.push(text);
 const first = connection.launch('Can you check my replacement request?');
 assert.equal(connection.launch('another question'), first);
 await Promise.resolve();
 assert.equal(sent.length, 0);
 p.win.dispatchEvent(new Event('onEmbeddedMessagingConversationOpened'));
 await first;
 p.win.dispatchEvent(new Event('onEmbeddedMessagingFirstBotMessageSent'));
 assert.deepEqual(sent, ['Can you check my replacement request?']);
 assert.equal(p.timers.size, 0);
});

test('load event during launch is retained and existing conversations accept a new selection', async () => {
 const p = page(); const connection = connectMessaging(p.win, p.doc); p.buttonReady();
 const sent = [];
 p.win.embeddedservice_bootstrap.utilAPI = {
  launchChat: async () => p.win.dispatchEvent(new Event('onEmbeddedMessagingConversationOpened')),
  sendTextMessage: async text => sent.push(text)
 };
 await connection.launch("Why isn't my Libre connecting?");
 await connection.launch('What have the checks found so far?');
 assert.equal(sent.length, 2);
});

test('timeout and conversation closure discard pending context with no late send', async () => {
 for (const end of ['timeout', 'close']) {
  const p = page(); const connection = connectMessaging(p.win, p.doc); p.buttonReady();
  const sent = []; p.win.embeddedservice_bootstrap.utilAPI.sendTextMessage = async text => sent.push(text);
  const pending = connection.launch('question');
  const rejected = assert.rejects(pending, /context-not-sent/);
  if (end === 'timeout') [...p.timers.values()][0]();
  else p.win.dispatchEvent(new Event('onEmbeddedMessagingConversationClosed'));
  await rejected;
  p.win.dispatchEvent(new Event('onEmbeddedMessagingConversationOpened'));
  assert.equal(sent.length, 0); assert.equal(p.timers.size, 0);
 }
});

test('unsupported or failed sends surface errors without automatic retries', async () => {
 const p = page(); const connection = connectMessaging(p.win, p.doc); p.buttonReady();
 p.win.dispatchEvent(new Event('onEmbeddedMessagingConversationOpened'));
 await assert.rejects(connection.launch('question'), /context-not-sent/);
 let attempts = 0;
 p.win.embeddedservice_bootstrap.utilAPI.sendTextMessage = async () => { attempts++; throw new Error('network'); };
 await assert.rejects(connection.launch('question'), /context-unconfirmed/);
 assert.equal(attempts, 1);
});

test('ordinary launch sends no invented user prompt and never controls audio', async () => {
 const p = page(); const connection = connectMessaging(p.win, p.doc); p.buttonReady();
 let sent = 0; p.win.embeddedservice_bootstrap.utilAPI.sendTextMessage = async () => sent++;
 assert.deepEqual(await connection.launch(), {sent: false});
 assert.equal(sent, 0); assert.equal(p.timers.size, 0);
});

test('agent-ended session requires fresh conversation readiness for the next card', async () => {
 const p = page(); const connection = connectMessaging(p.win, p.doc); p.buttonReady();
 const sent = []; p.win.embeddedservice_bootstrap.utilAPI.sendTextMessage = async text => sent.push(text);
 p.win.dispatchEvent(new Event('onEmbeddedMessagingConversationOpened'));
 const ended = new Event('onEmbeddedMessagingSessionStatusUpdate');
 ended.detail = {conversationEntry: {entryPayload: JSON.stringify({entryType: 'SessionStatusChanged', sessionStatus: 'Ended'})}};
 p.win.dispatchEvent(ended);
 const pending = connection.launch('new question');
 await Promise.resolve(); assert.equal(sent.length, 0);
 p.win.dispatchEvent(new Event('onEmbeddedMessagingConversationOpened'));
 await pending; assert.deepEqual(sent, ['new question']);
});

test('failed launch cleans up its pending message and never sends later', async () => {
 const p = page(); const connection = connectMessaging(p.win, p.doc); p.buttonReady();
 let sent = 0;
 p.win.embeddedservice_bootstrap.utilAPI.launchChat = async () => { throw new Error('launch failed'); };
 p.win.embeddedservice_bootstrap.utilAPI.sendTextMessage = async () => sent++;
 await assert.rejects(connection.launch('question'), /launch failed/);
 p.win.dispatchEvent(new Event('onEmbeddedMessagingConversationOpened'));
 assert.equal(sent, 0); assert.equal(p.timers.size, 0);
});
