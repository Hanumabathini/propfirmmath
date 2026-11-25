// Regression tests for the step 1 review findings (consistency parsing, country gate,
// directory coverage, privacy disclosure). Runs on source files; no build needed.
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const P=require('../src/prop.js');

// 1. Consistency calculator: comma-separated entries are separate days.
a.deepEqual(P.parseDays('350,400,500'),[350,400,500]);
a.deepEqual(P.parseDays('350,400,500,600'),[350,400,500,600]);
a.deepEqual(P.parseDays('350, 400, 500'),[350,400,500]);
a.deepEqual(P.parseDays('350,-400,500'),[350,-400,500]);
a.deepEqual(P.parseDays('350,400,500,'),[350,400,500]);
a.deepEqual(P.parseDays('350;400;500'),[350,400,500]);
// Thousands separators still work when days are on separate lines or separated by spaces.
a.deepEqual(P.parseDays('$1,000\n-250\n500'),[1000,-250,500]);
a.deepEqual(P.parseDays('1,000\n2,500'),[1000,2500]);
a.deepEqual(P.parseDays('1,000 2,500'),[1000,2500]);
a.deepEqual(P.parseDays('-$200\n$1,200'),[-200,1200]);
a.deepEqual(P.parseDays('12,34,567\n100'),[1234567,100]);
a.deepEqual(P.parseDays('$1,000'),[1000]);
a.deepEqual(P.parseDays('1,000.50'),[1000.5]);
a.deepEqual(P.parseDays(''),[]);
const c=P.consistency(P.parseDays('350,400,500'),50);
a.equal(c.days,3);a.equal(c.total,1250);a.equal(c.best,500);a.equal(c.pct,40);a.equal(c.pass,true);
// The result shows how the input was read, so a misparse is visible.
a.match(read('src/prop-ui.js'),/Read as " \+ parsed\.length/);

// 4. Country selection: page content is never hidden behind the country picker.
const build=read('build.py');
a.doesNotMatch(build,/<main[^>]*\bhidden\b/);
a.doesNotMatch(build,/<main[^>]*data-country-required/);

function regionEnv(stored){
  const store={...stored},ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
  const select={value:'',options:[],add(o){this.options.push(o)},addEventListener(){}};
  const status={textContent:''},hidden=[{hidden:false}];
  const ctx={window:{dispatchEvent(){}},Event:function(){},Intl,localStorage:ls,sessionStorage:{getItem:()=>null,setItem(){}},
    Option:function(t,v){this.text=t;this.value=v},
    document:{getElementById:id=>id==='site-country'?select:id==='site-region-status'?status:null,querySelectorAll:q=>q==='[data-country-required]'?hidden:[],addEventListener(){}}};
  vm.runInNewContext(read('src/region.js'),ctx);
  return {R:ctx.window.PFMRegion,select,status,store,hidden};
}
// Country choice survives new tabs and sessions (local storage).
let env=regionEnv({'pfm-country':'IN'});
a.equal(env.select.value,'IN');a.equal(env.R.get(),'IN');
env=regionEnv({});a.equal(env.R.get(),'');a.equal(env.R.placeholder(),'Choose your country to list firms');

// 3. Directory: all listed firms show without a country; a country only labels them,
// and hides a firm only when the visitor asks and the firm's published list restricts it.
const dir=JSON.parse(read('data/directory.json'));
function directory(country,availability){
  const e=regionEnv(country?{'pfm-country':country}:{});
  const el=id=>({value:id==='directory-availability'?availability||'':'',textContent:'',addEventListener(){}});
  const ids={};const $=id=>ids[id]||(ids[id]=el(id));
  const cards=dir.map(f=>({dataset:{name:f.name.toLowerCase(),category:f.category,status:f.status},hidden:false,classList:{toggle(){}},querySelector:()=>({textContent:f.name})}));
  const ctx={window:{PFMRegion:e.R,addEventListener(){}},document:{getElementById:id=>id==='directory-search'||id.startsWith('directory-')?$(id):null,querySelectorAll:()=>cards}};
  ids['directory-search']=el('directory-search');
  vm.runInNewContext(read('src/expanded.js'),ctx);
  return {shown:cards.filter(c=>!c.hidden).length,count:ids['directory-count'].textContent,R:e.R};
}
a.equal(dir.length,28);
let d=directory('');a.equal(d.shown,28);a.match(d.count,/Showing 28 of 28 firms/);
d=directory('US');a.equal(d.shown,28);
d=directory('PK');a.equal(d.shown,28,'Pakistan still sees every firm, labelled');
const pk=directory('PK','hide-restricted'),blockedPK=dir.filter(f=>pk.R.region(f.name,'PK').blocked).length;
a.ok(blockedPK>0);a.equal(pk.shown,28-blockedPK);
// Hiding uses only sourced restriction lists; firms without one are never hidden.
for(const f of dir){const st=pk.R.region(f.name,'PK');if(st.blocked)a.ok(st.source,'blocked firm needs a source: '+f.name);}

// 5. Privacy: every browser storage key the site writes is disclosed on the privacy page.
const privacy=build.slice(build.indexOf('page("privacy/"'),build.indexOf('crumbs=[("Home", ""), ("Privacy"'));
a.match(privacy,/local storage/i);a.match(privacy,/session storage/i);a.match(privacy,/Reset demo data/);
a.doesNotMatch(privacy,/nothing you type is stored/i);
const disclosed={'pfm-country':/Country of residence/,'pfm-demo-v1':/My account workspace/,'pfm-journal':/Plan analysis journal/,'pfm-selected-account':/Selected firm, plan/,'pfm-fx-':/FX quote/};
const used=new Set();
for(const f of fs.readdirSync(path.join(ROOT,'src')).filter(f=>f.endsWith('.js'))){
  const s=read('src/'+f);
  for(const m of s.matchAll(/(?:local|session)Storage\.setItem\(\s*([^,]+),/g)){
    let k=m[1].trim();
    if(/^["']/.test(k))k=k.slice(1).replace(/["'].*$/,'');
    else if(k==='key')k=(s.match(/key\s*=\s*["']([^"']+)/)||[])[1];
    else if(k==='activeKey')k='pfm-journal';
    used.add(k);
  }
}
for(const k of used){const rule=Object.entries(disclosed).find(([p])=>k&&k.startsWith(p));a.ok(rule,'undisclosed storage key: '+k);a.match(privacy,rule[1]);}
a.ok(used.size>=5);
console.log('Step 1 regression tests passed.');
