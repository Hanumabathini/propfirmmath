/* PropFirmMath worldwide payout scenario. All FX rates supplied by user. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PMGlobal=factory()})(this,function(){
'use strict';
function n(v){var x=Number(v);return Number.isFinite(x)?x:NaN}
function payout(x){var gross=n(x.gross),split=n(x.split),fees=n(x.transfer),tax=n(x.tax),rate=n(x.fx),markup=n(x.markup);
if(![gross,split,fees,tax,rate,markup].every(Number.isFinite)||gross<0||split<0||split>100||fees<0||tax<0||tax>100||rate<=0||markup<0||markup>100)return null;
var share=gross*split/100,taxDue=share*tax/100,afterUsd=Math.max(0,share-taxDue-fees),local=afterUsd*rate*(1-markup/100);
return {share,taxDue,afterUsd,local,effectiveRate:rate*(1-markup/100)};
}
function init(){var root=document.getElementById('global-traders');if(!root)return;var $=function(x){return document.getElementById('gt-'+x)};
function fmt(x,cur){try{return new Intl.NumberFormat('en',{style:'currency',currency:cur,maximumFractionDigits:2}).format(x)}catch(_){return (cur==='Other'?'units':cur)+' '+x.toFixed(2)}}
function render(){var x={gross:$('gross').value,split:$('split').value,transfer:$('transfer').value,tax:$('tax').value,fx:$('fx').value,markup:$('markup').value};if(!$('fx').value.trim()){$('total').textContent='—';$('status').textContent='Enter the actual FX quote from your payout provider. No live rate is invented.';return}
var r=payout(x);if(!r){$('status').textContent='Check amounts, rates and fee percentages. FX must be greater than zero and shares between 0–100%.';$('total').textContent='—';return}
$('status').textContent='Hypothetical conversion for '+($('country').value||'your chosen country')+'. Country eligibility and tax obligations remain unverified.';
$('total').textContent=fmt(r.local,$('currency').value);$('share').textContent=fmt(r.share,'USD');$('net').textContent=fmt(r.afterUsd,'USD');$('rate').textContent=r.effectiveRate.toLocaleString('en',{maximumFractionDigits:8})+' per USD';
}
root.addEventListener('input',render);root.addEventListener('change',render);render();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()}return {payout};
});
