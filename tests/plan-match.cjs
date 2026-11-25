const a=require('node:assert/strict'),PM=require('../src/plan-match.js'),D=require('../data/prop.json');
const L=PM.allTraits(D.firms),get=(f,l)=>L.find(t=>t.firm===f&&t.label===l);
// Only firms whose rules we sourced are read; Apex has no numbers.
a.equal(L.length,10);a.ok(!L.some(t=>t.firm==='apex'));
// Each plan's traits come from its published rule text.
const want={
 'topstep|50K':{hasEval:true,evalPct:55,payoutPct:null,eod:true,dllKind:'optional',pricing:'monthly',minDays:2,split:90},
 'topstep|150K':{evalPct:55,pricing:'monthly',split:90},
 'tradeify|Growth 50K':{hasEval:true,evalPct:null,payoutPct:35,eod:true,dllKind:'pause',pricing:'one-time',minDays:1,split:90},
 'tradeify|Select 50K':{evalPct:40,dllKind:'none',pricing:'one-time',minDays:3,split:90},
 'tradeify|Lightning 50K':{hasEval:false,evalPct:null,payoutPct:20,eod:true,pricing:'one-time',split:90},
 'mffu|Builder 50K':{evalPct:null,payoutPct:50,dllKind:'pause',pricing:'one-time',minDays:1,split:80},
 'mffu|Rapid 50K':{evalPct:50,eod:false,intradayFunded:true,dllKind:'none',pricing:'unpublished',minDays:2,split:90},
 'mffu|Rapid EOD 50K':{evalPct:30,eod:true,intradayFunded:false,minDays:4,split:90},
 'mffu|Pro 50K':{evalPct:50,pricing:'one-time',minDays:2,split:80}};
for(const [k,v] of Object.entries(want)){const [f,l]=k.split('|'),t=get(f,l);a.ok(t,k);for(const [p,x] of Object.entries(v))a.equal(t[p],x,`${k} ${p}`)}
// Plan finder: an evaluation-only answer never returns the no-evaluation plan.
a.ok(!PM.match(L,{skipEval:'no'},10).some(t=>!t.hasEval));
a.equal(PM.match(L,{skipEval:'yes'},1)[0].label,'Lightning 50K');
// Big best days favour plans with no evaluation consistency rule, and say why.
const big=PM.match(L,{bigDay:'high'},2);a.deepEqual(big.map(t=>t.label).sort(),['Builder 50K','Growth 50K']);
a.ok(big[0].why.includes('No consistency rule in the evaluation'));a.ok(big[0].watch.some(w=>/For payouts/.test(w)));
// A trader who wants end-of-day drawdown is warned off Rapid's intraday funded drawdown.
const r=PM.score(get('mffu','Rapid 50K'),{drawdown:'eod'});a.ok(r.watch.includes('Drawdown turns intraday trailing once funded'));
a.ok(PM.match(L,{drawdown:'eod'},10).at(-1).label!==undefined);
a.ok(PM.score(get('topstep','50K'),{pricing:'one-time'}).watch.includes('Billed monthly until you pass'));
// Answers survive the share link round trip; junk is ignored.
const ans={bigDay:'mid',skipEval:'no',redDays:'yes',drawdown:'eod',pricing:'one-time',speed:'fast',split:'high'};
a.deepEqual(PM.dec('#'+PM.enc(ans)),ans);a.deepEqual(PM.dec('#bigDay=<x>&evil=1'),PM.DEFAULTS);
// Every question offers the default answer, so a fresh form is valid.
for(const q of PM.QUESTIONS)a.ok(q.a.some(x=>x[0]===PM.DEFAULTS[q.k]),q.k);
// Best-for groups need two sourced plans before they become a page.
const cats=PM.categories(L),byPath=Object.fromEntries(cats.map(c=>[c.path,c.plans.map(t=>t.firm+' '+t.label)]));
a.ok(cats.every(c=>c.plans.length>=PM.MIN_PLANS));
a.deepEqual(byPath['no-consistency-rule-prop-firms'],['tradeify Growth 50K','mffu Builder 50K']);
a.ok(!byPath['end-of-day-drawdown-prop-firms'].includes('mffu Rapid 50K'));
a.deepEqual(byPath['instant-funding-futures-prop-firms'],undefined,'one no-evaluation plan is too few for a page');
a.ok(!byPath['one-time-fee-prop-firms'].some(p=>p.startsWith('topstep')));
// Firm vs firm differences quote only what the data says.
a.equal(PM.pairs(L).length,3);
const d=PM.differences(L,'topstep','mffu');
a.ok(d.some(x=>x.startsWith('Pricing: Topstep uses monthly billing')));
a.ok(d.some(x=>x.includes("MyFundedFutures' Rapid 50K turns intraday trailing once funded")));
a.ok(d.some(x=>x.startsWith("Daily loss limit: Topstep's daily loss limit is optional;")));
a.ok(d.some(x=>x==='Profit split: Topstep pays 90%; MyFundedFutures pays 80% or 90%.'));
a.ok(!PM.differences(L,'topstep','tradeify').some(x=>x.startsWith('Profit split')),'equal splits are not a difference');
console.log('plan-match: traits, finder, share links, best-for groups and firm differences pass');
