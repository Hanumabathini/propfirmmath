/* Single-account daily journal. No intraday breach or payout eligibility inference. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PlanCompare=factory()})(this,function(){
"use strict";
const cents=n=>Math.round(n*100)/100;
function rules(f,p){
 const size=Number(p.size)||Number((p.label.match(/(\d+(?:\.\d+)?)K\b/i)||[])[1])*1000;
 function money(v){if(typeof v==="number")return v;if(typeof v!=="string")return null;const m=v.match(/^\$([\d,]+(?:\.\d+)?)$/);if(m)return Number(m[1].replace(/,/g,""));const pct=v.match(/^(\d+(?:\.\d+)?)%$/);return pct&&size>0?cents(size*Number(pct[1])/100):null;}
 const text=p.consistency||"",evalText=text.split(/[,;]\s*(?:\d+%\s+for\s+(?:funded\s+)?payouts|\d+%\s+for\s+funded)/i)[0];
 const no=/^None\b/i.test(evalText),m=evalText.match(/(?:at most\s+|^)(\d+(?:\.\d+)?)%/i);
 const funded=/Lightning|Instant|Direct Funding/i.test(p.label)||p.target===0||p.target==="No evaluation";
 const pct=funded?null:no?0:m&&!/funded|payout/i.test(evalText)?Number(m[1]):null;
 const days=/^\d+$/.test(String(p.days))?Number(p.days):null;
 return {target:funded?null:money(p.target),pct,days:funded?null:days,basis:f.name==="Tradeify"&&pct>0?"gross":"net",funded};
}
function journal(entries,r){let total=0,basisTotal=0,best=0,count=0;
 return entries.map(e=>{if(e.pnl===null)return null;count++;total=cents(total+e.pnl);const b=cents(e.pnl+(r.basis==="gross"?e.fee:0));basisTotal=cents(basisTotal+b);best=Math.max(best,b);const ratio=basisTotal>0?best/basisTotal*100:null;const ratioMet=r.pct===0?true:r.pct===null?null:ratio!==null&&ratio<=r.pct+1e-9;const remaining=r.target===null?null:Math.max(0,cents(r.target-total));const extra=r.pct>0?Math.max(0,Math.ceil((best/(r.pct/100)-basisTotal)*100-1e-8)/100):null;return {total,ratio,ratioMet,remaining,extra,count,daysMet:r.days===null?null:count>=r.days};});
}
function init(){
 const root=document.getElementById("plan-compare");if(!root)return;const $=x=>document.getElementById("pc-"+x),data=JSON.parse($("data").textContent),R=window.PFMRegion;
 const usd=n=>n===null||n===undefined?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
 let rows=[],activeKey="";
 function load(){try{const x=JSON.parse(sessionStorage.getItem(activeKey)||"[]");return Array.isArray(x)?x.slice(0,365):[]}catch(_){return []}}
 function save(){if(activeKey)try{sessionStorage.setItem(activeKey,JSON.stringify(rows))}catch(_){}}
 function selected(){const f=$("firm").value===""?null:data[Number($("firm").value)];return [f,f?.plans[Number($("plan").value)||0]]}
 function input(type,value,label,fn){const x=document.createElement("input");x.type=type;x.value=value??"";x.setAttribute("aria-label",label);if(type==="number"){x.step=".01";x.inputMode="decimal";}x.addEventListener("input",()=>{fn(x.value);save();render();});return x;}
 function draw(){const body=$("days");body.replaceChildren();rows.forEach((e,i)=>{const tr=body.insertRow();tr.insertCell().textContent=i+1;tr.insertCell().append(input("date",e.date,"Date day "+(i+1),v=>e.date=v));tr.insertCell().append(input("number",e.pnl,"Net P/L day "+(i+1),v=>e.pnl=v));const fee=input("number",e.fee,"Commission day "+(i+1),v=>e.fee=v);fee.min="0";tr.insertCell().append(fee);for(let j=0;j<4;j++)tr.insertCell();tr.insertCell().append(input("text",e.note,"Notes day "+(i+1),v=>e.note=v));});render();}
 function read(){return rows.map(e=>({pnl:e.pnl===""||e.pnl==null?null:Number(e.pnl),fee:e.fee===""||e.fee==null?0:Number(e.fee)}));}
 function render(){const [f,p]=selected();$("summary").replaceChildren();$("context").textContent=R.name(R.get())+" · Account rules in USD; receiving currency "+(R.currency(R.get())||"not selected");if(!p){$("rule").textContent="No eligible account selected."; $("status").textContent="Select an available firm and plan.";return;}const r=rules(f,p),entries=read();$("rule").textContent=f.name+" · "+p.label+" | Target: "+(p.target??"Not verified")+" | Consistency: "+(p.consistency||"Not verified")+" | Minimum days: "+(p.days??"Not verified");$("profile").href=f.profile;
 if(entries.some(e=>e.pnl!==null&&!Number.isFinite(e.pnl)||!Number.isFinite(e.fee)||e.fee<0)){$("status").textContent="Enter valid P/L and nonnegative commissions.";return;}
 const result=journal(entries,r);result.forEach((v,i)=>{const cells=$("days").rows[i].cells;cells[4].textContent=v?usd(v.total):"—";cells[5].textContent=v&&v.ratio!==null?v.ratio.toFixed(2)+"%":"—";cells[6].textContent=v?usd(v.remaining):"—";cells[7].textContent=!v?"—":r.funded?"Funded rules not modeled":v.ratioMet===null?"Rule unverified":v.ratioMet?"Ratio met":"Ratio above limit / no profit";cells[4].className=v&&v.total<0?"neg":v&&v.total>0?"pos":"";});
 const last=result.filter(Boolean).at(-1);const metrics=[["Completed days",last?.count||0],["Net P/L",usd(last?.total??0)],["Target remaining",usd(last?.remaining??r.target)],["Consistency limit",r.pct===null?"Not modeled":r.pct===0?"None":r.pct+"%"],["Extra profit for ratio",usd(last?.extra)],["Minimum days",r.days===null?"Not verified":(last?.count||0)+" / "+r.days]];
 metrics.forEach(([k,v])=>{const b=document.createElement("div");b.className="kpi";const s=document.createElement("small"),n=document.createElement("b");s.textContent=k;n.textContent=v;b.append(s,n);$("summary").append(b);});
 $("status").textContent=r.funded?"Funded account journal only; no evaluation target or payout eligibility modeled.":r.target===null||r.pct===null?"Some account rules are unverified; only supported metrics are calculated.":"Progress only: meeting target, days and ratio does not confirm a pass.";
 }
 function switchPlan(){save();const [f,p]=selected();activeKey=p?"pfm-journal:"+R.get()+":"+f.name+":"+p.label:"";rows=p?load():[];if(p&&!rows.length)rows=Array.from({length:5},()=>({date:"",pnl:"",fee:"",note:""}));["add","export","clear"].forEach(k=>$(k).disabled=!p);draw();}
 function plans(preferred){const [f]=selected();$("plan").replaceChildren();if(f)f.plans.forEach((p,i)=>$("plan").add(new Option(p.label,String(i))));$("plan").disabled=!f;if(preferred&&f){const i=f.plans.findIndex(p=>p.label===preferred);if(i>=0)$("plan").value=String(i);}switchPlan();}
 function sync(){const [old,p]=selected();let preferred;try{preferred=JSON.parse(sessionStorage.getItem("pfm-selected-account")||"null")}catch(_){}$("firm").replaceChildren(new Option("Choose available firm",""));data.forEach((f,i)=>{if(R.available(f.name))$("firm").add(new Option(f.name,String(i)));});const match=data.findIndex(f=>f.name===(old?.name||preferred?.firm));if(match>=0&&Array.from($("firm").options).some(o=>o.value===String(match)))$("firm").value=String(match);else if($("firm").options.length>1)$("firm").selectedIndex=1;plans(p?.label||preferred?.plan);}
 $("firm").addEventListener("change",()=>plans());$("plan").addEventListener("change",switchPlan);$("add").addEventListener("click",()=>{if(rows.length>=365)return;rows.push({date:"",pnl:"",fee:"",note:""});save();draw();});$("clear").addEventListener("click",()=>{if(!confirm("Clear the selected account journal?"))return;rows=Array.from({length:5},()=>({date:"",pnl:"",fee:"",note:""}));save();draw();});
 $("export").addEventListener("click",()=>{const [f,p]=selected();if(!p)return;const out=journal(read(),rules(f,p));const quote=v=>'"'+String(v??"").replace(/"/g,'""').replace(/^[=+@-](?!\d)/,"'$&")+'"';const lines=[["Day","Date","Net P/L USD","Commission USD","Cumulative net USD","Best day share %","Target remaining USD","Notes"],...rows.map((e,i)=>[i+1,e.date,e.pnl,e.fee,out[i]?.total,out[i]?.ratio?.toFixed(2),out[i]?.remaining,e.note])];const url=URL.createObjectURL(new Blob([lines.map(r=>r.map(quote).join(",")).join("\r\n")],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download="propfirmmath-trading-journal.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 window.addEventListener("pfm-country-change",sync);sync();
}
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}return {rules,journal};
});