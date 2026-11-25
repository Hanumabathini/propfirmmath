/* Progressive interaction layer: never changes calculation inputs or output values. */
(() => {
  const menus = document.querySelectorAll('header.site .nav-group');
  document.addEventListener('click', event => {
    menus.forEach(menu => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = Array.from(menus).find(item => item.open && item.contains(event.target));
    if (!menu) return;
    menu.open = false;
    menu.querySelector('summary').focus();
  });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if(e.isIntersecting) {
        e.target.animate([{opacity:.65,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}], {duration:360,easing:'ease-out'});
        io.unobserve(e.target);
      }
    }, {threshold:.15});
    document.querySelectorAll('.grid-links, main h2, main .cta').forEach(el=>io.observe(el));
  }
  const output = document.querySelectorAll('.big, .kpi b');
  if ('MutationObserver' in window && !reduced.matches) {
    const last = new WeakMap();
    const observer = new MutationObserver(() => output.forEach(el => {
      const value=el.textContent;
      if(last.get(el)===value)return;
      last.set(el,value);
      el.animate([{opacity:.75},{opacity:1}],{duration:180,easing:'ease-out'});
    }));
    output.forEach(el=>{last.set(el,el.textContent);observer.observe(el,{childList:true,subtree:true,characterData:true});});
  }
  // Only attach scenario copying to actual calculation sections, not directory or comparison grids.
  const target=document.querySelector('main .calc');
  if(!target)return;
  const inputs = target.querySelectorAll('input:not([type=hidden]), select, textarea');
  if(!inputs.length)return;
  const bar=document.createElement('div');
  bar.className='scenario-tools';
  const button=document.createElement('button');
  button.type='button';button.className='btn';button.textContent='Copy scenario inputs';
  const status=document.createElement('span');status.className='note';status.setAttribute('role','status');
  button.addEventListener('click',async()=>{
    const lines=[document.title];
    inputs.forEach(el=>{
      if(el.disabled || ['password','file','email','tel'].includes(el.type))return;
      if(el.type==='radio'&&!el.checked)return;
      const label=el.labels?.[0]?.textContent?.trim()||el.getAttribute('aria-label')||el.name||el.id;
      if(label)lines.push(label+': '+(el.type==='checkbox'?(el.checked?'Yes':'No'):el.value));
    });
    try{await navigator.clipboard.writeText(lines.join('\n'));status.textContent='Copied to clipboard.';}
    catch{status.textContent='Clipboard unavailable in this browser.';}
  });
  bar.append(button,status);
  target.after(bar);
})();
