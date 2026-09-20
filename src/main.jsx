import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {connectMessaging} from './messaging.js';
import {connectMeasurements, presenterMode} from './measurements.js';
import {MeasurementStrip} from './MeasurementStrip.jsx';
import './styles.css';

// Presentation mode is display-only, never authorization for privileged telemetry.
// Attach listeners before the Salesforce bootstrap can emit lifecycle events.
const personaKey = 'HELEN';
const measurements = presenterMode(window.location.search) ? connectMeasurements(personaKey) : null;

function App(){
 const [ready,setReady]=useState(false);
 const [launching,setLaunching]=useState(false);
 const launchingRef=useRef(false);
 const [large,setLarge]=useState(false);
 const [status,setStatus]=useState('Connecting to support…');
 const [error,setError]=useState(false);
 useEffect(()=>{
  const connection=connectMessaging();
  const sync=()=>{
   const current=connection.getStatus();
   setReady(current==='ready');setError(current==='error');
   setStatus(current==='ready' ? 'Choose voice or typing in the conversation.' : current==='error'
    ? 'We could not connect to support. Check your connection, then reload this page to try again.'
    : 'Connecting to support…');
  };
  const unsubscribe=connection.subscribe(sync);
  sync();
  return unsubscribe;
 },[]);
 useEffect(()=>{document.body.classList.toggle('large-text',large);},[large]);
 async function launch(mode,question){
  if(launchingRef.current)return;
  if(!ready || !window.embeddedservice_bootstrap?.utilAPI?.launchChat){
   setError(true);setStatus('The conversation is unavailable right now. Please try again later.');return;
  }
  launchingRef.current=true;setLaunching(true);setError(false);setStatus('Opening your conversation…');
  try{
   // Opens the native conversation. This does not start audio or authenticate Helen.
   await connectMessaging().launch(question);
   setStatus(question ? `Your question was sent: "${question}" Choose the voice control to speak with your assistant.` : mode==='voice' ? 'Choose the voice control in the conversation, then allow microphone access when asked.' : 'You can type your question in the conversation.');
  }catch{
   setError(true);setStatus(question ? `We could not confirm that your question was sent. Check the conversation before trying again: "${question}"` : 'We could not open the conversation. Please try again later.');
  }finally{launchingRef.current=false;setLaunching(false);}
 }
 return <>
<a className="skip" href="#main">Skip to support</a>
 <header className="topbar">
  <div className="brand"><img className="libre-logo" src="assets/libre.png" alt="FreeStyle Libre"/><span className="brand-divider"></span><img className="abbott-logo" src="assets/abbott.png" alt="Abbott"/></div>
  <button onClick={() => setLarge(!large)} id="textSize" className="text-size" type="button" aria-pressed={large}><span aria-hidden="true">Aa</span> Larger text</button>
 </header>
 {measurements && <MeasurementStrip controller={measurements} personaKey={personaKey}/>}
 <main id="main">
  <section className="welcome" aria-labelledby="welcomeTitle">
   <div className="welcome-copy">
    <p className="eyebrow"><span></span> YOUR LIBRE SUPPORT</p>
    <h1 id="welcomeTitle">Good to see you, <br/><span>Helen.</span></h1>
    <p className="intro">A little help. <br/>A lot less repeating yourself.</p>
    <p className="description">Talk with Alex, your Libre AI support assistant, about your connection, recent checks or a replacement.</p>
    <div className="profile-note"><span className="profile-icon" aria-hidden="true">H</span><div><strong>Helen Parker</strong><span>Your support record</span></div></div>
   </div>
   <div className="conversation-card">
    <div className="voice-art" aria-hidden="true"><div className="voice-ring"><div className="voice-disc"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><span className="voice-caption">SUPPORT THAT LISTENS</span></div>
    <h2>Let's talk it through.</h2>
    <p>Use your voice, at your pace.<br/>One question at a time.</p>
    <button onClick={() => launch("voice")} disabled={!ready || launching} id="startVoice" className="primary" type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"></path></svg><span className="primary-label"><span>{launching ? 'Opening conversation…' : !ready && !error ? 'Connecting to support…' : 'Talk to Alex'}</span><small>Libre AI support</small></span><svg className="arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"></path></svg></button>
    <button onClick={() => launch("text")} disabled={!ready || launching} id="startText" className="secondary" type="button">I prefer to type <span aria-hidden="true">→</span></button>
    <p id="status" className={error ? "status error" : "status"} role="status" aria-live="polite">{status}</p>
   </div>
  </section>
  <section className="help-section" aria-labelledby="helpTitle">
   <div className="section-heading"><h2 id="helpTitle">Where would you like to start?</h2><p>You can ask in your own words.</p></div>
   <div className="help-grid">
    <button className="help-card" type="button" disabled={!ready || launching} onClick={event => launch("voice", event.currentTarget.dataset.question)} data-question="Why isn't my Libre connecting?">
     <span className="help-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 5 10 14V5L7 19M12 2v20"></path></svg></span>
     <span><strong>My connection</strong><span>“Why isn't my Libre connecting?”</span></span><b aria-hidden="true">↗</b>
    </button>
    <button className="help-card" type="button" disabled={!ready || launching} onClick={event => launch("voice", event.currentTarget.dataset.question)} data-question="What have the checks found so far?">
     <span className="help-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h14v17H5zM9 2h6v4H9zM8 12l2 2 5-5M8 18h8"></path></svg></span>
     <span><strong>My recent checks</strong><span>“What have the checks found?”</span></span><b aria-hidden="true">↗</b>
    </button>
    <button className="help-card" type="button" disabled={!ready || launching} onClick={event => launch("voice", event.currentTarget.dataset.question)} data-question="Can you check my replacement request?">
     <span className="help-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 7 9-4 9 4v11l-9 4-9-4zM3 7l9 4 9-4M12 11v11M8 5l9 4"></path></svg></span>
     <span><strong>My replacement</strong><span>“What's happening with my request?”</span></span><b aria-hidden="true">↗</b>
    </button>
   </div>
  </section>
  <section className="reassurance"><span className="reassurance-mark" aria-hidden="true">✓</span><div><h2>Your story stays with your support.</h2><p>Your assistant can use recorded checks and concerns, so you can focus on what you need next.</p></div></section>
 </main>
 <footer><span>Abbott · FreeStyle Libre support experience</span><span>Alex · Libre AI support assistant</span></footer>
</>;
}
createRoot(document.getElementById("root")).render(<App/>);
