import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {connectMessaging} from './messaging.js';
import {connectMeasurements,presenterMode} from './measurements.js';
import {MeasurementStrip} from './MeasurementStrip.jsx';
import {connectChecks} from './checks.js';
import {YourChecks} from './YourChecks.jsx';
import {YourNextStep} from './YourNextStep.jsx';
import {nextStepEnabled} from './nextStep.js';
const showNextStep = nextStepEnabled(window.location.search, import.meta.env.VITE_CONTROLLED_GUIDANCE !== 'false');
import {personas,readRoute,personaHref,prepareExperience,personaStorageKey} from './personas.js';
import {clearCustomerSession,preparationProblem} from './sessionReset.js';
import {connectPresenter} from './presenterBridge.js';
import './styles.css';

const route=readRoute(window.location.search);
const de=route.persona?.language==='de';
document.documentElement.lang=de?'de':'en';
document.title=route.persona?`${route.persona.name} · Libre Support`:'Libre Support · Choose an experience';
const presenter=presenterMode(window.location.search);
const bridge=connectPresenter(window,route.persona?.key);
let checks={snapshot:()=>({card:null,ended:false}),subscribe:()=>()=>{},dispose:()=>{}};
let measurements=null;
const target=route.kind==='customer'?route.id:'landing';
const preparation=(async()=>{
 const result=await prepareExperience(window,target,()=>clearCustomerSession());
 if(result.reload)return result;
 if(bridge.config&&!bridge.config.invalid){
  const key='adc.presenter.launch';
  if(window.sessionStorage.getItem(key)!==bridge.config.launch){
   await clearCustomerSession();window.sessionStorage.setItem(key,bridge.config.launch);return {reload:true};
  }
 }
 return result;
})().catch(error=>({error:preparationProblem(error)}));

function BrandHeader(){
 const [large,setLarge]=useState(false);
 useEffect(()=>{document.body.classList.toggle('large-text',large);},[large]);
 return <header className="topbar"><div className="brand"><img className="libre-logo" src="assets/libre.png" alt="FreeStyle Libre"/><span className="brand-divider"/><img className="abbott-logo" src="assets/abbott.png" alt="Abbott"/></div><button className="text-size" aria-pressed={large} onClick={()=>setLarge(!large)}><span aria-hidden="true">Aa</span>{de?'Größere Schrift':'Larger text'}</button></header>;
}
function VoiceIcon(){return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>;}
function Landing(){return <main id="main" className="launch-page">
 <section className="launch-intro"><p className="eyebrow"><span/>PRESENTER LAUNCHPAD</p><h1>One assistant.<br/><span>Three support experiences.</span></h1><p>Meet Alex, your Libre AI support assistant. Choose a prepared experience to begin the rehearsal.</p></section>
 <p><a className="persona-link" href="https://hc1781018629519.my.salesforce.com/apex/ADCPresenterLaunch" target="_blank" rel="noopener">Open authenticated presenter launcher ↗</a></p><p><a className="persona-link" href="./behind.html" target="_blank" rel="noopener noreferrer">Behind this experience - presenter illustration</a></p><section className="persona-grid" aria-label="Choose a customer experience">{Object.entries(personas).map(([id,p],i)=><article className={`persona-card persona-${id}`} key={id}><div className="persona-card-top"><span className="persona-avatar" aria-hidden="true">{p.initials}</span><span className="persona-language">English · {p.market}</span></div><p className="persona-number">EXPERIENCE 0{i+1}</p><h2>{p.name}</h2><p className="persona-topic">{p.topic}</p><div className="persona-availability"><span aria-hidden="true"/>{p.availability}</div><a className="persona-link" href={personaHref(id,presenter)} lang={p.language}>{p.button}<span aria-hidden="true">↗</span></a></article>)}</section>
 <aside className="launch-note"><strong>Prepared for rehearsal.</strong><p>These links select a demo experience, not an authenticated customer identity. Current checks come from connected support records. Device observations and fulfillment remain simulated.</p><p>Use the authenticated Salesforce presenter launcher for automatic session setup. All three experiences use English. Scenario controls stay in Salesforce.</p><small>Changing experiences clears the previous Salesforce browser session across its tabs and windows. Use one experience at a time.</small></aside>
 </main>;}
