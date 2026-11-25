const a=require('node:assert/strict'),PC=require('../src/plan-compare.js');
let p={percent:40,basis:'net'},r=PC.assess([600,-300,1200,400,500],p,[]);
a.equal(r.total,2400);a.equal(r.best,1200);a.equal(r.ratio,50);a.equal(r.more,600);a.equal(r.winDays,4);a.equal(r.ratioMet,false);
let t=PC.assess([100,100],{percent:60,basis:'before-commission'},[10,10]);a.equal(t.total,220);a.equal(t.ratioMet,true);
a.equal(PC.assess([100,'oops'],p,[]),null);
console.log('Plan comparison math tests passed.');
