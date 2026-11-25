const a=require('node:assert/strict'),G=require('../src/global-traders.js'),P=require('../src/prop.js');
let x=G.payout({gross:2000,split:90,transfer:30,tax:0,fx:80,markup:2});
a.equal(x.share,1800);a.equal(x.afterUsd,1770);a.ok(Math.abs(x.local-138768)<0.01);
a.equal(G.payout({gross:2000,split:110,transfer:0,tax:0,fx:80,markup:0}),null);
let p=P.payout({balance:53500,start:50000,buffer:500,split:200});
a.equal(p.firmShare,0);a.equal(p.receive,3000);
console.log('PropFirmMath global calculation tests passed.');
