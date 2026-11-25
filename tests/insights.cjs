// Checks the built plan finder, plans-by-rule, firm vs firm and glossary pages (builds the site first if needed).
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const ROOT=path.join(__dirname,'..'),DIST=path.join(ROOT,'dist'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
if(!fs.existsSync(path.join(DIST,'plan-finder/index.html')))cp.execFileSync('python3',['build.py'],{cwd:ROOT,stdio:'ignore'});
a.ok(fs.existsSync(path.join(DIST,'plan-finder/index.html')),'build did not produce the plan finder');
const D=JSON.parse(read('data/prop.json')),PM=require('../src/plan-match.js'),L=PM.allTraits(D.firms);
const html=p=>fs.readFileSync(path.join(DIST,p,'index.html'),'utf8');
const pages=['plan-finder','best-for','prop-firm-glossary','topstep-vs-tradeify','topstep-vs-myfundedfutures','tradeify-vs-myfundedfutures',...PM.categories(L).map(c=>'best-for/'+c.path)];
for(const p of pages)a.match(html(p),/<h1>/,p);
a.ok(!fs.existsSync(path.join(DIST,'best-for/instant-funding-futures-prop-firms')),'a one-plan group gets no page');
// Tables only quote rule text that is in data/prop.json; nothing is made up.
const ruleText=new Set();for(const f of Object.values(D.firms))for(const p of f.plans||[])for(const k of ['price','consistency','dd_type','dll'])ruleText.add(String(p[k]).replace(/&/g,'&amp;').replace(/'/g,'&#x27;').replace(/"/g,'&quot;'));
for(const p of pages.filter(p=>p.includes('-vs-')||p.startsWith('best-for/'))){
  const cells=[...html(p).matchAll(/<tr><td><a [^>]*>[^<]*<\/a><\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td><td>([^<]*)<\/td>/g)];
  a.ok(cells.length>=2,p+' has a plan table');
  for(const c of cells)for(const v of c.slice(1))a.ok(ruleText.has(v),`${p}: "${v}" is not in data/prop.json`);
  a.match(html(p),/Rules read|read November/,p+' shows the read date');
  a.doesNotMatch(html(p),/Apex Trader Funding [0-9]/,p+' quotes no Apex numbers');
}
// No affiliate links were set, so no "Visit" or sponsored link is rendered.
if(!process.env.TOPSTEP_URL&&!process.env.TRADEIFY_URL&&!process.env.MFFU_URL)for(const p of pages)a.doesNotMatch(html(p),/sponsored/,p);
// The deals slot is empty and renders nothing.
a.deepEqual(JSON.parse(read('data/deals.json')).deals,[]);for(const p of pages)a.doesNotMatch(html(p),/Current offers/,p);
// Deal entries are checked before they can go live.
const py=(deals,today)=>cp.spawnSync('python3',['-c',`import json,sys,datetime;sys.path.insert(0,${JSON.stringify(ROOT)});from insights import validate_deals;print(json.dumps(validate_deals(json.loads(sys.argv[1]),json.load(open(${JSON.stringify(path.join(ROOT,'data/prop.json'))}))['firms'],datetime.date.fromisoformat(sys.argv[2]))))`,JSON.stringify(deals),today],{encoding:'utf8'});
const good={firm:'topstep',title:'An offer',source:'https://www.topstep.com/',checked:'2026-11-20',expires:'2026-11-30'};
a.equal(JSON.parse(py([good],'2026-11-25').stdout).length,1);
a.equal(JSON.parse(py([good],'2026-12-01').stdout).length,0,'expired offers drop out');
for(const bad of [{...good,firm:'apex'},{...good,source:'http://x'},{...good,checked:'2026-12-01'},{...good,title:''}])a.notEqual(py([bad],'2026-11-25').status,0,JSON.stringify(bad));
// Glossary carries DefinedTermSet schema and no dollar figures.
const g=html('prop-firm-glossary');a.match(g,/"DefinedTermSet"/);a.doesNotMatch(g.split('<main')[1].split('</main>')[0],/\$\d/);
// The finder page's embedded data can't break out of its script tag.
const f=html('plan-finder');const blob=f.match(/<script type=application\/json id=plan-data>(.*?)<\/script>/s)[1];a.equal(JSON.parse(blob).length,L.length);
// Drive the finder in a small fake page: defaults render three plans; answers update the share link; text is escaped.
const inputs=[];for(const m of f.matchAll(/<input type=radio name="(\w+)" value="([^"]+)"[^>]*?( checked)?>/g))inputs.push({name:m[1],value:m[2],checked:!!m[3]});
let hash='',listener;const out={innerHTML:''};
const form={querySelector:s=>{const m=s.match(/name=(\w+)\](?:\[value="([^"]+)"\])?(:checked)?/);return inputs.find(i=>i.name===m[1]&&(m[2]?i.value===m[2]:i.checked))||null},addEventListener:(e,fn)=>{listener=fn}};
const links=JSON.parse(f.match(/id=plan-links>(.*?)<\/script>/s)[1]);
const doc={readyState:'complete',getElementById:id=>({'plan-finder':{querySelector:s=>s==='form'?form:out},'plan-data':{textContent:blob},'plan-links':{textContent:JSON.stringify(links)}})[id]};
vm.runInNewContext(read('src/plan-match.js'),{document:doc,location:{get hash(){return hash}},history:{replaceState:(_,__,h)=>{hash=h}},module:undefined});
a.equal((out.innerHTML.match(/class=card>/g)||[]).length,3);a.match(hash,/^#bigDay=unknown&skipEval=any/);
for(const i of inputs)if(i.name==='skipEval')i.checked=i.value==='yes';listener();
a.match(out.innerHTML,/Tradeify Lightning 50K/);a.match(hash,/skipEval=yes/);a.match(out.innerHTML,/Matched on each plan's published rules, not on payment/);
console.log('insights: pages built, rule text sourced, deals checked, glossary and finder page pass');
