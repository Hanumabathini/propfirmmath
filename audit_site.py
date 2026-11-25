"""Validate generated site links, assets, sitemap and page reachability."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET
import os, sys, posixpath
root=Path("dist")
base=(os.environ.get("BASE_PATH") or "/propfirmmath").rstrip("/")
origin=urlsplit(os.environ.get("SITE_URL") or "https://hanumabathini.github.io").netloc
class Doc(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.ids=set(); self.canon=[]; self.h1=0; self.duplicates=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get("id"):
            if a["id"] in self.ids:self.duplicates.append(a["id"])
            self.ids.add(a["id"])
        if tag=="h1":self.h1+=1
        if tag=="link" and a.get("rel")=="canonical":self.canon.append(a.get("href"))
        elif tag in ("a","link","script","img","source"):
            v=a.get("href") or a.get("src")
            if v:self.links.append((tag,v))
docs={}
for p in root.rglob("*.html"):
    d=Doc();d.feed(p.read_text());docs[p.relative_to(root).as_posix()]=d
def route(f):return "/"+f.removesuffix("index.html") if f.endswith("index.html") else "/"+f
def resolve(f,v):
    u=urlsplit(v)
    if u.scheme not in ("","http","https") or u.netloc and u.netloc!=origin:return None
    p=unquote(u.path)
    if not p:p=route(f)
    elif p.startswith("/"):
        if base and p.startswith(base+"/"):p=p[len(base):]
    else:p=posixpath.join(posixpath.dirname(route(f)),p)
    p=posixpath.normpath(p).lstrip("/")
    if p==".":p=""
    if p in docs or (root/p).is_file():return p,u.fragment
    return (p+"/" if p else "")+"index.html",u.fragment
errors=[]; edges={f:set() for f in docs}; external=set();count=0
for f,d in docs.items():
    if d.duplicates:errors.append(f"{f}: duplicate ids {d.duplicates}")
    if d.h1!=1:errors.append(f"{f}: expected one h1, found {d.h1}")
    for tag,v in d.links:
        res=resolve(f,v)
        if res is None:
            if v.startswith(("http://","https://")):external.add(v)
            continue
        dest,frag=res;count+=1
        if not (root/dest).is_file():errors.append(f"{f}: broken {v} -> {dest}")
        elif dest in docs:
            if tag=="a":edges[f].add(dest)
            if frag and frag not in docs[dest].ids:errors.append(f"{f}: missing fragment {v}")
seen=set();todo=["index.html"]
while todo:
    f=todo.pop()
    if f in seen:continue
    seen.add(f);todo.extend(edges.get(f,set())-seen)
for f in docs:
    if f not in seen and f!="404.html":errors.append(f"Unreachable: {f}")
sitemap=ET.parse(root/"sitemap.xml")
locs=[x.text for x in sitemap.getroot().iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
if len(locs)!=len(set(locs)):errors.append("Duplicate sitemap URLs")
for v in locs:
    res=resolve("index.html",v)
    if not res or res[0] not in docs:errors.append(f"Invalid sitemap URL {v}")
    elif docs[res[0]].canon!=[v]:errors.append(f"Canonical mismatch {v}")
if len(locs)!=len(docs)-int("404.html" in docs):errors.append("Sitemap page count mismatch")
# Phase 0 checks: public pages are never gated behind a country, and Elite features that do not exist yet are labelled planned.
for f in root.rglob("*.html"):
    t=f.read_text(encoding="utf-8")
    if "data-country-required" in t:errors.append(f"{f.relative_to(root)}: content hidden until a country is chosen")
mem=(root/"membership/index.html").read_text(encoding="utf-8")
for need in ("Consolidated reporting \u2014 planned","Advanced portfolio risk \u2014 planned"):
    if need not in mem:errors.append("Membership page must label unbuilt Elite features as planned: "+need)
print(f"Audit: {len(docs)} HTML files, {count} internal references, {len(locs)} sitemap URLs, {len(external)} external URLs (not fetched)")
if errors:
    print("\n".join(errors));sys.exit(1)
print("All internal links, assets, IDs, headings, canonicals, sitemap and reachability checks passed")
