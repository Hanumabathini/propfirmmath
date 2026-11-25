(function(){var s=document.getElementById("hf-country");if(!s||!window.PFMEligibility||!window.PFM_POLICIES||!window.PFMRegion)return;
var R=window.PFMRegion,P=window.PFM_POLICIES.firms,out=document.getElementById("hf-res"),go=document.getElementById("hf-go"),base=go.getAttribute("href");
var names=Array.from(document.querySelectorAll(".discover-table .discover-firm strong")).map(function(n){return n.textContent});
Object.keys(R.mapping).sort(function(a,b){return R.name(a).localeCompare(R.name(b))}).forEach(function(c){s.add(new Option(R.name(c),c))});
function row(label,n,cls){var d=document.createElement("div");d.className="row";var a=document.createElement("span");a.textContent=label;var b=document.createElement("b");b.textContent=n;d.append(a,b);return d}
function draw(){var c=s.value;out.replaceChildren();go.setAttribute("href",c?base+"?country="+c:base);if(!c){var p=document.createElement("p");p.className="note hf-note";p.textContent="See which firms restrict your country, straight from each firm's own policy page.";out.append(p);return}
var f=Object.keys(P),k={restricted:0,ok:0,review:0};f.forEach(function(n){var r=window.PFMEligibility.evaluate(P,n,c);if(r.status==="restricted")k.restricted++;else if(r.status==="review")k.review++;else k.ok++});
out.append(row("Restricted for new accounts",k.restricted),row("Not on restricted list",k.ok),row("Confirm with the firm",k.review));var n=document.createElement("p");n.className="sep";n.textContent="Of the "+f.length+" firms with a reviewed country policy. Not on a restricted list is not a promise: KYC and plan checks still apply.";out.append(n)}
var siteSelect = document.getElementById("site-country");
function syncCountry() {
  s.value = R.mapping[R.get()] ? R.get() : "";
  draw();
}
s.addEventListener("change", function () {
  siteSelect.value = s.value;
  siteSelect.dispatchEvent(new Event("change"));
});
window.addEventListener("pfm-country-change", syncCountry);
syncCountry();
})();
