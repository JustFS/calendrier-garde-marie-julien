const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=readFileSync('index.html','utf8');const app=html.match(/<script>([\s\S]*?)<\/script>/)[1];new vm.Script(app);
function extract(name){const start=app.indexOf('function '+name+'(');let i=app.indexOf('{',start),depth=1,j=i+1;for(;depth;j++){if(app[j]==='{')depth++;if(app[j]==='}')depth--}return app.slice(start,j)}
const map=new Map();let timer,scheduled,signedOut=0,cleared=0;
const c=vm.createContext({Date,JSON,Number,Math,localStorage:{getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},setTimeout:(f,d)=>{timer=f;scheduled=d;return 1},clearTimeout(){},clearPrivateData(){cleared++},authModule:{signOut(){signedOut++}},auth:{},authMessage:{}});
vm.runInContext("const SESSION_MS=30*24*60*60*1000,SESSION_KEY='test';let sessionTimer;"+['permitted','sessionExpiry','rememberSession','scheduleSessionCheck'].map(extract).join('\n'),c);
const run=x=>vm.runInContext(x,c);
assert.equal(run('permitted(null)'),false);assert.equal(run('permitted({isAnonymous:true,emailVerified:true})'),false);assert.equal(run('permitted({isAnonymous:false,emailVerified:false})'),false);assert.equal(run('permitted({isAnonymous:false,emailVerified:true})'),true);
run("rememberSession({uid:'one'})");const until=run("sessionExpiry({uid:'one'})");assert.ok(until-Date.now()>29.99*86400000);assert.equal(run("sessionExpiry({uid:'two'})"),0);
run('scheduleSessionCheck(Date.now()+30*86400000)');assert.equal(scheduled,2147483647);assert.equal(signedOut,0,'30 days must not overflow the browser timer');
run('scheduleSessionCheck(Date.now()-1)');assert.equal(signedOut,1);assert.equal(cleared,1);
assert.ok(!app.includes('signInAnonymously'));assert.ok(app.includes('browserLocalPersistence'));assert.ok(html.includes('id="private-app" hidden'));
console.log('Auth checks passed: verified identity, 30-day persistence, expiry and timer overflow.');
