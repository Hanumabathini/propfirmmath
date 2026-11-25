(() => {
"use strict";
const data=JSON.parse(document.getElementById("fc-data").textContent);
const firm=Array.from(document.querySelectorAll("[data-firm]")),plan=Array.from(document.querySelectorAll("[data-plan]"));
const table=document.getElementById("fc-table"),status=document.getElementById("fc-status");
const selected=i=>firm[i].value===""?null:data[Number(firm[i].value)];
function options(i){const f=selected(i);plan[i].replaceChildren();if(!f){plan[i].disabled=true;return;}plan[i].disabled=false;f.plans.forEach((p,j)=>{const o=document.createElement("option");o.value=j;o.textContent=p.label;plan[i].append(o);});}
function cell(row,tag,value){const c=document.createElement(tag);c.textContent=value;row.append(c);return c;}
function link(c,href,label){const a=document.createElement("a");a.href=href;a.textContent=label;c.append(a);}
function render(){const picks=firm.map((_,i)=>{const f=selected(i);return f?{f,p:f.plans[Number(plan[i].value)||0]}:null;}).filter(Boolean);
const head=table.tHead,body=table.tBodies[0];head.replaceChildren();body.replaceChildren();
const h=head.insertRow();cell(h,"th","Comparison");picks.forEach(({f,p})=>cell(h,"th",f.name+" · "+p.label));
const rows=[["Regional eligibility","region"],["Category","category"],["Data status","status"],["Account / plan","label"],["Published price / fees","price"],["Profit target","target"],["Maximum drawdown","dd"],["Drawdown type","dd_type"],["Daily loss limit","dll"],["Contract limits","contracts"],["Minimum trading days","days"],["Consistency rule","consistency"],["Source date","checked"]];
const statusNames={"sourced-preset":"Sourced plan data","partial-source":"Partial source data","research-needed":"Research pending"};
rows.forEach(([label,key])=>{const r=body.insertRow();cell(r,"th",label);const values=picks.map(({f,p})=>key==="region"?window.PFMRegion.region(f.name,window.PFMRegion.get()).label:key==="status"?statusNames[f.status]:p[key]??f[key]??"Not verified");values.forEach(v=>cell(r,"td",v));if(values.length===2&&values[0]!==values[1]&&values.every(v=>v!=="Not verified")&&["price","target","dd","dll","contracts","days","consistency","dd_type"].includes(key))r.classList.add("compare-difference");});
let r=body.insertRow();cell(r,"th","Funded payout notes (firm-wide; check plan)");picks.forEach(({f})=>{const c=cell(r,"td","");if(!f.payout.length){c.textContent="Not verified";return;}const ul=document.createElement("ul");f.payout.forEach(t=>{const li=document.createElement("li");li.textContent=t;ul.append(li);});c.append(ul);});
r=body.insertRow();cell(r,"th","Firm profile and sources");picks.forEach(({f})=>{const c=cell(r,"td","");link(c,f.profile,"View firm profile");if(f.sources.length){const ul=document.createElement("ul");f.sources.forEach(([u,t])=>{const li=document.createElement("li");link(li,u,t);ul.append(li);});c.append(ul);}});
status.textContent=picks.length+" selections. "+(picks.length<2?"Choose at least two plans for a comparison.":"Compare costs and rules within the same account stage; prices are not live quotes.");
}
const defaults=firm.map(el=>el.value);
document.getElementById("fc-reset").addEventListener("click",()=>{firm.forEach((el,i)=>{el.value=defaults[i];options(i);});render();});
window.addEventListener("pfm-country-change",()=>{firm.forEach(el=>{Array.from(el.options).forEach(o=>{if(o.value==="")return;const f=data[Number(o.value)],r=window.PFMRegion.region(f.name,window.PFMRegion.get());o.disabled=r.blocked;o.textContent=f.name+(r.blocked?" — restricted":r.label==="Regional eligibility unverified"?" — unverified":"");});if(el.selectedOptions[0]?.disabled){el.value="";options(firm.indexOf(el));}});render();});
firm.forEach((el,i)=>{options(i);el.addEventListener("change",()=>{options(i);render();});plan[i].addEventListener("change",render);});render();
})();