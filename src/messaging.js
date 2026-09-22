// Exact public deployment values from the Salesforce-generated snippet.
export const deployment = Object.freeze({
 orgId: '00DgK00000R6wpv',
 name: 'ADC_Customer_Support',
 siteUrl: 'https://hc1781018629519.my.site.com/ESWADCCustomerSupport1789923832906',
 scrt2URL: 'https://hc1781018629519.my.salesforce-scrt.com',
 bootstrapUrl: 'https://hc1781018629519.my.site.com/ESWADCCustomerSupport1789923832906/assets/js/bootstrap.min.js',
 language: 'en_US'
});

const singletonKey = Symbol.for('adc.customer.messaging');

// The page owns the bootstrap, independently of React mounts or repeated calls.
// A reload is the explicit retry after connection failure; never initialize twice.
export function connectMessaging(win = window, doc = document) {
 if (win[singletonKey]) return win[singletonKey];
 let status = 'loading';
 let initialized = false;
 let apiReady = false;
 let timer;
 let conversationLoaded = false;
 let pendingLaunch = null;
 let cancelWait = null;
 const listeners = new Set();
 const connection = {
  getStatus: () => status,
  isApiReady: () => apiReady,
  launch(question) {
   // Coalesce rapid clicks. Never queue a second message or retry a send.
   if (pendingLaunch) return pendingLaunch;
   pendingLaunch = openConversation(question).finally(() => { pendingLaunch = null; });
   return pendingLaunch;
  },
  subscribe(listener) {
   listeners.add(listener);
   return () => listeners.delete(listener);
  }
 };
 win[singletonKey] = connection;
 // Reset uses API readiness, independently of creation of the visible launcher.
 win.addEventListener('onEmbeddedMessagingReady', () => {
  apiReady = true;
  for (const listener of listeners) listener();
 });
 win.addEventListener('onEmbeddedMessagingConversationOpened', () => { conversationLoaded = true; });
 win.addEventListener('onEmbeddedMessagingFirstBotMessageSent', () => { conversationLoaded = true; });
 win.addEventListener('onEmbeddedMessagingConversationClosed', () => {
  conversationLoaded = false;
  cancelWait?.();
 });
 win.addEventListener('onEmbeddedMessagingSessionStatusUpdate', event => {
  try {
   const raw = event.detail?.conversationEntry?.entryPayload;
   const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
   if (payload?.entryType === 'SessionStatusChanged' && payload.sessionStatus?.toUpperCase() === 'ENDED') {
    conversationLoaded = false;
    cancelWait?.();
   }
  } catch { /* Ignore malformed lifecycle payloads. */ }
 });
 async function openConversation(question) {
  const api = win.embeddedservice_bootstrap?.utilAPI;
  if (status !== 'ready' || typeof api?.launchChat !== 'function') throw new Error('launch-unavailable');
  // Register before launch: the loaded event can precede the launch promise.
  let stopWaiting;
  const loaded = question && !conversationLoaded ? new Promise((resolve, reject) => {
   let waitTimer;
   const cleanup = () => {
    win.clearTimeout(waitTimer);
    win.removeEventListener('onEmbeddedMessagingConversationOpened', done);
    win.removeEventListener('onEmbeddedMessagingFirstBotMessageSent', done);
    cancelWait = null;
   };
   const done = () => { cleanup(); resolve(); };
   stopWaiting = () => { cleanup(); reject(new Error('context-not-sent')); };
   cancelWait = stopWaiting;
   win.addEventListener('onEmbeddedMessagingConversationOpened', done);
   win.addEventListener('onEmbeddedMessagingFirstBotMessageSent', done);
   waitTimer = win.setTimeout(stopWaiting, 30000);
  }) : Promise.resolve();
  // Handle rejection even if launching itself is still pending.
  loaded.catch(() => {});
  try { await api.launchChat(true); } catch (error) { stopWaiting?.(); throw error; }
  if (!question) return {sent: false};
  await loaded;
  if (!conversationLoaded || typeof api.sendTextMessage !== 'function') throw new Error('context-not-sent');
  try {
   // Supported API: the selected question becomes visible customer context.
   // A card selection supplies no identity, diagnosis, consent or write instruction.
   await api.sendTextMessage(question);
   return {sent: true};
  } catch { throw new Error('context-unconfirmed'); }
 }
 function update(next) {
  status = next;
  for (const listener of listeners) listener();
 }
 function fail() {
  win.clearTimeout(timer);
  update('error');
 }
 win.addEventListener('onEmbeddedMessagingButtonCreated', () => {
  if (typeof win.embeddedservice_bootstrap?.utilAPI?.launchChat !== 'function') return;
  win.clearTimeout(timer);
  // Hiding the native button is optional and must not disable a working launcher.
  try { win.embeddedservice_bootstrap.utilAPI.hideChatButton?.(); } catch {}
  update('ready');
 });
 timer = win.setTimeout(fail, 30000);
 const script = doc.createElement('script');
 script.id = 'adc-salesforce-bootstrap';
 script.type = 'text/javascript';
 script.src = deployment.bootstrapUrl;
 script.async = true;
 script.onerror = fail;
 script.onload = () => {
  if (initialized) return;
  initialized = true;
  try {
   const bootstrap = win.embeddedservice_bootstrap;
   bootstrap.settings.language = deployment.language;
   // Preserve the generated init arguments, including its 15-character org ID.
   Promise.resolve(bootstrap.init(
    deployment.orgId,
    deployment.name,
    deployment.siteUrl,
    {scrt2URL: deployment.scrt2URL}
   )).catch(fail);
  } catch { fail(); }
 };
 try { doc.head.appendChild(script); } catch { fail(); }
 return connection;
}
