/*
 DP Configurator — Properties Panel (v0.13, layout tweaks)
 File: js/ui/properties.js

 Scope of v0.13:
 - Right sidebar panel that edits a SINGLE selected widget.
 - Groups implemented: "Идентичност" (ID/Name), "Разположение" (X,Y,W,H,Z-index), "Външен вид" (bg, border, radius, shadow).
 - Two-way sync:
    • When selection changes or geometry changes (drag/resize), inputs update.
    • When inputs change, widget styles update live.
 - Appearance is applied to an inner wrapper if present ('.wb') to avoid
   clobbering the selection highlight on the outer .widget.
 - Layout improvements:
    • Coordinates arranged in two rows (X/Y then W/H).
    • Color fields arranged side-by-side with HEX inputs.
*/

(function (global) {
  const S = {
    container: null,
    els: {},
    selected: null, // HTMLElement of selected widget (single)
    obs: null,      // MutationObserver for live sync
  };

  function mount({ container }) {
    S.container = resolveEl(container);
    if (!S.container) throw new Error('PropertiesUI.mount: container not found');
    S.container.classList.add('dp-props');
    S.container.innerHTML = '';

    const root = el('div', { class: 'props-root' });
    root.appendChild(sectionIdentity());
    root.appendChild(sectionLayout());
    root.appendChild(sectionAppearance());
    S.container.appendChild(root);

    // Selection tracking: update on clicks + class/attr mutations
    const canvas = document.getElementById('canvas');
    canvas?.addEventListener('click', defer(refreshSelection));

    // Observe .widget class and attribute changes for live reflect
    S.obs = new MutationObserver(onMutations);
    if (canvas) {
      S.obs.observe(canvas, { subtree: true, attributes: true, attributeFilter: ['class','style','data-x','data-y'] });
    }

    // Initial paint
    refreshSelection();
  }

  function resolveEl(ref) { return typeof ref === 'string' ? document.querySelector(ref) : ref; }
  const defer = (fn) => () => requestAnimationFrame(fn);

  function onMutations(muts) {
    if (!S.selected) return;
    for (const m of muts) {
      if (m.target === S.selected || S.selected.contains(m.target)) {
        paintFromSelected();
        return;
      }
    }
  }

  function refreshSelection() {
    const list = Array.from(document.querySelectorAll('.widget.selected'));
    S.selected = list.length === 1 ? list[0] : null;
    paintFromSelected();
  }

  function paintFromSelected() {
    const state = S.selected ? readWidgetState(S.selected) : null;
    // identity
    setValue('#f-id', state?.id || '—');
    setValue('#f-name', state?.name || '');
    // layout
    setValue('#f-x', num(state?.x));
    setValue('#f-y', num(state?.y));
    setValue('#f-w', num(state?.width));
    setValue('#f-h', num(state?.height));
    setValue('#f-z', state?.zIndex ?? 0);
    // appearance
    setColor('#f-bg-color', '#f-bg-hex', state?.bg || '#1a1a1a');
    setColor('#f-border-color', '#f-border-hex', state?.borderColor || '#555555');
    setValue('#f-border-width', num(state?.borderWidth ?? 1));
    setValue('#f-radius', num(state?.radius ?? 6));
    setValue('#f-shadow-enable', !!state?.shadow?.enabled);
    setValue('#f-shadow-x', num(state?.shadow?.x ?? 0));
    setValue('#f-shadow-y', num(state?.shadow?.y ?? 6));
    setValue('#f-shadow-blur', num(state?.shadow?.blur ?? 12));
    setValue('#f-shadow-spread', num(state?.shadow?.spread ?? 0));
    setColor('#f-shadow-color', '#f-shadow-hex', state?.shadow?.color || '#000000');

    setDisabledGroup(!S.selected);
  }

  function num(v) { return (v === undefined || v === null || Number.isNaN(v)) ? '' : v; }

  function setValue(sel, v) {
    const node = S.container.querySelector(sel);
    if (!node) return;
    if (node.type === 'checkbox') node.checked = !!v;
    else node.value = v ?? '';
  }

  function getValue(sel) {
    const node = S.container.querySelector(sel);
    if (!node) return undefined;
    if (node.type === 'checkbox') return !!node.checked;
    return node.value;
  }

  function setColor(colorSel, hexSel, v) {
    const color = S.container.querySelector(colorSel);
    const hex = S.container.querySelector(hexSel);
    const val = toHex(v || '#000000');
    if (color) color.value = val;
    if (hex) hex.value = val.toUpperCase();
  }

  function toHex(v) {
    if (!v) return '#000000';
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      const r=v[1],g=v[2],b=v[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`;
    return '#000000';
  }
   // ============ Sections ============
  function sectionIdentity() {
    const wrap = section('Идентичност', 'identity');
    const r1 = row([ label('ID'), input({ id:'f-id', type:'text', readonly:true }) ]);
    r1.classList.add('row-2');
    const r2 = row([ label('Име'), input({ id:'f-name', type:'text', placeholder:'Name' }, onNameChange) ]);
    r2.classList.add('row-2');
    wrap.appendChild(r1);
    wrap.appendChild(r2);
    return wrap;
  }

  function sectionLayout() {
    const wrap = section('Разположение', 'layout');
    const g1 = row([
      label('X'), input({ id:'f-x', type:'number', step:'1', placeholder:'X' }, onGeometryInput),
      label('Y'), input({ id:'f-y', type:'number', step:'1', placeholder:'Y' }, onGeometryInput),
    ]);
    g1.classList.add('row-4');
    const g2 = row([
      label('W'), input({ id:'f-w', type:'number', min:'20', step:'1', placeholder:'W' }, onGeometryInput),
      label('H'), input({ id:'f-h', type:'number', min:'20', step:'1', placeholder:'H' }, onGeometryInput),
    ]);
    g2.classList.add('row-4');

    const z = el('div', { class:'zline' }, [
      label('Z'), input({ id:'f-z', type:'number', step:'1' }, onZIndexInput),
      btn('⤒', 'Най-отгоре', onBringToFront),
      btn('⌃', 'Едно нагоре', onMoveUp),
      btn('⌄', 'Едно надолу', onMoveDown),
      btn('⤓', 'Най-отдолу', onSendToBack),
    ]);

    wrap.appendChild(g1); wrap.appendChild(g2); wrap.appendChild(z);
    return wrap;
  }

  function sectionAppearance() {
    const wrap = section('Външен вид', 'appearance');

    // Background
    const bg = row([
      label('Background'),
      input({ id:'f-bg-color', type:'color' }, onBGColor),
      input({ id:'f-bg-hex', type:'text', class:'hex', placeholder:'#RRGGBB' }, onBGHex),
    ]);
    bg.classList.add('row-color');

    // Border
    const bc = row([
      label('Border'),
      input({ id:'f-border-color', type:'color' }, onBorderColor),
      input({ id:'f-border-hex', type:'text', class:'hex', placeholder:'#RRGGBB' }, onBorderHex),
      input({ id:'f-border-width', type:'number', min:'0', step:'1', title:'Width (px)' }, onBorderWidth),
    ]);
    bc.classList.add('row-color');

    // Radius
    const rad = row([
      label('Radius'), input({ id:'f-radius', type:'number', min:'0', step:'1' }, onRadius),
    ]);
    rad.classList.add('row-2');

    // Shadow (basic)
    const sh = row([
      input({ id:'f-shadow-enable', type:'checkbox' }, onShadowToggle), label('Shadow'),
      input({ id:'f-shadow-x', type:'number', step:'1', title:'dx' }, onShadow),
      input({ id:'f-shadow-y', type:'number', step:'1', title:'dy' }, onShadow),
      input({ id:'f-shadow-blur', type:'number', min:'0', step:'1', title:'blur' }, onShadow),
      input({ id:'f-shadow-spread', type:'number', step:'1', title:'spread' }, onShadow),
      input({ id:'f-shadow-color', type:'color' }, onShadowColor),
      input({ id:'f-shadow-hex', type:'text', class:'hex', placeholder:'#000000' }, onShadowHex),
    ]);
    sh.classList.add('shadow-row');

    wrap.appendChild(bg); wrap.appendChild(bc); wrap.appendChild(rad); wrap.appendChild(sh);
    return wrap;
  }

  // ============ Read/Write Widget State ============
  function appearanceTarget(el){ return el.querySelector('.wb') || el; }

  function readWidgetState(el) {
    // geometry
    const x = parseFloat(el.getAttribute('data-x')) || 0;
    const y = parseFloat(el.getAttribute('data-y')) || 0;
    const width  = el.offsetWidth;
    const height = el.offsetHeight;
    const zIndex = parseInt(el.style.zIndex || '0', 10);
    // identity
    const id = el.id || '';
    const name = el.querySelector('.widget-title, .wb-name')?.textContent || el.dataset.name || '';
    // appearance (read from inner target to preserve selection border)
    const t = appearanceTarget(el);
    const cs = getComputedStyle(t);
    const bg = rgbToHex(cs.backgroundColor);
    const borderColor = rgbToHex(cs.borderColor);
    const borderWidth = parseInt(cs.borderWidth || '0', 10);
    const radius = parseInt(cs.borderRadius || '0', 10);
    const shadow = parseBoxShadow(cs.boxShadow);
    return { id, name, x, y, width, height, zIndex, bg, borderColor, borderWidth, radius, shadow };
  }

  function writeGeometry(el, {x,y,width,height}) {
    if (x != null) { el.setAttribute('data-x', x); }
    if (y != null) { el.setAttribute('data-y', y); }
    const tx = parseFloat(el.getAttribute('data-x')) || 0;
    const ty = parseFloat(el.getAttribute('data-y')) || 0;
    el.style.transform = `translate(${tx}px, ${ty}px)`;
    if (width  != null) el.style.width  = Math.max(20, width) + 'px';
    if (height != null) el.style.height = Math.max(20, height) + 'px';
  }

  // ============ Handlers: Identity ============
  function onNameChange(e) {
    if (!S.selected) return;
    const v = e.target.value || '';
    const nameEl = S.selected.querySelector('.widget-title, .wb-name');
    if (nameEl) nameEl.textContent = v;
  }

  // ============ Handlers: Layout ============
  function onGeometryInput() {
    if (!S.selected) return;
    const x = toNum(getValue('#f-x'));
    const y = toNum(getValue('#f-y'));
    const w = toNum(getValue('#f-w'));
    const h = toNum(getValue('#f-h'));
    writeGeometry(S.selected, { x, y, width:w, height:h });
    // Optionally notify others
    dispatch('dp:widget-geometry', { id: S.selected.id, x, y, width:w, height:h });
  }

  function onZIndexInput() {
    if (!S.selected) return;
    const zi = toNum(getValue('#f-z'), 0);
    S.selected.style.zIndex = String(zi);
  }

  function getAllWidgets() { return Array.from(document.querySelectorAll('#canvas .widget')); }
  function getZRange() {
    const vals = getAllWidgets().map(w => parseInt(w.style.zIndex || '0', 10));
    return { min: Math.min(0, ...vals), max: Math.max(0, ...vals) };
  }
  function onBringToFront(){ if (!S.selected) return; const {max}=getZRange(); S.selected.style.zIndex = String(max+1); paintFromSelected(); }
  function onSendToBack(){ if (!S.selected) return; const {min}=getZRange(); S.selected.style.zIndex = String(min-1); paintFromSelected(); }
  function onMoveUp(){ if (!S.selected) return; const zi=parseInt(S.selected.style.zIndex||'0',10); S.selected.style.zIndex=String(zi+1); paintFromSelected(); }
  function onMoveDown(){ if (!S.selected) return; const zi=parseInt(S.selected.style.zIndex||'0',10); S.selected.style.zIndex=String(zi-1); paintFromSelected(); }

  // ============ Handlers: Appearance ============
  function onBGColor(e){ syncColorPair('#f-bg-color','#f-bg-hex', e.target.value); applyBG(); }
  function onBGHex(e){ const v = toHex(e.target.value); syncColorPair('#f-bg-color','#f-bg-hex', v); applyBG(); }
  function applyBG(){ if (!S.selected) return; const t=appearanceTarget(S.selected); t.style.background = getValue('#f-bg-hex'); }

  function onBorderColor(e){ syncColorPair('#f-border-color','#f-border-hex', e.target.value); applyBorder(); }
  function onBorderHex(e){ const v = toHex(e.target.value); syncColorPair('#f-border-color','#f-border-hex', v); applyBorder(); }
  function onBorderWidth(){ applyBorder(); }
  function applyBorder(){ if (!S.selected) return; const t=appearanceTarget(S.selected); const c=getValue('#f-border-hex'); const w=toNum(getValue('#f-border-width'),0); t.style.borderColor = c; t.style.borderStyle = 'solid'; t.style.borderWidth = Math.max(0,w) + 'px'; }

  function onRadius(){ if (!S.selected) return; const t=appearanceTarget(S.selected); const r = Math.max(0, toNum(getValue('#f-radius'),0)); t.style.borderRadius = r + 'px'; }

  function onShadowToggle(){ applyShadow(); }
  function onShadow(){ applyShadow(); }
  function onShadowColor(e){ syncColorPair('#f-shadow-color','#f-shadow-hex', e.target.value); applyShadow(); }
  function onShadowHex(e){ const v = toHex(e.target.value); syncColorPair('#f-shadow-color','#f-shadow-hex', v); applyShadow(); }
  function applyShadow(){
    if (!S.selected) return;
    const t = appearanceTarget(S.selected);
    const enable = !!getValue('#f-shadow-enable');
    if (!enable) { t.style.boxShadow = 'none'; return; }
    const dx = toNum(getValue('#f-shadow-x'),0);
    const dy = toNum(getValue('#f-shadow-y'),6);
    const blur = Math.max(0,toNum(getValue('#f-shadow-blur'),12));
    const spread = toNum(getValue('#f-shadow-spread'),0);
    const color = getValue('#f-shadow-hex') || '#000000';
    t.style.boxShadow = `${dx}px ${dy}px ${blur}px ${spread}px ${color}`;
  }

  function syncColorPair(colorSel, hexSel, v) {
    const val = toHex(v);
    const color = S.container.querySelector(colorSel);
    const hex = S.container.querySelector(hexSel);
    if (color) color.value = val;
    if (hex) hex.value = val.toUpperCase();
  }

  function toNum(v, def='') { const n = parseFloat(v); return Number.isFinite(n) ? n : def; }

  function dispatch(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail })); }

  // ============ DOM Builders ============
  function section(title, key) {
    const sec = el('section', { class: 'prop-section', 'data-key': key });
    const header = el('header', { class: 'prop-header', tabindex:'0' }, [ el('span', { class:'prop-title', text: title }), toggleBtn() ]);
    const body = el('div', { class: 'prop-body' });
    header.querySelector('.prop-toggle').addEventListener('click', () => sec.classList.toggle('collapsed'));
    header.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); sec.classList.toggle('collapsed'); }});
    sec.appendChild(header); sec.appendChild(body);
    sec.appendChild = function (child) { body.appendChild(child); return sec; };
    return sec;
  }
 
  function row(children) { return el('div', { class:'prop-row' }, children); }
  function label(text){ return el('label', { class:'prop-label', text }); }
  function input(attrs, on){ const i = el('input', attrs); if (on) i.addEventListener('input', on); return i; }
  function btn(text, title, on){ const b = el('button', { class:'prop-btn', title }, [ document.createTextNode(text) ]); if (on) b.addEventListener('click', on); return b; }
  function toggleBtn(){ const b = el('button', { class:'prop-toggle', title:'Покажи/Скрий' }); b.appendChild(svgChevron()); return b; }

  function el(tag, attrs, children){ const n=document.createElement(tag); if(attrs){ for(const[k,v] of Object.entries(attrs)){ if(k==='class') n.className=v; else if(k==='text') n.textContent=v; else n.setAttribute(k,v);} } if(children){ for(const c of children) n.appendChild(c);} return n; }

  function svgChevron(){ const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width','16'); svg.setAttribute('height','16'); const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d','M8.12 9.29L12 13.17l3.88-3.88 1.41 1.41L12 16l-5.29-5.29 1.41-1.42z'); p.setAttribute('fill','currentColor'); svg.appendChild(p); return svg; }

  function setDisabledGroup(disabled){
    S.container.querySelectorAll('.prop-section .prop-body input, .prop-section .prop-body button').forEach(el=>{ el.disabled = !!disabled; });
  }

  // ============ CSS helpers ============
  function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return '#000000';
    const r = parseInt(m[1],10).toString(16).padStart(2,'0');
    const g = parseInt(m[2],10).toString(16).padStart(2,'0');
    const b = parseInt(m[3],10).toString(16).padStart(2,'0');
    return `#${r}${g}${b}`;
  }

  function parseBoxShadow(bs) {
    if (!bs || bs === 'none') return { enabled:false };
    // naive parse: dx dy blur [spread] color
    const parts = bs.trim().split(/\s+/);
    const nums = parts.filter(p=>/^-?\d+px$/.test(p)).map(p=>parseInt(p));
    const color = parts.find(p=>p.startsWith('rgb') || p.startsWith('#')) || '#000000';
    const [x=0,y=6,blur=12,spread=0] = nums;
    return { enabled:true, x, y, blur, spread, color: rgbToHex(color) };
  }

  // Public API
  const API = { mount };
  global.PropertiesUI = API;
})(window);
