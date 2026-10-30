const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=readFileSync('index.html','utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const source=html.slice(html.indexOf('function stopDrawing()'),html.indexOf('function onKeyDown(e)'));
let writes=0;
const events={};
const target={addEventListener:(name,fn)=>{(events[name]??=[]).push(fn)}};
const context=vm.createContext({months:target,mobileGrid:target,document:target,window:target,canEdit:()=>true,hit:()=>({day:{},half:'am'}),apply:()=>writes++});
vm.runInContext("let drawing=false,last='',activePointer=null,person='marie';"+source,context);
const send=(name,fields={})=>{context.e={pointerId:1,isPrimary:true,pointerType:'mouse',button:0,buttons:1,target:{closest:()=>true},preventDefault(){},...fields};vm.runInContext(name+'(e)',context)};
send('onPointerMove');assert.equal(writes,0);
send('onPointerDown');assert.equal(writes,1);
send('onPointerMove');assert.equal(writes,2);
send('onPointerMove',{pointerId:2});assert.equal(writes,2);
send('onPointerMove',{buttons:0});send('onPointerMove');assert.equal(writes,2,'missed release must stop painting');
for(const name of ['blur','pagehide','scroll','pointerup','pointercancel','lostpointercapture']){
 send('onPointerDown');const before=writes;
 for(const fn of events[name])fn({pointerId:1});
 send('onPointerMove');assert.equal(writes,before,name+' must stop painting');
}
send('onPointerDown',{target:{closest:()=>false}});const before=writes;send('onPointerMove');assert.equal(writes,before,'date labels must not start painting');
send('onPointerDown',{isPrimary:false});send('onPointerMove');assert.equal(writes,before,'secondary touch must not start painting');
vm.runInContext("person='neutral'",context);send('onPointerDown');send('onPointerMove');assert.equal(writes,before,'consultation must not paint');
console.log('Painting regression checks passed; application JavaScript parses.');