function Customer({persona:p,phase}){
 const [context,setContext]=useState(checks.snapshot()),[ready,setReady]=useState(false),[opening,setOpening]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(false);
 const busy=useRef(false);
 const [binding,setBinding]=useState(bridge.snapshot());
 useEffect(()=>{const sync=()=>setBinding(bridge.snapshot());const off=bridge.subscribe(sync);sync();return off;},[]);
 useEffect(()=>{if(phase!=='ready')setContext({card:null,ended:false});return checks.subscribe(()=>setContext(checks.snapshot()));},[phase]);
 useEffect(()=>{
  if(phase!=='ready'||!p.enabled)return;
  const connection=connectMessaging();
  const sync=()=>{const s=connection.getStatus();setReady(s==='ready');setError(s==='error');setStatus(s==='error'?'Support could not connect. Reload this page to retry.':s==='ready'?'Choose voice or typing in the conversation.':'Connecting to support…');};
  const off=connection.subscribe(sync);sync();return off;
 },[phase,p]);
 const prepared=Boolean(bridge.config)&&['prepared','ended','bound','paused'].includes(binding.state);
 const connecting=['connecting','binding'].includes(binding.state);
 const enabled=phase==='ready'&&p.enabled&&ready&&!opening&&prepared;
 async function launch(mode,question){
  if(!enabled||busy.current)return;
  if(question&&bridge.config&&binding.state!=='bound'){setStatus('Start the conversation and wait for support context to connect before asking about records.');return;}
  busy.current=true;setOpening(true);setError(false);measurements?.markLaunch();
  try{bridge.begin();await connectMessaging().launch(question);setStatus(mode==='voice'?'Choose the voice control in the conversation. Your browser may ask for microphone access.':'Type your question in the conversation.');}
  catch{bridge.fail();setError(true);setStatus('We could not confirm the conversation opened or the question was sent. Check the conversation before retrying.');}
  finally{busy.current=false;setOpening(false);}
 }
 return <>{connecting&&<div className="binding-overlay" role="alert" aria-live="assertive"><div><h2>Connecting to your support record</h2><p>Please wait. Your conversation will be ready when the secure connection completes.</p></div></div>}{measurements&&<MeasurementStrip controller={measurements} personaKey={p.key}/>}<main id="main" className="customer-page">
 <a className="back-link" href="./">← {de?'Zur Übersicht':'All experiences'}</a>
 <section className="welcome" aria-labelledby="welcomeTitle"><div className="welcome-copy"><p className="eyebrow"><span/>{de?'IHRE LIBRE UNTERSTÜTZUNG':'YOUR LIBRE SUPPORT'}</p><h1 id="welcomeTitle">{de?'Hallo':'Hello'} {p.first}.</h1><p className="intro">{p.headline}</p><p className="description">{p.description}</p><div className="profile-note"><span className="profile-icon" aria-hidden="true">{p.initials}</span><div><strong>{p.name}</strong><span>{de?'Vorbereitete Demo-Erfahrung · keine Identitätsprüfung':'Prepared demo experience · not identity verification'}</span></div></div>
 <div className="current-status"><span>{de?'AKTUELLER STATUS':'CURRENT STATUS'}</span><p>{context.card?.conclusion||(p.enabled?'Support context awaiting verification.':de?'Gespräch noch nicht verfügbar.':'Conversation not available yet.')}</p></div></div>
 <div className="conversation-card"><div className="voice-art" aria-hidden="true"><div className="voice-ring"><div className="voice-disc">{[1,2,3,4,5,6,7].map(n=><i key={n}/>)}</div></div></div><h2>{de?'Sprechen wir darüber.':'Let’s talk it through.'}</h2><p>{de?'In Ihrem Tempo. Eine Frage nach der anderen.':'At your pace. One question at a time.'}</p><button className="primary" id="startVoice" disabled={!enabled} onClick={()=>launch('voice')}><VoiceIcon/><span className="primary-label"><span>{opening?'Opening…':de?'Mit Alex sprechen':'Talk to Alex'}</span><small>{de?'Libre KI-Unterstützung':'Libre AI support'}</small></span></button><button className="secondary" id="startText" disabled={!enabled} onClick={()=>launch('text')}>{de?'Ich möchte lieber schreiben':'I prefer to type'} →</button><p className="availability-note" role="status">{binding.state==='bound'?'Your support record is connected.':binding.state==='paused'?'Your conversation is waiting or paused. Keep the chat open for updates; a human connection is not yet confirmed.':connecting?'Connecting to your support record':binding.state==='error'?'Your support record could not be connected. Return to the authenticated presenter launcher and start again.':binding.state==='ended'?'This conversation ended. You can start a new conversation.':p.blocker}</p>{!bridge.config&&<a href="https://hc1781018629519.my.salesforce.com/apex/ADCPresenterLaunch" target="_blank" rel="noopener">Open authenticated presenter launcher</a>}{p.enabled&&<p role="status" className={error?'status error':'status'}>{status}</p>}</div></section>
 {showNextStep&&<YourNextStep card={phase==='ready'?context.card:null} bound={phase==='ready'&&binding.state==='bound'} ended={context.ended||binding.state==='ended'} disabled={!enabled} onConversation={()=>launch('text')}/>}
 <YourChecks controller={checks} language={p.language} disabled={!enabled||binding.state!=='bound'} onReview={()=>launch('text','What do my current checks show, and what should I do next?')}/>
 {presenter&&<aside className="launch-note"><strong>Presenter preparation</strong><p><a href="./behind.html" target="_blank" rel="noopener noreferrer">Behind this experience - presenter illustration</a></p><p>Use the authenticated presenter launcher for every persona. It connects the actual conversation to the server-approved customer and current scenario; a persona link alone grants no record access.</p><p>Keep scenario selection in Salesforce. Never use this URL as proof of identity.</p></aside>}
 </main></>;
}
function App(){
 const [phase,setPhase]=useState('preparing');
 const [preparationError,setPreparationError]=useState(null);
 useEffect(()=>{
  let live=true;
  preparation.then(({reload,error})=>{if(!live)return;if(error){setPreparationError(error);setPhase('error');return;}if(reload){window.location.reload();return;}if(route.persona){checks=connectChecks(window,route.persona.key);measurements=presenter?connectMeasurements(route.persona.key):null;}setPhase('ready');});
  const changed=e=>{if(e.key===personaStorageKey&&e.newValue!==target){setPhase('changed');measurements?.setPersona('UNBOUND');checks.dispose();window.embeddedservice_bootstrap?.utilAPI?.removeAllComponents?.();}};
  const restored=e=>{if(e.persisted)window.location.reload();};
  window.addEventListener('storage',changed);window.addEventListener('pageshow',restored);
  return()=>{live=false;window.removeEventListener('storage',changed);window.removeEventListener('pageshow',restored);};
 },[]);
 return <><a className="skip" href="#main">{de?'Zum Inhalt':'Skip to support'}</a><BrandHeader/>
 {phase!=='ready'&&<div className="session-notice" role="status">{phase==='preparing'?(de?'Die Gesprächsumgebung wird vorbereitet…':'Preparing a separate conversation environment…'):phase==='changed'?(de?'Eine andere Erfahrung wurde geöffnet. Bitte laden Sie diese Seite neu.':'Another experience was opened. Reload this page before continuing.'):(de?'Die vorherige Sitzung konnte nicht sicher zurückgesetzt werden. Bitte schließen Sie den Chat und laden Sie diese Seite neu.':(preparationError?.text||'Conversation preparation failed.'))}</div>}
 {phase==='error'&&<div className="session-notice"><p>Diagnostic: <strong>{preparationError?.code||'PREPARATION_FAILED'}</strong>. A new conversation stays blocked until preparation succeeds.</p><button type="button" className="checks-review" onClick={()=>window.location.reload()}>Reload and retry</button></div>}
 {route.kind==='customer'?<Customer persona={route.persona} phase={phase}/>:route.kind==='unknown'?<main id="main"><h1>Experience not found.</h1><a href="./">Choose Helen, Daniel or Ingrid</a></main>:<Landing/>}
 <footer><span>Abbott · FreeStyle Libre</span><span>Alex · {de?'Libre KI-Assistent':'Libre AI support assistant'}</span></footer></>;
}
createRoot(document.getElementById('root')).render(<App/>);
