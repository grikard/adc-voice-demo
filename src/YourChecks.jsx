import React,{useEffect,useState} from 'react';
export function YourChecks({controller,onReview,disabled,language='en'}){
 const de=language==='de';
 const [state,setState]=useState(controller.snapshot());
 useEffect(()=>controller.subscribe(()=>setState(controller.snapshot())),[controller]);
 const card=state.card;
 return <section className="your-checks" aria-labelledby="yourChecksTitle">
  <h2 id="yourChecksTitle">{de?(state.ended?'Ihre abschließenden Prüfungen':'Ihre Prüfungen'):(state.ended?'Your final checks':'Your checks')}</h2>
  <p className="checks-conclusion">{card?.conclusion||(de?'Ihre aktuellen Prüfergebnisse sind noch nicht verfügbar.':'Your current checks are unavailable until your support context is connected.')}</p>
  {card?<ul>{card.checks.map(row=><li key={row.key}>
   <span className={`check-mark ${row.success?'verified':''}`} aria-hidden="true">{row.success?'✓':row.state==='CHECKING'?'…':'—'}</span>
   <div><strong>{row.label}</strong><p>{row.text}</p><small>{row.sourceKind==='CUSTOMER_STATEMENT'?'Confirmed by you':row.sourceKind==='RECORDED_OBSERVATION'?'Recorded observation':'Unable to verify'}{row.observedAt!==null&&<> · <time dateTime={new Date(row.observedAt).toISOString()}>{new Date(row.observedAt).toLocaleString()}</time>{row.beforeContact?' · Before this conversation':''}</>}</small></div>
  </li>)}</ul>:<p>{de?'Es liegen noch keine bestätigten Ergebnisse für dieses Gespräch vor.':'No verified results are available for this conversation yet.'}</p>}
  {card&&<p><strong>Next: </strong>{card.nextAction}</p>}
  {card?.backgroundContinues&&!state.ended&&<p>Background checks continue even when this page is closed. Ask Alex for an updated result when you return.</p>}
  {!state.ended&&<button className="secondary" disabled={disabled} onClick={onReview}>{de?'Prüfungen mit Alex ansehen':'Review my checks with Alex'}</button>}
 </section>;
}
