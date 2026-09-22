import React from 'react';
import {nextStepModel} from './nextStep.js';
import './YourNextStep.css';

export function YourNextStep({card, bound, ended, disabled, onConversation}) {
  const view = nextStepModel(card, {bound, ended});
  const [help, setHelp] = React.useState(false);
  React.useEffect(() => setHelp(false), [card?.conversationId, bound, ended]);
  return <section className="next-step" aria-labelledby="next-step-title">
    <p className="next-step-kicker">ONE STEP AT A TIME</p>
    <h2 id="next-step-title">Your next step</h2>
    <p className="next-step-explanation">{view.explanation}</p>
    {view.available && <>
      {view.reports.length > 0 && <div className="next-step-report">
        <strong><span aria-hidden="true">◌ </span>Your latest reported update</strong>
        <p>{view.reports.at(-1).text}</p>
        <small>Customer reported · recorded {new Date(view.reports.at(-1).recordedAt).toLocaleString()}. This does not replace recorded checks or verify recovery.</small>
      </div>}
      <div className="next-step-guidance"><strong>Guidance · not available here</strong><p>{view.guidance}</p></div>
    </>}
    <div className="next-step-action"><strong>{view.askAboutReadings ? 'Are readings appearing in your app now?' : view.action}</strong>
      {view.available && <p>{view.askAboutReadings ? 'Tell Alex “yes” or “not yet” in the conversation. Your answer is a customer report; recovery needs the required evidence and confirmation.' : 'Continue with Alex in the conversation. Any requested update needs a confirmed saved result.'}</p>}
    </div>
    {view.available && <div className="next-step-controls">
      <button type="button" disabled={disabled} onClick={onConversation}>Continue with Alex</button>
      <button type="button" className="next-step-help" disabled={disabled} aria-expanded={help} aria-controls="next-step-human" onClick={() => setHelp(!help)}>Get help from a person</button>
    </div>}
    {help && view.available && <p id="next-step-human" role="status">Ask Alex for a person in the conversation. This button has not sent or saved a request. A saved request or a waiting message does not mean a representative has connected.</p>}
  </section>;
}
