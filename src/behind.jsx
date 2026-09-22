import React from 'react';
import {createRoot} from 'react-dom/client';
import './behind.css';

export function BehindExperience() {
  return <><header className="behind-header"><span>Libre support · Presenter companion</span><strong>For Abbott review</strong></header>
    <main className="behind-main" id="main"><p className="behind-eyebrow">ILLUSTRATIVE DESIGN · NO LIVE CUSTOMER DATA</p>
      <h1>Behind this experience</h1>
      <p className="behind-intro">The experience can adapt its layout and conversation while preserving designated instructions, confirmations, and action controls.</p>
      <p>This separate page explains the architecture. It does not connect to Salesforce, receive customer records, or control an open conversation.</p>
      <div className="behind-sections">
        <section><span className="behind-number" aria-hidden="true">01</span><h2>Context used</h2><span className="behind-label">Illustrative design</span><p>The authenticated presenter launcher binds a conversation to its permitted support context. A persona name or page URL does not authorize record access.</p><p>Bluetooth, sensor communication, app readings, cloud upload, lifecycle and error findings remain separate. Earlier observations keep their original time; customer reports do not overwrite them.</p><p><strong>Live bound persona and evidence:</strong> Not available on this static page.</p></section>
        <section><span className="behind-number" aria-hidden="true">02</span><h2>Guidance selected</h2><span className="behind-label">Not available</span><p>The customer page’s current checks contract contains no matched procedure, source revision or publication status. It therefore displays no troubleshooting instructions.</p><p>Existing backend guidance selection checks product, app, market, language and recorded publication applicability. Public manufacturer references are not described as Abbott MLR approved.</p><p><strong>Required wording:</strong> Connected, applicable instructions must retain their stored wording and warnings. No illustrative procedure or German translation is supplied here.</p></section>
        <section><span className="behind-number" aria-hidden="true">03</span><h2>Interaction evidence</h2><span className="behind-label">Illustrative design</span><p>The customer card can display the authorized checks and saved report projection. It cannot prove that a customer read or understood the content.</p><p>Opening chat or sending a message is not a saved backend action. Correlated action receipts and persisted records are required to verify an update. Those receipts are not available on this static page.</p><p>A saved request, queue wait, accepted text conversation and continuous human audio are separate results.</p></section>
      </div>
      <section className="behind-legend"><h2>How to read the evidence</h2><dl>
        <dt>Verified in this session</dt><dd>Use only for a result supported by the actual correlated session evidence. Nothing on this illustration carries that status.</dd>
        <dt>Recorded earlier</dt><dd>Retained source evidence with its original observation time; not a new current confirmation.</dd>
        <dt>Illustrative design</dt><dd>An explanation or proposed presentation, without a live customer outcome.</dd>
        <dt>Not available</dt><dd>The necessary evidence or applicable content has not been provided.</dd>
      </dl></section>
      <aside><strong>For Abbott review</strong><p>Proposed governance presentation; no regulatory compliance claim and no claim that this design eliminates MLR review. German voice, German-market guidance and human audio continuity remain pending verification.</p></aside>
      <p>Return to your existing customer tab to continue. Opening this companion does not start or end messaging.</p>
    </main></>;
}
if (typeof document !== 'undefined') createRoot(document.getElementById('root')).render(<BehindExperience/>);
