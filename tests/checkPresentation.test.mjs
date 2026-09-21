import test from 'node:test';
import assert from 'node:assert/strict';
import {presentCheck} from '../src/checkPresentation.js';
const row={key:'phoneBluetooth',label:'Bluetooth',text:'On',state:'VERIFIED',success:true,observedAt:'2026-09-21T16:00:00Z',sourceKind:'RECORDED_OBSERVATION',beforeContact:true};
test('earlier and missing evidence never get positive icons despite success flag',()=>{
 for(const state of ['STALE','UNAVAILABLE','CHECKING'])assert.notEqual(presentCheck({...row,state}).tone,'success');
 assert.equal(presentCheck({...row,state:'STALE'}).badge,'Earlier result');
 assert.equal(presentCheck({...row,observedAt:null}).tone,'unknown');
});
test('customer confirmation has its own blue state, distinct from observation',()=>{
 assert.equal(presentCheck({...row,state:'CUSTOMER_CONFIRMED',sourceKind:'CUSTOMER_STATEMENT'}).tone,'confirmed');
 assert.equal(presentCheck(row).tone,'success');
});
test('confirmed negative reading is red; delay and unconfirmed app data are not failures',()=>{
 const attention={...row,state:'ATTENTION',success:false};
 assert.equal(presentCheck({...attention,key:'mostRecentValidReading',text:'No new reading was recorded'}).tone,'negative');
 assert.equal(presentCheck({...attention,key:'cloudUpload',text:'Upload delayed'}).tone,'attention');
 assert.equal(presentCheck({...attention,key:'localDisplay',text:'Readings not confirmed in the app'}).tone,'unknown');
 assert.equal(presentCheck({...attention,key:'sensorLifecycle',text:'Expected end of wear'}).badge,'End of wear');
});
test('display preserves finding, time and source; numeric and string instants agree',()=>{
 const before=JSON.stringify(row),result=presentCheck(row);
 assert.equal(JSON.stringify(row),before);assert.equal(result.text,row.text);assert.equal(result.observedAt,row.observedAt);
 assert.equal(result.time,presentCheck({...row,observedAt:Date.parse(row.observedAt)}).time);
 assert.equal(result.timing,'Before this conversation');
});
