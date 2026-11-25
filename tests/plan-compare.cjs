// Plan analysis journal: tests the current exports (rules, journal) of src/plan-compare.js.
const a=require('node:assert/strict'),PC=require('../src/plan-compare.js');
a.equal(typeof PC.rules,'function');a.equal(typeof PC.journal,'function');
// Rules read from a sourced plan.
const top=PC.rules({name:'Topstep'},{label:'50K',target:'$3,000',consistency:'Best day at most 50% of profit',days:2});
a.deepEqual(top,{target:3000,pct:50,days:2,basis:'net',funded:false});
// Percent targets resolve against the account size in the label.
a.equal(PC.rules({name:'X'},{label:'Growth 100K',target:'6%',consistency:'None',days:'1'}).target,6000);
// Funded / instant plans model no evaluation target or ratio.
const fund=PC.rules({name:'Tradeify'},{label:'Lightning 50K',target:0,consistency:'20%, 25%, then 30% for payouts'});
a.equal(fund.funded,true);a.equal(fund.target,null);a.equal(fund.pct,null);
// Running journal: totals, best-day share, target remaining, extra profit, day count.
const r=PC.journal([600,-300,1200,400,500].map(pnl=>({pnl,fee:0})),{target:3000,pct:40,days:5,basis:'net'});
const last=r.at(-1);
a.equal(last.total,2400);a.equal(last.ratio,50);a.equal(last.ratioMet,false);a.equal(last.remaining,600);a.equal(last.extra,600);a.equal(last.count,5);a.equal(last.daysMet,true);
// Gross basis adds commissions back before the ratio.
const g=PC.journal([{pnl:100,fee:10},{pnl:100,fee:10}],{target:null,pct:60,days:null,basis:'gross'}).at(-1);
a.equal(g.total,200);a.equal(g.ratio,50);a.equal(g.ratioMet,true);
// Blank days are skipped, not counted as zero.
const b=PC.journal([{pnl:100,fee:0},{pnl:null,fee:0},{pnl:50,fee:0}],{target:1000,pct:0,days:3,basis:'net'});
a.equal(b[1],null);a.equal(b[2].count,2);a.equal(b[2].ratioMet,true);a.equal(b[2].daysMet,false);
console.log('Plan comparison math tests passed.');
