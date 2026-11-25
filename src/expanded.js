(()=>{'use strict';
const $=id=>document.getElementById(id);
const search=$('directory-search');
if(search){const cards=[...document.querySelectorAll('.directory-card')];const filter=()=>{let count=0;for(const c of cards){const visible=c.dataset.name.includes(search.value.trim().toLowerCase())&&(!$('directory-category').value||c.dataset.category===$('directory-category').value)&&(!$('directory-status').value||c.dataset.status===$('directory-status').value);c.hidden=!visible;if(visible)count++;}$('directory-count').textContent=count+' of '+cards.length+' entries';};[search,$('directory-category'),$('directory-status')].forEach(el=>el.addEventListener('input',filter));filter();}
const form=$('workspace-form');if(!form)return;
let result=null;const out=$('workspace-result'),chart=$('workspace-chart'),exp=$('workspace-export');
const fmt=v=>new Intl.NumberFormat(undefined,{maximumFractionDigits:2,minimumFractionDigits:2}).format(v);
form.addEventListener('submit',ev=>{ev.preventDefault();result=null;exp.disabled=true;out.replaceChildren();chart.replaceChildren();if(!form.reportValidity())return;
const x=Object.fromEntries([...form.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,Number(el.value)]));
const fail=msg=>{out.textContent=msg;};
if(Object.values(x).some(v=>!Number.isFinite(v)||v<0))return fail('Enter finite nonnegative values.');
let rows,bars;
if($('expanded-workspace').dataset.mode==='seller'){
if(!Number.isInteger(x.units)||x.units<1||[x.rate,x.refund,x.fx].some(v=>v>100))return fail('Units must be a positive integer; percentages must be 0–100.');
const gross=x.price*x.units,retained=gross*(1-x.refund/100),fees=gross*x.rate/100+x.fixed*x.units,cost=(x.cost+x.shipping)*x.units+x.overhead,conversion=retained*x.fx/100,profit=retained-fees-cost-conversion;
const factor=(1-x.refund/100)*(1-x.fx/100)-x.rate/100;
rows=[['Gross sales',gross],['Retained revenue',retained],['Fees',fees],['Costs',cost],['Conversion cost',conversion],['Estimated net profit',profit],['Net margin %',gross?profit/gross*100:null],['Break-even unit price',factor>0?(cost+x.fixed*x.units)/(x.units*factor):null]];
bars=[['Retained revenue',retained],['Fees',fees],['Operating costs',cost],['Conversion',conversion],['Net profit',profit]];
}else{
if(!Number.isInteger(x.accounts)||x.accounts<1||x.rate<=0||x.split>100||x.fx>100)return fail('Accounts must be a positive integer, FX quote positive, and percentages 0–100.');
const available=Math.max(0,x.balance-x.buffer),request=Math.min(available,x.cap||Infinity)*x.accounts,share=request*x.split/100,conversion=share*x.fx/100,net=share-conversion-x.cost;
rows=[['Aggregate hypothetical request',request],['Trader share',share],['Conversion costs',conversion],['Operating costs',x.cost],['Net source-currency proceeds',net],['Net destination-currency proceeds',net*x.rate]];
bars=[['Request',request],['Trader share',share],['Conversion',conversion],['Costs',x.cost],['Net proceeds',net]];
}
if(rows.some(([,v])=>v!==null&&!Number.isFinite(v)))return fail('Values too large to calculate.');
result=rows;for(const [k,v] of rows){const line=document.createElement('div');line.className='analysis-row';const label=document.createElement('span'),value=document.createElement('strong');label.textContent=k;value.textContent=v===null?'Not defined':fmt(v);line.append(label,value);out.append(line);}
const max=Math.max(1,...bars.map(([,v])=>Math.abs(v)));for(const [k,v] of bars){const line=document.createElement('div');line.className='chart-row';const label=document.createElement('span');label.textContent=k+' · '+fmt(v);const track=document.createElement('div');track.className='chart-track';const bar=document.createElement('div');bar.className='chart-fill'+(v<0?' negative':'');bar.style.width=(Math.abs(v)/max*100)+'%';track.append(bar);line.append(label,track);chart.append(line);}exp.disabled=false;
});
exp.addEventListener('click',()=>{if(!result)return;const csv='Metric,Value\n'+result.map(([k,v])=>k+','+(v===null?'':v.toFixed(2))).join('\n');const a=document.createElement('a');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.href=u;a.download='scenario.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
})();