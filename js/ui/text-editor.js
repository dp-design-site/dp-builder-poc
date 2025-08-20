/*
 DP Configurator — Global Inline Text Editor (v0.1)
 File: js/ui/text-editor.js

 Purpose
 - A lightweight, global editor that appears when the user clicks any text node
   marked with [data-editable="text"].
 - Edits typography and color live, without re-initializing widgets.
 - Works across all widgets (e.g., window-basic .wb-name).

 Usage
 - Include this file after your widgets are rendered.
 - Call TextEditor.mount();
 - Mark editable elements: <span class="wb-name" data-editable="text">Title</span>

 Notes
 - No external deps. Styles are injected once.
 - Keeps state per-target via inline styles (style="...").
 - ESC or clicking outside closes the editor.
*/
(function (global) {
  const S = {
    host: null,
    panel: null,
    target: null,
    mounted: false,
    inputs: {},
  };

  const CSS = `
  .dp-te-host{ position:fixed; left:0; top:0; width:0; height:0; z-index:999999; }
  .dp-te{ position:absolute; min-width:280px; padding:8px; border:1px solid var(--dp-border-col,#2a2f36);
          background: var(--dp-bg-elev,#15181b); color: var(--dp-text,#e6eaf0); border-radius:8px;
          box-shadow:0 8px 24px rgba(0,0,0,.3); font: 12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial; }
  .dp-te h4{ margin:0 0 6px 0; font-size:12px; font-weight:700; color:var(--dp-text,#e6eaf0); }
  .dp-te .row{ display:flex; align-items:center; gap:6px; margin:6px 0; }
  .dp-te label{ min-width:64px; opacity:.85; }
  .dp-te input[type="number"], .dp-te select, .dp-te input[type="text"]{ flex:1; padding:4px 6px; border-radius:6px; border:1px solid var(--dp-border-col,#2a2f36); background:var(--dp-bg,#0f1216); color:var(--dp-text,#e6eaf0); }
  .dp-te .color{ width:36px; height:26px; padding:0; }
  .dp-te .btns{ display:flex; gap:6px; justify-content:space-between; margin-top:8px; }
  .dp-te button{ padding:6px 10px; border-radius:6px; border:1px solid var(--dp-border-col,#2a2f36); background:var(--dp-bg-elev-2,#1c2026); color:var(--dp-text,#e6eaf0); cursor:pointer; }
  .dp-te .grp{ display:flex; gap:6px; }
  .dp-te .iconbtn{ width:28px; height:28px; display:inline-grid; place-items:center; }
  .dp-te .sep{ height:1px; background:var(--dp-border-col,#2a2f36); margin:8px 0; }
  `;

  function injectCSS() {
    if (document.getElementById('dp-te-style')) return;
    const st = document.createElement('style');
    st.id = 'dp-te-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function mount() {
    if (S.mounted) return;
    injectCSS();
    S.host = document.createElement('div');
    S.host.className = 'dp-te-host';
    document.body.appendChild(S.host);

    S.panel = document.createElement('div');
    S.panel.className = 'dp-te';
    S.panel.style.display = 'none';
    S.host.appendChild(S.panel);

    S.panel.innerHTML = '';
    buildPanel(S.panel);

    document.addEventListener('click', onGlobalClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    S.mounted = true;
  }

  function buildPanel(panel){
    panel.appendChild(h4('Text'));
    // Row 1: Family + Size
    panel.appendChild(row([
      label('Font'), select({id:'te-family'}, families()),
    ]));
    panel.appendChild(row([
      label('Size'), number({id:'te-size', min:8, max:128, step:1}),
      label('Line'), number({id:'te-line', min:0.8, max:3, step:0.1}),
    ]));
    // Row 2: Weight/Style/Transform
    panel.appendChild(row([
      label('Weight'), select({id:'te-weight'}, weights()),
      label('Style'), select({id:'te-style'}, [['normal','Normal'],['italic','Italic']]),
    ]));
    panel.appendChild(row([
      label('Align'), select({id:'te-align'}, [['left','Left'],['center','Center'],['right','Right']]),
      label('Case'), select({id:'te-transform'}, [['none','None'],['uppercase','UP'],['lowercase','low'],['capitalize','Cap']]),
    ]));
    // Row 3: Color + Letter spacing
    panel.appendChild(row([
      label('Color'), color({id:'te-color'}), text({id:'te-color-hex', placeholder:'#RRGGBB'}),
    ]));
    panel.appendChild(row([
      label('Letter'), number({id:'te-letter', step:0.1, min:-5, max:20}),
    ]));

    panel.appendChild(div('sep'));
    const btnbar = div('btns');
    const bClose = button('Close', () => hide());
    const bReset = button('Reset', onReset);
    btnbar.appendChild(bReset);
    btnbar.appendChild(bClose);
    panel.appendChild(btnbar);

    // wire inputs
    S.inputs = mapInputs(panel, [
      'te-family','te-size','te-line','te-weight','te-style','te-align','te-transform','te-color','te-color-hex','te-letter'
    ]);
    Object.values(S.inputs).forEach(inp => inp.addEventListener('input', apply));
    S.inputs['te-color'].addEventListener('input', syncColorToHex);
    S.inputs['te-color-hex'].addEventListener('input', syncHexToColor);
  }

  function families(){
    return [
      ['system-ui','System'],
      ['Segoe UI','Segoe UI'],
      ['Arial','Arial'],
      ['Roboto','Roboto'],
      ['Inter','Inter'],
      ['Montserrat','Montserrat'],
      ['inherit','(inherit)'],
    ];
  }
  function weights(){ return [['300','Light'],['400','Regular'],['500','Medium'],['600','Semibold'],['700','Bold']]; }

  // UI builders
  const h4 = (t)=>{ const n=document.createElement('h4'); n.textContent=t; return n; };
  const div = (c)=>{ const n=document.createElement('div'); n.className=c; return n; };
  function row(children){ const n=div('row'); children.forEach(c=>n.appendChild(c)); return n; }
  function label(t){ const n=document.createElement('label'); n.textContent=t; return n; }
  function select(attrs, opts){ const n=document.createElement('select'); setAttrs(n,attrs); opts.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;n.appendChild(o);}); return n; }
  function number(attrs){ const n=document.createElement('input'); setAttrs(n,attrs); n.type='number'; return n; }
  function text(attrs){ const n=document.createElement('input'); setAttrs(n,attrs); n.type='text'; return n; }
  function color(attrs){ const n=document.createElement('input'); setAttrs(n,attrs); n.type='color'; n.classList.add('color'); return n; }
  function button(t,on){ const n=document.createElement('button'); n.textContent=t; if(on) n.addEventListener('click',on); return n; }
  function setAttrs(n,attrs){ for(const k in attrs) n.setAttribute(k, attrs[k]); }
  function mapInputs(root, ids){ const m={}; ids.forEach(id=>m[id]=root.querySelector('#'+id)); return m; }

  // Event routing
  function onGlobalClick(e){
    const t = e.target;
    const editable = t && t.closest('[data-editable="text"]');
    if (editable) {
      e.preventDefault();
      e.stopPropagation();
      showFor(editable, { x:e.clientX, y:e.clientY });
      return;
    }
    if (S.panel && !S.panel.contains(t)) hide();
  }
  function onKeyDown(e){ if (e.key==='Escape') hide(); }

  // Show/Hide
  function showFor(target, at){
    S.target = target;
    // preload current values
    readFromTarget(target);
    S.panel.style.display = 'block';
    // position
    const rect = target.getBoundingClientRect();
    const x = at?.x ?? (rect.left + rect.width/2);
    const y = at?.y ?? rect.bottom + 8;
    const pw = S.panel.offsetWidth || 280; // guess before paint
    const ph = S.panel.offsetHeight || 240;
    let left = Math.max(8, Math.min(x - pw/2, window.innerWidth - pw - 8));
    let top  = Math.max(8, Math.min(y, window.innerHeight - ph - 8));
    S.panel.style.left = left + 'px';
    S.panel.style.top = top + 'px';
  }
  function hide(){ S.panel.style.display='none'; S.target=null; }

  // Read/Write
  function readFromTarget(t){
    const cs = getComputedStyle(t);
    setVal('te-family', pick(cs.fontFamily, ['system-ui','Segoe UI','Arial','Roboto','Inter','Montserrat']));
    setVal('te-size', parseInt(cs.fontSize)||14);
    setVal('te-line', parseFloat(cs.lineHeight)||1.2);
    setVal('te-weight', String(parseInt(cs.fontWeight)||400));
    setVal('te-style', cs.fontStyle||'normal');
    setVal('te-align', cs.textAlign||'left');
    setVal('te-transform', cs.textTransform||'none');
    const color = rgbToHex(cs.color);
    setVal('te-color', color); setVal('te-color-hex', color.toUpperCase());
    setVal('te-letter', parseFloat(cs.letterSpacing)||0);
  }
  function setVal(id,val){ const i=S.inputs[id]; if(i) i.value = val; }

  function apply(){ if(!S.target) return; 
    const st = S.target.style;
    st.fontFamily   = val('te-family');
    st.fontSize     = safePx(val('te-size'));
    st.lineHeight   = String(val('te-line'));
    st.fontWeight   = String(val('te-weight'));
    st.fontStyle    = String(val('te-style'));
    st.textAlign    = String(val('te-align'));
    st.textTransform= String(val('te-transform'));
    st.color        = hex(val('te-color-hex'));
    st.letterSpacing= safePx(val('te-letter'));
  }
  function val(id){ return S.inputs[id]?.value; }
  function safePx(v){ const n=parseFloat(v); return Number.isFinite(n)? (n+'px') : ''; }
  function hex(v){ return /^#[0-9a-fA-F]{6}$/.test(v)? v : '#000000'; }

  function onReset(){ if(!S.target) return; S.target.removeAttribute('style'); readFromTarget(S.target); }

  function syncColorToHex(){ const v=val('te-color'); S.inputs['te-color-hex'].value = v.toUpperCase(); apply(); }
  function syncHexToColor(){ let v=val('te-color-hex'); if(!v.startsWith('#')) v='#'+v; if(/^#[0-9a-fA-F]{6}$/.test(v)){ S.inputs['te-color'].value=v; apply(); } }

  // Utils
  function rgbToHex(rgb){
    if(!rgb) return '#000000';
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i); if(!m) return '#000000';
    const r = (+m[1]).toString(16).padStart(2,'0');
    const g = (+m[2]).toString(16).padStart(2,'0');
    const b = (+m[3]).toString(16).padStart(2,'0');
    return `#${r}${g}${b}`;
  }
  function pick(val, options){
    const clean = String(val||'').replaceAll('"','');
    const found = options.find(o => clean.includes(o));
    return found || 'system-ui';
  }

  // Public API
  global.TextEditor = { mount };
})(window);
