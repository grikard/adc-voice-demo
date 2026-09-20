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
 let timer;
 const listeners = new Set();
 const connection = {
  getStatus: () => status,
  subscribe(listener) {
   listeners.add(listener);
   return () => listeners.delete(listener);
  }
 };
 win[singletonKey] = connection;
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
