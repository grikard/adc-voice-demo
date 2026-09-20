import React,{useEffect,useState} from 'react';
export function YourChecks({controller,onReview,disabled}){
 const [state,setState]=useState(controller.snapshot());
 useEffect(()=>controller.subscribe(()=>setState(controller.snapshot())),[controller]);
 const card=state.card;
 return <section className="your-checks" aria-labelledby="yourChecksTitle">
  <h2 id="yourChecksTitle">{state.ended?'Your final checks':'Your checks'}</h2>
  <p className="checks-conclusion">{card?.conclusion||'Your current checks are unavailable until your support context is connected.'}</p>
  {card?<ul>{card.checks.map(row=><li key={row.key}>
   <span className={`check-mark ${row.success?'verified':''}`} aria-hidden="true">{row.success?'✓':row.state==='CHECKING'?'…':'—'}</span>
   <div><strong>{row.label}</strong><p>{row.text}</p><small>{row.sourceKind==='CUSTOMER_STATEMENT'?'Confirmed by you':row.sourceKind==='RECORDED_OBSERVATION'?'Recorded observation':'Unable to verify'}{row.observedAt!==null&&<> · <time dateTime={new Date(row.observedAt).toISOString()}>{new Date(row.observedAt).toLocaleString()}</time>{row.beforeContact?' · Before this conversation':''}</>}</small></div>
  </li>)}</ul>:<p>No diagnostic success is assumed. Alex can explain the information available in your conversation.</p>}
  {card&&<p><strong>Next: </strong>{card.nextAction}</p>}
  {card?.backgroundContinues&&!state.ended&&<p>Background checks continue even when this page is closed. Ask Alex for an updated result when you return.</p>}
  {!state.ended&&<button className="secondary" disabled={disabled} onClick={onReview}>Review my checks with Alex</button>}
 </section>;
}
