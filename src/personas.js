// Public rehearsal labels only. These values never authorize Salesforce access.
export const personas = Object.freeze({
 helen: {key:'HELEN',name:'Helen Parker',first:'Helen',initials:'HP',language:'en',topic:'Connection recovery and replacement support.',button:'Open Helen’s experience',availability:'Presenter setup required',enabled:true,headline:'A little help. Less repeating yourself.',description:'Talk with Alex about your connection, recorded checks or an existing replacement.',blocker:'Each new conversation needs the presenter to connect Helen’s current support case before Alex can retrieve records.'},
 daniel: {key:'DANIEL',name:'Daniel Reed',first:'Daniel',initials:'DR',language:'en',topic:'Distinguish missing app readings from delayed sharing to a connected service.',button:'Open Daniel’s experience',availability:'Conversation setup pending',enabled:false,headline:'Your readings. A clearer picture.',description:'Support for understanding readings in your app and sharing to a connected service.',blocker:'Daniel’s separate support records are prepared. Launch-to-session binding and his hosted conversation have not been verified, so voice and text are unavailable here.'},
 ingrid: {key:'INGRID',name:'Ingrid Weber',first:'Ingrid',initials:'IW',language:'de',topic:'German-language support and human assistance.',button:'Ingrids Support öffnen',availability:'German voice setup pending',enabled:false,headline:'Unterstützung. In Ihrem Tempo.',description:'Alex hilft Ihnen auf Deutsch mit Ihren Libre-Fragen und dem nächsten Schritt.',blocker:'Der separate deutsche Sprachkanal ist noch nicht eingerichtet. Sprach- und Textgespräche sind hier noch nicht verfügbar.'}
});
export function readRoute(search){
 const values=new URLSearchParams(search).getAll('persona');
 if(!values.length)return {kind:'landing'};
 if(values.length!==1||!Object.hasOwn(personas,values[0]))return {kind:'unknown'};
 return {kind:'customer',id:values[0],persona:personas[values[0]]};
}
export function personaHref(id,presenter=false){
 if(!Object.hasOwn(personas,id))throw Error('Unknown experience');
 return `?persona=${id}${presenter?'&presenter=1':''}`;
}
export const personaStorageKey='adc.demo.experience.v1';
// Browser isolation only, never identity or backend binding.
export async function prepareExperience(win,target,clear){
 const work=async()=>{
  const previous=win.localStorage.getItem(personaStorageKey);
  if(previous===target||(!previous&&target==='landing'))return {reload:false};
  await clear();
  win.localStorage.setItem(personaStorageKey,target);
  return {reload:true};
 };
 if(!win.navigator?.locks?.request)throw Error('Safe session switching is unavailable in this browser.');
 return win.navigator.locks.request('adc-demo-persona-switch',work);
}
