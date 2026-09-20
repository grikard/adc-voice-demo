import React, {useEffect, useState} from 'react';
import {durationLabel} from './measurements.js';

const unavailable = 'Unavailable';
function Metrics({measurement}) {
 return <dl className="measurement-grid">
  <div><dt>Conversation duration</dt><dd>{durationLabel(measurement?.durationMs)}</dd></div>
  <div><dt>Successful application actions</dt><dd>{measurement?.successfulActions ?? unavailable}</dd></div>
  <div><dt>Failed actions / retry attempts</dt><dd>{measurement?.failedActions ?? unavailable} / {measurement?.retryAttempts ?? unavailable}</dd></div>
  <div><dt>Diagnostic checks before contact</dt><dd>{measurement?.checksBeforeContact ?? unavailable}</dd></div>
  <div><dt>Latest verified business outcome</dt><dd>{measurement?.latestOutcome ?? unavailable}</dd></div>
  <div><dt>Time to first verified outcome</dt><dd>{durationLabel(measurement?.timeToFirstOutcomeMs)}</dd></div>
 </dl>;
}
export function MeasurementStrip({controller, personaKey}) {
 const [state, setState] = useState(() => controller.snapshot());
 useEffect(() => {
  controller.setPersona(personaKey);
  const sync = () => setState(controller.snapshot());
  const unsubscribe = controller.subscribe(sync);
  const timer = setInterval(sync, 1000); sync();
  return () => { unsubscribe(); clearInterval(timer); };
 }, [controller, personaKey]);
 function download() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state.finalSummary, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'adc-presenter-session-summary.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 return <aside className="measurement-strip" aria-label="Presenter measurements">
  <div className="measurement-heading"><strong>Presenter measurements</strong><span>{state.current ? state.current.ended ? 'Session observation finished' : 'Conversation in progress' : 'Waiting for a Salesforce session event'}</span></div>
  <Metrics measurement={state.current}/>
  <p className="measurement-note">{state.current?.timingSource ?? 'Timing unavailable until a supported start event arrives.'} · MM:SS includes waiting time; it is not audio talk time.</p>
  <p className="measurement-note">Business telemetry unavailable: no authenticated service connects execution receipts to this conversation. A reply or message is not proof of execution.</p>
  <details className="measurement-summary"><summary>Last session summary{state.finalSummary ? ` — ${state.finalSummary.reason}` : ' — Unavailable'}</summary>
   {state.finalSummary && <><Metrics measurement={state.finalSummary}/><p className="measurement-note">{['Page left', 'Persona changed', 'New session'].includes(state.finalSummary.reason) ? 'Partial observation; the Salesforce session was not confirmed ended.' : 'Observed session boundary.'} Summary stays in this browser tab; export to retain it.</p><button className="secondary" type="button" onClick={download}>Export summary</button></>}
  </details>
 </aside>;
}
