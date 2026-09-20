import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

function App(){
 const [ready,setReady]=useState(Boolean(window.__adcMessagingReady));
 const [launching,setLaunching]=useState(false);
 const launchingRef=useRef(false);
 const [large,setLarge]=useState(false);
 const [status,setStatus]=useState('Choose voice or typing in the conversation.');
 const [error,setError]=useState(false);
 useEffect(()=>{
  const onReady=()=>{setReady(true);window.embeddedservice_bootstrap?.utilAPI?.hideChatButton?.();};
  window.addEventListener('onEmbeddedMessagingButtonCreated',onReady);
  if(window.__adcMessagingReady)onReady();
  return ()=>window.removeEventListener('onEmbeddedMessagingButtonCreated',onReady);
 },[]);
 useEffect(()=>{document.body.classList.toggle('large-text',large);},[large]);
 async function launch(mode,question){
  if(launchingRef.current)return;
  if(!ready || !window.embeddedservice_bootstrap?.utilAPI?.launchChat){
   setError(true);setStatus('The conversation is not available yet. Please ask your demo host to connect support.');return;
  }
  launchingRef.current=true;setLaunching(true);setError(false);setStatus('Opening your conversation…');
  try{
   // Opens the native conversation. This does not start audio or authenticate Helen.
   await window.embeddedservice_bootstrap.utilAPI.launchChat(true);
   setStatus(question ? `When ready, ask: “${question}”` : mode==='voice' ? 'Choose the voice control in the conversation, then allow microphone access when asked.' : 'You can type your question in the conversation.');
  }catch{
   setError(true);setStatus('We could not open the conversation. Please try again or ask your demo host.');
  }finally{launchingRef.current=false;setLaunching(false);}
 }
 return <>
<a className="skip" href="#main">Skip to support</a>
 <header className="topbar">
  <div className="brand"><img className="libre-logo" src="assets/libre.png" alt="FreeStyle Libre"/><span className="brand-divider"></span><img className="abbott-logo" src="assets/abbott.png" alt="Abbott"/></div>
  <button onClick={() => setLarge(!large)} id="textSize" className="text-size" type="button" aria-pressed={large}><span aria-hidden="true">Aa</span> Larger text</button>
 </header>
 <main id="main">
  <section className="welcome" aria-labelledby="welcomeTitle">
   <div className="welcome-copy">
    <p className="eyebrow"><span></span> YOUR LIBRE SUPPORT</p>
    <h1 id="welcomeTitle">Good to see you, <br/><span>Helen.</span></h1>
    <p className="intro">A little help. <br/>A lot less repeating yourself.</p>
    <p className="description">Talk with your support assistant about your connection, recent checks or a replacement.</p>
    <div className="profile-note"><span className="profile-icon" aria-hidden="true">H</span><div><strong>Helen Parker</strong><span>Prepared demonstration profile</span></div></div>
   </div>
   <div className="conversation-card">
    <div className="voice-art" aria-hidden="true"><div className="voice-ring"><div className="voice-disc"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><span className="voice-caption">SUPPORT THAT LISTENS</span></div>
    <h2>Let's talk it through.</h2>
    <p>Use your voice, at your pace.<br/>One question at a time.</p>
    <button onClick={() => launch("voice")} disabled={launching} id="startVoice" className="primary" type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"></path></svg>Start a conversation<svg className="arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"></path></svg></button>
    <button onClick={() => launch("text")} disabled={launching} id="startText" className="secondary" type="button">I prefer to type <span aria-hidden="true">→</span></button>
    <p id="status" className={error ? "status error" : "status"} role="status" aria-live="polite">{status}</p>
   </div>
  </section>
  <section className="help-section" aria-labelledby="helpTitle">
   <div className="section-heading"><h2 id="helpTitle">Where would you like to start?</h2><p>You can ask in your own words.</p></div>
   <div className="help-grid">
    <button className="help-card" type="button" disabled={launching} onClick={event => launch("voice", event.currentTarget.dataset.question)} data-question="Why isn't my Libre connecting?">
     <span className="help-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 5 10 14V5L7 19M12 2v20"></path></svg></span>
     <span><strong>My connection</strong><span>“Why isn't my Libre connecting?”</span></span><b aria-hidden="true">↗</b>
    </button>
    <button className="help-card" type="button" disabled={launching} onClick={event => launch("voice", event.currentTarget.dataset.question)} data-question="What have the checks found so far?">
     <span className="help-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h14v17H5zM9 2h6v4H9zM8 12l2 2 5-5M8 18h8"></path></svg></span>
     <span><strong>My recent checks</strong><span>“What have the checks found?”</span></span><b aria-hidden="true">↗</b>
    </button>
    <button className="help-card" type="button" disabled={launching} onClick={event => launch("voice", event.currentTarget.dataset.question)} data-question="Can you check my replacement request?">
     <span className="help-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 7 9-4 9 4v11l-9 4-9-4zM3 7l9 4 9-4M12 11v11M8 5l9 4"></path></svg></span>
     <span><strong>My replacement</strong><span>“What's happening with my request?”</span></span><b aria-hidden="true">↗</b>
    </button>
   </div>
  </section>
  <section className="reassurance"><span className="reassurance-mark" aria-hidden="true">✓</span><div><h2>Your story stays with your support.</h2><p>Your assistant can use recorded checks and concerns, so you can focus on what you need next.</p></div></section>
 </main>
 <footer><span>Abbott · FreeStyle Libre support experience</span><span>HCLTech leadership demonstration · Prepared profile and simulated device events</span></footer>
</>;
}
createRoot(document.getElementById("root")).render(<App/>);
