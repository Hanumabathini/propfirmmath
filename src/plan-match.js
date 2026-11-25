/* Plan finder: reads each sourced plan's published rules into comparable traits,
   scores plans against how a trader says they trade, and groups plans by rule.
   Everything here is derived from data/prop.json; nothing is ranked by payment. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PlanMatch=factory()})(this,function(){
"use strict";
const pctOf=s=>{const m=String(s||"").match(/(\d+(?:\.\d+)?)%/);return m?Number(m[1]):null};
const baseOf=label=>String(label||"").replace(/\s*\d+(?:\.\d+)?K$/i,"").trim();

function splitFor(f,base){
  const lines=f.payout||[],bases=(f.plans||[]).map(p=>baseOf(p.label)).filter(Boolean);
  const longer=bases.filter(b=>b!==base&&b.startsWith(base));
  const own=base?lines.filter(l=>l.startsWith(base)&&!longer.some(b=>l.startsWith(b))):[];
  const read=l=>{let m=l.match(/split (\d+)\/\d+/i)||l.match(/splits? (?:payouts )?(\d+)% to you/i);return m?Number(m[1]):null};
  for(const l of own){const v=read(l);if(v!=null)return v}
  for(const l of lines){if(bases.some(b=>b&&l.startsWith(b)))continue;const v=read(l);if(v!=null)return v}
  return null;
}

function traits(key,f,p){
  const c=String(p.consistency||""),dd=String(p.dd_type||""),dll=String(p.dll||""),price=String(p.price||"");
  const hasEval=Number(p.target)>0;
  let evalPct=null,payoutPct=null;
  if(!hasEval)payoutPct=pctOf(c);
  else if(/^none in the evaluation/i.test(c))payoutPct=pctOf(c.split(",").slice(1).join(","));
  else evalPct=pctOf(c);
  const intradayFunded=/intraday/i.test(dd);
  const dllKind=/^none/i.test(dll)?"none":/optional/i.test(dll)?"optional":/pause|ends the day/i.test(dll)?"pause":"limit";
  const pricing=/a month/i.test(price)?"monthly":/one time/i.test(price)?"one-time":"unpublished";
  return {firm:key,firmName:f.name,slug:f.slug,label:p.label||"",base:baseOf(p.label),hasEval,evalPct,payoutPct,
    eod:/end-of-day/i.test(dd)&&!intradayFunded,intradayFunded,dllKind,pricing,minDays:Number(p.min_days)||0,
    split:splitFor(f,baseOf(p.label)),rule:{price,consistency:c,dd:dd,dll,minDays:p.min_days,target:p.target}};
}

function allTraits(firms){
  const out=[];
  for(const [k,f] of Object.entries(firms||{}))if(f&&f.verified)for(const p of f.plans||[])out.push(traits(k,f,p));
  return out;
}

const SHARE={low:30,mid:50,high:65};
const QUESTIONS=[
  {k:"bigDay",q:"How big is your best day, compared with a good week's profit?",a:[["low","Under a third"],["mid","About a third to a half"],["high","More than half"],["unknown","Not sure"]]},
  {k:"skipEval",q:"Do you want to skip the evaluation?",a:[["no","No, I'll take an evaluation"],["yes","Yes, if I can"],["any","No preference"]]},
  {k:"redDays",q:"Do you sometimes have a big losing day before a recovery?",a:[["yes","Yes, now and then"],["no","Rarely"]]},
  {k:"drawdown",q:"When funded, does intraday trailing drawdown bother you?",a:[["eod","Yes, I want end-of-day"],["any","Either is fine"]]},
  {k:"pricing",q:"How would you rather pay?",a:[["one-time","One time"],["any","Monthly is fine"]]},
  {k:"speed",q:"How fast do you want to finish the evaluation?",a:[["fast","As few days as possible"],["any","No rush"]]},
  {k:"split",q:"How much does the profit split matter?",a:[["high","I want the highest split"],["any","Not much"]]}
];
const DEFAULTS={bigDay:"unknown",skipEval:"any",redDays:"no",drawdown:"any",pricing:"any",speed:"any",split:"any"};

function score(t,ans){
  const a={...DEFAULTS,...(ans||{})},why=[],watch=[];let s=0;
  if(a.skipEval==="no"&&!t.hasEval)return null;
  if(!t.hasEval){if(a.skipEval==="yes"){s+=3;why.push("No evaluation: you start in a funded account")}}
  else if(a.skipEval==="yes")s-=2;
  const share=SHARE[a.bigDay];
  if(t.hasEval){
    if(t.evalPct==null){s+=a.bigDay==="high"?3:1;why.push("No consistency rule in the evaluation")}
    else if(share!=null&&share<=t.evalPct){s+=1;why.push(`Your usual best day fits its ${t.evalPct}% evaluation limit`)}
    else if(share!=null){s-=3;watch.push(`Your best day is often over its ${t.evalPct}% evaluation limit`)}
    else watch.push(`Best day can be at most ${t.evalPct}% of evaluation profit`);
  }
  if(t.payoutPct!=null){
    if(share!=null&&share>t.payoutPct){s-=2;watch.push(`For payouts, your best day has to stay under ${t.payoutPct}%`)}
    else watch.push(`For payouts, best day at most ${t.payoutPct}%`);
  }
  if(a.redDays==="yes"){
    if(t.dllKind==="none"){s+=2;why.push("No daily loss limit in the evaluation")}
    else if(t.dllKind==="optional"){s+=1;why.push("The daily loss limit is optional")}
    else watch.push("A daily loss limit stops you for the day");
  }
  if(t.intradayFunded){if(a.drawdown==="eod")s-=2;watch.push("Drawdown turns intraday trailing once funded")}
  else if(t.eod&&a.drawdown==="eod"){s+=1;why.push("End-of-day drawdown, funded too")}
  if(t.pricing==="monthly"){if(a.pricing==="one-time"){s-=1;watch.push("Billed monthly until you pass")}}
  else if(t.pricing==="one-time"&&a.pricing==="one-time"){s+=1;why.push("One-time price")}
  if(t.pricing==="unpublished")watch.push("Price isn't published per size on the firm's pages");
  if(a.speed==="fast"&&t.hasEval){if(t.minDays<=1){s+=1;why.push(`Can pass in ${t.minDays||"any number of"} trading day${t.minDays===1?"":"s"}`)}else if(t.minDays>=4){s-=1;watch.push(`Needs at least ${t.minDays} trading days`)}}
  if(a.split==="high"&&t.split!=null){if(t.split>=90){s+=1;why.push(`${t.split}% profit split`)}else{s-=1;watch.push(`${t.split}% profit split`)}}
  return {score:s,why,watch};
}

function match(list,ans,n){
  return list.map((t,i)=>{const r=score(t,ans);return r&&{...t,...r,i}}).filter(Boolean)
    .sort((x,y)=>y.score-x.score||x.i-y.i).slice(0,n||3);
}

const enc=a=>Object.keys(DEFAULTS).map(k=>`${k}=${encodeURIComponent((a&&a[k])||DEFAULTS[k])}`).join("&");
function dec(h){const o={...DEFAULTS};for(const part of String(h||"").replace(/^#/,"").split("&")){const [k,v]=part.split("=");const q=QUESTIONS.find(x=>x.k===k);if(q&&q.a.some(x=>x[0]===decodeURIComponent(v||"")))o[k]=decodeURIComponent(v)}return o}

const CATEGORIES=[
  {path:"no-consistency-rule-prop-firms",title:"Futures prop firm plans with no consistency rule in the evaluation",short:"No evaluation consistency rule",
   test:t=>t.hasEval&&t.evalPct==null,
   lede:"These plans don't cap how much of your evaluation profit can come from one day. Most of them bring a best-day limit back once you ask for a payout, so check the payout rule too."},
  {path:"end-of-day-drawdown-prop-firms",title:"Futures prop firm plans with end-of-day trailing drawdown",short:"End-of-day drawdown",
   test:t=>t.eod,
   lede:"On these plans the drawdown follows your closing balance, not your open profit, and they don't switch to intraday trailing once you're funded. A winning trade you give back during the day doesn't move the failure level."},
  {path:"no-daily-loss-limit-prop-firms",title:"Futures prop firm plans with no daily loss limit in the evaluation",short:"No daily loss limit",
   test:t=>t.hasEval&&t.dllKind==="none",
   lede:"These evaluations publish no daily loss limit, so only the overall drawdown can end the account. A bad day still eats into that drawdown."},
  {path:"one-time-fee-prop-firms",title:"Futures prop firm plans with a one-time fee",short:"One-time fee",
   test:t=>t.pricing==="one-time",
   lede:"These plans charge once instead of billing you every month until you pass. Resets and activation, where they exist, are listed in each plan's price."},
  {path:"fastest-to-pass-prop-firms",title:"Futures prop firm evaluations you can pass in one trading day",short:"Pass in one day",
   test:t=>t.hasEval&&t.minDays<=1,
   lede:"These evaluations have no minimum of several trading days, so you can pass as soon as you reach the target within the rules. Passing fast is allowed, not required."},
  {path:"instant-funding-futures-prop-firms",title:"Futures prop firm plans with no evaluation",short:"No evaluation",
   test:t=>!t.hasEval,
   lede:"These plans start you in a funded account. There's no profit target to pass, but payout rules usually include a best-day limit and a profit goal."},
  {path:"90-percent-split-prop-firms",title:"Futures prop firm plans with a 90% profit split",short:"90% profit split",
   test:t=>t.split!=null&&t.split>=90,
   lede:"On these plans you keep at least 90% of each payout. The split is only one part of what you receive: caps, buffers and fees can matter more."}
];
const MIN_PLANS=2;
function categories(list){return CATEGORIES.map(c=>({...c,plans:list.filter(c.test)})).filter(c=>c.plans.length>=MIN_PLANS)}

function firmSummary(list,key){
  const ps=list.filter(t=>t.firm===key),uniq=xs=>[...new Set(xs)];
  return {plans:ps.length,pricing:uniq(ps.map(t=>t.pricing)),noEvalConsistency:ps.filter(t=>t.hasEval&&t.evalPct==null).map(t=>t.label),
    evalPcts:uniq(ps.filter(t=>t.evalPct!=null).map(t=>t.evalPct)).sort((a,b)=>a-b),
    minDays:uniq(ps.filter(t=>t.hasEval).map(t=>t.minDays)).sort((a,b)=>a-b),
    noDll:ps.filter(t=>t.hasEval&&t.dllKind==="none").map(t=>t.label),dllKinds:uniq(ps.filter(t=>t.hasEval).map(t=>t.dllKind)),
    intraday:ps.filter(t=>t.intradayFunded).map(t=>t.label),noEval:ps.filter(t=>!t.hasEval).map(t=>t.label),
    splits:uniq(ps.map(t=>t.split).filter(v=>v!=null)).sort((a,b)=>a-b)};
}

function differences(list,a,b){
  const A=firmSummary(list,a),B=firmSummary(list,b),na=(list.find(t=>t.firm===a)||{}).firmName,nb=(list.find(t=>t.firm===b)||{}).firmName,out=[];
  const pos=n=>/s$/.test(n)?n+"'":n+"'s",pr=s=>s.pricing.map(p=>p==="monthly"?"monthly billing":p==="one-time"?"a one-time fee":"prices not published per size").join(" or ");
  if(pr(A)!==pr(B))out.push(`Pricing: ${na} uses ${pr(A)}; ${nb} uses ${pr(B)}.`);
  const cons=(s,n)=>s.noEvalConsistency.length?`${n} has plans with no evaluation consistency rule (${s.noEvalConsistency.join(", ")})`:s.evalPcts.length?`${pos(n)} evaluation best-day limits are ${s.evalPcts.join("%, ")}%`:`${n} has no evaluation consistency rule on its plans`;
  out.push(`Consistency: ${cons(A,na)}; ${cons(B,nb)}.`);
  const md=(s,n)=>s.minDays.length?`${n} needs ${s.minDays.length>1?`${s.minDays[0]} to ${s.minDays.at(-1)}`:s.minDays[0]} minimum trading day${s.minDays.at(-1)===1?"":"s"}`:`${n} lists no evaluation`;
  if(String(A.minDays)!==String(B.minDays))out.push(`Minimum days: ${md(A,na)}; ${md(B,nb)}.`);
  const dl=(s,n)=>s.noDll.length?`${n} has evaluation plans with no daily loss limit (${s.noDll.join(", ")})`:s.dllKinds.length===1&&s.dllKinds[0]==="optional"?`${pos(n)} daily loss limit is optional`:`every ${n} evaluation lists a daily loss limit`;
  if(!!A.noDll.length!==!!B.noDll.length||A.noDll.length)out.push(`Daily loss limit: ${dl(A,na)}; ${dl(B,nb)}.`);
  if(A.intraday.length||B.intraday.length)out.push(`Funded drawdown: ${A.intraday.length?`${pos(na)} ${A.intraday.join(", ")} turns intraday trailing once funded`:`${pos(na)} plans stay end-of-day`}; ${B.intraday.length?`${pos(nb)} ${B.intraday.join(", ")} turns intraday trailing once funded`:`${pos(nb)} plans stay end-of-day`}.`);
  if(A.noEval.length||B.noEval.length)out.push(`No-evaluation option: ${A.noEval.length?`${na} offers ${A.noEval.join(", ")}`:`${na} has none in our data`}; ${B.noEval.length?`${nb} offers ${B.noEval.join(", ")}`:`${nb} has none in our data`}.`);
  const sp=s=>s.splits.length?s.splits.join("% or ")+"%":"not stated";
  if(sp(A)!==sp(B))out.push(`Profit split: ${na} pays ${sp(A)}; ${nb} pays ${sp(B)}.`);
  return out;
}

function pairs(list){const ks=[...new Set(list.map(t=>t.firm))],out=[];for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++)out.push([ks[i],ks[j]]);return out}

/* ---- browser UI for the plan finder page ---- */
function init(){
  const root=document.getElementById("plan-finder");if(!root)return;
  const list=JSON.parse(document.getElementById("plan-data").textContent),links=JSON.parse(document.getElementById("plan-links").textContent);
  const form=root.querySelector("form"),out=root.querySelector(".finder-results"),esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const read=()=>{const a={};for(const q of QUESTIONS){const el=form.querySelector(`input[name=${q.k}]:checked`);if(el)a[q.k]=el.value}return a};
  const set=a=>{for(const q of QUESTIONS){const el=form.querySelector(`input[name=${q.k}][value="${a[q.k]}"]`);if(el)el.checked=true}};
  function render(){
    const a=read(),res=match(list,a,3);
    history.replaceState(null,"","#"+enc(a));
    if(!res.length){out.innerHTML="<p>No sourced plan fits those answers. Try “No preference” on a question.</p>";return}
    out.innerHTML="<h2>Your closest plans</h2><ol class=finder-list>"+res.map((t,i)=>`<li class=card><div class=finder-head><span class=finder-rank>${i+1}</span><div><strong>${esc(t.firmName)} ${esc(t.label)}</strong><small>${esc(t.rule.price)}</small></div></div>`+
      (t.why.length?`<p class=finder-sub>Why it fits</p><ul class=finder-why>${t.why.map(w=>`<li>${esc(w)}</li>`).join("")}</ul>`:"")+
      (t.watch.length?`<p class=finder-sub>Watch for</p><ul class=finder-watch>${t.watch.map(w=>`<li>${esc(w)}</li>`).join("")}</ul>`:"")+
      `<p class=finder-links><a href="${esc(links[t.firm].rules)}">Read ${esc(t.firmName)}'s rules</a>`+(links[t.firm].visit?` · <a href="${esc(links[t.firm].visit)}" rel="sponsored noopener" target=_blank>Visit ${esc(t.firmName)}</a> <span class=note>(affiliate link)</span>`:"")+`</p></li>`).join("")+
      "</ol><p class=note>Matched on each plan's published rules, not on payment. Copy this page's address to share your answers.</p>";
  }
  set(dec(location.hash));form.addEventListener("change",render);render();
}
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
return {traits,allTraits,score,match,enc,dec,QUESTIONS,DEFAULTS,CATEGORIES,MIN_PLANS,categories,firmSummary,differences,pairs};
});
