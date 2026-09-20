// Lifecycle only: documented Salesforce events, never messages/action-looking text.
// Business telemetry stays null until an authenticated, correlated backend exists.
const key = Symbol.for('adc.presenter.measurements');
const summaryKey = 'adc.presenter.last-summary.v1';
export const presenterMode = search => new URLSearchParams(search).get('presenter') === '1';
export function durationLabel(ms) {
 if (!Number.isFinite(ms) || ms < 0) return 'Unavailable';
 const seconds = Math.floor(ms / 1000);
 return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
const emptyTelemetry = () => ({successfulActions: null, failedActions: null, retryAttempts: null,
 checksBeforeContact: null, latestOutcome: null, timeToFirstOutcomeMs: null,
 successfulReads:null, committedWrites:null, replacementCreated:null, humanInvolvementRequired:null,
 voiceConnectionMs:null, voiceDurationMs:null, endingReason:null});
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(id);
// Salesforce's session schema uses epoch timestamps; accept seconds and milliseconds.
function epoch(value) {
 if (!Number.isFinite(value) || value <= 0) return null;
 const ms = value < 1e12 ? value * 1000 : value;
 return ms >= Date.UTC(2020, 0, 1) && ms <= Date.UTC(2100, 0, 1) ? ms : null;
}
export function createMeasurements(win, personaKey, now = () => Date.now()) {
 let current = null, finalSummary = null, pendingLaunchAt = null;
 const listeners = new Set(), handlers = [], retiredConversations = new Set(), retiredSessions = new Set();
 // Only a whitelisted timing summary is restored. Business receipts are never trusted
 // from browser storage, URL parameters, custom DOM events, or manual presenter entry.
 try {
  const saved = JSON.parse(win.sessionStorage.getItem(summaryKey));
  if (saved?.version === 1 && ['Ended', 'Conversation closed', 'New session', 'Persona changed', 'Page left'].includes(saved.reason)
      && (saved.durationMs === null || (Number.isFinite(saved.durationMs) && saved.durationMs >= 0))) {
   finalSummary = {version: 1, reason: saved.reason, durationMs: saved.durationMs,
    totalElapsedMs:Number.isFinite(saved.totalElapsedMs)&&saved.totalElapsedMs>=0?saved.totalElapsedMs:null,
    conversationId:validId(saved.conversationId)?saved.conversationId:null,
    sessionId:validId(saved.sessionId)?saved.sessionId:null,
    timingSource: 'Previously observed in this tab', ...emptyTelemetry()};
  }
 } catch {}
 const publish = () => { for (const listener of listeners) listener(); };
 const elapsed = () => current?.start == null || (current.ended && current.end == null) || (current.end ?? now()) < current.start
  ? null : (current.end ?? now()) - current.start;
 function finish(reason, end = now()) {
  if (!current || current.ended) return;
  current.end = current.start != null && end >= current.start ? end : null;
  current.ended = true;
  finalSummary = {version: 1, reason, durationMs: current.end == null ? null : elapsed(),
   totalElapsedMs:current.launchAt==null?null:Math.max(0,now()-current.launchAt),
   conversationId:current.conversationId,sessionId:current.sessionId,personaKey,
   timingSource: current.timingSource, ...emptyTelemetry()};
  try { win.sessionStorage.setItem(summaryKey, JSON.stringify(finalSummary)); } catch {}
 }
 function begin(conversationId, sessionId = null, start = null, source = 'Start time unavailable') {
  if (current && !current.ended) finish('New session');
  if (current?.conversationId && current.conversationId !== conversationId) retiredConversations.add(current.conversationId);
  if (current?.sessionId) retiredSessions.add(current.sessionId);
  current = {conversationId, sessionId, start, launchAt:pendingLaunchAt, timingSource: source, ended: false, end: null, ...emptyTelemetry()};
  pendingLaunchAt=null;
 }
 function listen(name, handler) {
  win.addEventListener(name, handler); handlers.push([name, handler]);
 }
 listen('onEmbeddedMessagingConversationStarted', event => {
  const id = event.detail?.conversationId;
  if (!validId(id) || retiredConversations.has(id) || current?.conversationId === id) return;
  begin(id, null, now(), 'Observed conversation-start event'); publish();
 });
 listen('onEmbeddedMessagingSessionStatusUpdate', event => {
  const detail = event.detail;
  let payload;
  try {
   const raw = detail?.conversationEntry?.entryPayload;
   payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch { return; }
  if (!payload || payload.entryType !== 'SessionStatusChanged' || !validId(payload.sessionId)
      || !validId(payload.conversationIdentifier)) return;
  const id = payload.conversationIdentifier;
  if (retiredConversations.has(id) || retiredSessions.has(payload.sessionId)) return;
  if (detail.conversationId && detail.conversationId !== id) return;
  const status = String(payload.sessionStatus).toUpperCase();
  if (!['NEW', 'WAITING', 'ACTIVE', 'INACTIVE', 'ENDED'].includes(status)) return;
  const start = epoch(payload.sessionStartTime), end = epoch(payload.sessionEndTime);
  // Ignore delayed status for an old conversation; only Started can switch an
  // already tracked conversation. A restored page can attach from status alone.
  if (current && current.conversationId !== id) return;
  if (current?.sessionId && current.sessionId !== payload.sessionId) {
   if (status === 'ENDED' || (start != null && current.start != null && start < current.start)) return;
   begin(id, payload.sessionId, start, start == null ? 'Start time unavailable' : 'Salesforce session timestamps');
  } else if (!current) {
   begin(id, payload.sessionId, start, start == null ? 'Start time unavailable' : 'Salesforce session timestamps');
  } else {
   if (current.ended) return;
   current.sessionId = payload.sessionId;
   if (start != null) { current.start = start; current.timingSource = 'Salesforce session timestamps'; }
  }
  if (status === 'ENDED') finish('Ended', end ?? now());
  publish();
 });
 listen('onEmbeddedMessagingConversationClosed', event => {
  if (!current || event.detail?.conversationId !== current.conversationId) return;
  finish('Conversation closed'); publish();
 });
 // Closing/minimizing the widget is NOT ending a conversation.
 listen('pagehide', () => { finish('Page left'); publish(); });
 listen('pageshow', event => {
  // Back/forward cache restoration must not resume an interrupted clock using
  // a guessed session start. Wait for a supported session event again.
  if (event.persisted) { current = null; pendingLaunchAt=null; publish(); }
 });
 return {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  markLaunch() { if((!current||current.ended)&&pendingLaunchAt==null)pendingLaunchAt=now(); },
  snapshot() { return {current: current && {...current, durationMs: elapsed(),totalElapsedMs:current.launchAt==null?null:current.ended?finalSummary?.totalElapsedMs:Math.max(0,now()-current.launchAt)}, finalSummary}; },
  setPersona(next) {
   if (next === personaKey) return;
   finish('Persona changed');
   if (current) retiredConversations.add(current.conversationId);
   current = null; pendingLaunchAt=null; personaKey = next; publish();
  },
  dispose() { for (const [name, handler] of handlers) win.removeEventListener(name, handler); listeners.clear(); }
 };
}
export function connectMeasurements(personaKey, win = window) {
 if (!win[key]) win[key] = createMeasurements(win, personaKey);
 win[key].setPersona(personaKey);
 return win[key];
}
