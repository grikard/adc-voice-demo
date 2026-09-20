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
