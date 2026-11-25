/* Plan comparison: read official JSON presets, apply a consistent mathematical basis per plan. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PlanCompare=factory()})(this,function(){
'use strict';
function parse(s){return String(s||'').split(/[\s,;]+/).filter(Boolean).map(v=>Number(v.replace(/\$/g,'')))}
function assess(days,plan,fees){if(!plan||!days.length||days.some(v=>!Number.isFinite(v)))return null;
if(plan.basis==='before-commission'&&fees&&fees.length===days.length&&fees.every(v=>Number.isFinite(v))){days=days.map((v,i)=>v+fees[i]);}
let total=days.reduce((a,b)=>a+b,0),best=Math.max(0,...days),pct=total>0?best/total*100:null,threshold=Number(plan.percent);
let need=threshold>0?best/(threshold/100):Infinity;return {total,best,ratio:pct,required:need,more:Math.max(0,need-total),days:days.length,winDays:days.filter(v=>v>0).length,ratioMet:total>0&&best>0&&pct<=threshold+1e-9};
}
function init(){const root=document.getElementById('plan-compare');if(!root)return;let plans=[];const $=x=>document.getElementById('pc-'+x),escape=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';'),fmt=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
function render(){let days=parse($('days').value),fees=$('fees').value.trim()?parse($('fees').value):[];
if(days.some(v=>!Number.isFinite(v))){$('status').textContent='Enter valid numeric daily P/L values.';$('results').textContent='';return;}
if(fees.length&&fees.length!==days.length){$('status').textContent='Daily commission entries must match the number of P/L days.';$('results').textContent='';return;}
$('status').textContent='Same '+days.length+' entered days compared; no firm can be confirmed passed from this screen alone.';
$('results').innerHTML=['a','b','c'].map(id=>{let p=plans.find(z=>z.id===$(id).value),r=assess(days,p,fees);if(!r||!p)return '';
let info=r.ratio===null?'Not in profit yet':r.ratio.toFixed(2)+'% of profit';
return '<div class="card" style="margin:12px 0"><p class="note">'+escape(p.firm)+' · '+escape(p.label)+'</p><div class="big '+(r.ratioMet?'pos':'neg')+'">'+escape(info)+'</div><div class="kpis"><div class="kpi"><small>Limit</small><b>'+p.percent+'%</b></div><div class="kpi"><small>Best day</small><b>'+fmt(r.best)+'</b></div><div class="kpi"><small>More needed</small><b>'+fmt(r.more)+'</b></div></div><p class="note">P/L basis: '+(p.basis==='before-commission'?'before commissions':'net of commissions')+'. '+(r.ratioMet?'Ratio condition met; other rules may remain.':'Ratio is over threshold.')+'</p><p><a href="'+escape(p.source)+'" target="_blank" rel="noopener">Official rules</a> · source reviewed '+escape(p.checked)+'</p></div>';
}).join('');}
function setup(list){plans=list;let opts='<option value="">Choose an official preset</option>'+list.map(p=>'<option value="'+escape(p.id)+'">'+escape(p.label)+'</option>').join('');
['a','b','c'].forEach((id,i)=>{$(id).innerHTML=opts;$(id).value=list[i]&&list[i].id||''});render();}
root.addEventListener('input',render);root.addEventListener('change',render);
let endpoint=location.pathname.replace(/plan-compare\/?$/,'consistency-plans.json');
fetch(endpoint).then(r=>{if(!r.ok)throw Error('plans unavailable');return r.json()}).then(setup).catch(()=>{$('status').textContent='Official preset data could not load. Use the standalone manual consistency calculator.'});}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()}
return {parse,assess};
});
