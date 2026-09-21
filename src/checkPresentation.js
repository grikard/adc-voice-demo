// Presentation only: use the server's evidence state, never infer a new finding.
const paths = {
  check: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M8 12l3 3 5-6',
  cross: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M9 9l6 6 M15 9l-6 6',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7v5l4 2',
  question: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4 M12 16v.1',
  speech: 'M21 11a9 9 0 0 1-13 8l-5 2 2-5A9 9 0 1 1 21 11Z',
  warning: 'M10.3 4.5 2.5 18a1.5 1.5 0 0 0 1.3 2.2h16.4a1.5 1.5 0 0 0 1.3-2.2L13.7 4.5a2 2 0 0 0-3.4 0Z M12 9v4 M12 16v.1',
  checking: 'M5 12h.1 M12 12h.1 M19 12h.1'
};
const positive = {phoneBluetooth:'On',phoneProximity:'Nearby',sensorCommunication:'Recorded',mostRecentValidReading:'Available',localDisplay:'Available',cloudUpload:'Uploaded',sensorLifecycle:'Active',sensorError:'No error reported',appCompatibility:'Verified'};
export function presentCheck(row) {
  let tone='unknown', icon='question', badge='Not confirmed';
  const time=row.observedAt==null?NaN:typeof row.observedAt==='number'?row.observedAt:Date.parse(row.observedAt);
  if(row.state==='STALE'){tone='earlier';icon='clock';badge='Earlier result';}
  else if(row.state==='CHECKING'){tone='checking';icon='checking';badge='Checking';}
  else if(row.success===true&&Number.isFinite(time)&&row.state==='CUSTOMER_CONFIRMED'){tone='confirmed';icon='speech';badge='You confirmed';}
  else if(row.success===true&&Number.isFinite(time)&&row.state==='VERIFIED'){tone='success';icon='check';badge=positive[row.key]||'Verified';}
  else if(row.state==='ATTENTION'){
    tone='attention';icon='warning';badge='Needs attention';
    // Only an explicit negative reading result gets a red cross. Unknown is not failure.
    if(row.key==='mostRecentValidReading'&&row.text==='No new reading was recorded'){tone='negative';icon='cross';badge='No reading recorded';}
    else if(row.key==='phoneBluetooth'&&row.text==='Off'){tone='negative';icon='cross';badge='Off';}
    else if(row.key==='cloudUpload'&&row.text==='Upload delayed')badge='Delayed';
    else if(row.key==='sensorLifecycle'&&row.text==='Initializing')badge='Initializing';
    else if(row.key==='sensorLifecycle'&&row.text==='Expected end of wear')badge='End of wear';
    else if(row.key==='sensorLifecycle'&&row.text==='Ended earlier than expected')badge='Ended early';
    else if(row.key==='localDisplay'){tone='unknown';icon='question';badge='Not confirmed';}
  }
  return {...row,tone,iconPath:paths[icon],badge,rowClass:'checks-row checks-'+tone,
    origin:row.sourceKind==='CUSTOMER_STATEMENT'?'Customer statement':row.sourceKind==='RECORDED_OBSERVATION'?'Recorded observation':'Source unavailable',
    time:Number.isFinite(time)?new Date(time).toLocaleString(): 'Time unavailable',
    timing:row.beforeContact?'Before this conversation':''};
}
