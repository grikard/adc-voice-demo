import React,{useEffect,useState} from 'react';
import {presentCheck} from './checkPresentation.js';
import './YourChecks.css';
export function YourChecks({controller,onReview,disabled,language='en'}){
 const de=language==='de';
 const [state,setState]=useState(controller.snapshot());
 useEffect(()=>controller.subscribe(()=>setState(controller.snapshot())),[controller]);
 const card=state.card;
 const rows=(card?.checks||[]).map(presentCheck);
 return <section className="checks-card" aria-labelledby="yourChecksTitle">
  <h2 className="checks-heading" id="yourChecksTitle">{de?(state.ended?'Ihre abschließenden Prüfungen':'Ihre Prüfungen'):(state.ended?'Your final checks':'Your checks')}</h2>
  <p className="checks-conclusion">{card?.conclusion||(de?'Ihre aktuellen Prüfergebnisse sind noch nicht verfügbar.':'Your current checks are unavailable until your support context is connected.')}</p>
  {card?<><ul className="checks-list">{rows.map(row=><li className={row.rowClass} key={row.key}>
   <span className="checks-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d={row.iconPath}/></svg></span>
   <div><div className="checks-row-top"><strong className="checks-label">{row.label}</strong><span className="checks-badge">{row.badge}</span></div><p className="checks-finding">{row.text}</p></div>
  </li>)}</ul><details className="checks-details"><summary>When and how were these checked?</summary><ul>{rows.map(row=><li key={row.key}><strong>{row.label}</strong><span>{row.origin} · {row.time}{row.timing&&` · ${row.timing}`}</span></li>)}</ul></details></>:<p className="checks-empty">{de?'Es liegen noch keine bestätigten Ergebnisse für dieses Gespräch vor.':'No verified results are available for this conversation yet.'}</p>}
  {card&&<p className="checks-next"><strong>Next: </strong>{card.nextAction}</p>}
  {card?.backgroundContinues&&!state.ended&&<p className="checks-background">Background checks continue even when this page is closed. Ask Alex for an updated result when you return.</p>}
  {!state.ended&&<button className="checks-review" disabled={disabled} onClick={onReview}>{de?'Prüfungen mit Alex ansehen':'Review my checks with Alex'}</button>}
 </section>;
}
