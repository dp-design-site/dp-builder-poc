/*
 DP Configurator — Properties Panel (v0.16)
 File: js/ui/properties.js

 Additions up to v0.16:
 - Sections: "Идентичност", "Разположение", "Външен вид", "Заглавие", "Хедър".
 - Full two-way sync for: geometry, background, border, radius, shadow,
   title (color/size/italic), header (toggle/bg/text color/size/italic).
 - Styling targets inner nodes (.wb, .wb-header, .wb-title, .wb-name) to keep selection
   outline unaffected.
*/

(function (global) {
  const S = {
    container: null,
    selected: null,
    obs: null,
  };

  // ==================== Public API ====================
  function mount({ container }) {
    S.container = resolveEl(container);
    if (!S.container) throw new Error('PropertiesUI.mount: container not found');
    S.container.classList.add('dp-props');
    S.container.innerHTML = '';

    const root = el('div', { class: 'props-root' });
    root.appendChild(sectionIdentity());
    root.appendChild(sectionLayout());
    root.appendChild(sectionAppearance());
    root.appendChild(sectionLabel());
    root.appendChild(sectionHeader());
    S.container.appendChild(root);

    const canvas = document.getElementById('canvas');
    canvas?.addEventListener('click', defer(refreshSelection));

    S.obs = new MutationObserver(onMutations);
    if (canvas) {
      S.obs.observe(canvas, { subtree: true, attributes: true, attributeFilter: ['class','style','data-x','data-y'] });
    }

    refreshSelection();
  }

  const API = { mount };
  global.PropertiesUI = API;

  // ==================== Selection Sync ====================
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

    // title (label)
    setColor('#f-title-color', '#f-title-hex', state?.title?.color || '#E6EAF0');
    setValue('#f-title-size', num(state?.title?.size ?? 14));
    setValue('#f-title-italic', !!state?.title?.italic);

    // header
    setValue('#f-header-enable', !!state?.header?.visible);
    setColor('#f-header-bg-color', '#f-header-bg-hex', state?.header?.bg || '#1F2328');
    setColor('#f-header-text-color', '#f-header-text-hex', state?.header?.textColor || '#E6EAF0');
    setValue('#f-header-size', num(state?.header?.size ?? 14));
    setValue('#f-header-italic', !!state?.header?.italic);

    setDisabledGroup(!S.selected);
  }

  function setDisabledGroup(disabled){
    S.container.querySelectorAll('.prop-section .prop-body input, .prop-section .prop-body button').forEach(el=>{ el.disabled = !!disabled; });
  }

  // ==================== State Read/Write ====================
  function appearanceTarget(el){ return el.querySelector('.wb') || el; }
  function titleNode(el){
    return el.querySelector('.wb .wb-header .wb-title')
        || el.querySelector('.wb .wb-name')
        || el.querySelector('.widget-title')
        || el.querySelector('.wb .wb-header');
  }
  function headerElems(el){
    const wb = el.querySelector('.wb') || el;
    let header = wb.querySelector('.wb-header');
    let title  = header?.querySelector('.wb-title');
    const body = wb.querySelector('.wb-body') || wb;
    return { wb, header, title, body };
  }
  function ensureHeader(el){
    const { wb, header, title, body } = headerElems(el);
    if (header && title) return { wb, header, title, body };
    const h = header || document.createElement('div');
    h.classList.add('wb-header');
    const t = title || document.createElement('div');
    t.classList.add('wb-title');
    const nameEl = el.querySelector('.widget-title, .wb-name');
    t.textContent = nameEl?.textContent || el.dataset.name || 'Title';
    if (!h.contains(t)) h.appendChild(t);
    if (!wb.contains(h)) wb.insertBefore(h, body);
    return { wb, header:h, title:t, body };
  }

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
    // appearance
    const t = appearanceTarget(el);
    const cs = getComputedStyle(t);
    const bg = rgbToHex(cs.backgroundColor);
    const borderColor = rgbToHex(cs.borderColor);
    const borderWidth = parseInt(cs.borderWidth || '0', 10);
    const radius = parseInt(cs.borderRadius || '0', 10);
    const shadow = parseBoxShadow(cs.boxShadow);
    // label/header styles
    const tn = titleNode(el);
    const tcs = tn ? getComputedStyle(tn) : null;
    const title = tn ? {
      color: rgbToHex(tcs.color),
      size: parseInt(tcs.fontSize||'14',10),
      italic: (tcs.fontStyle||'normal') === 'italic'
    } : { color:'#E6EAF0', size:14, italic:false };

    const { header } = headerElems(el);
    const hcs = header ? getComputedStyle(header) : null;
    const headerState = header ? {
      visible: header.style.display !== 'none',
      bg: rgbToHex(hcs.backgroundColor),
      textColor: title.color,
      size: title.size,
      italic: title.italic,
    } : { visible:false, bg:'#1F2328', textColor:title.color, size:title.size, italic:title.italic };

    return { id, name, x, y, width, height, zIndex, bg, borderColor, borderWidth, radius, shadow, title, header: headerState };
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

  // ==================== Identity Handlers ====================
  function onNameChange(e) {
    if (!S.selected) return;
    const v = e.target.value || '';
    const nameEl = S.selected.querySelector('.widget-title, .wb-name');
    if (nameEl) nameEl.textContent = v;
    const { title } = headerElems(S.selected);
    if (title) title.textContent = v;
  }

  // ==================== Layout Handlers ====================
  function onGeometryInput() {
    if (!S.selected) return;
    const x = toNum(getValue('#f-x'));
    const y = toNum(getValue('#f-y'));
    const w = toNum(getValue('#f-w'));
    const h = toNum(getValue('#f-h'));
    writeGeometry(S.selected, { x, y, width:w, height:h });
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

  // ==================== Appearance Handlers ====================
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

  // ==================== Label Handlers ====================
  function onTitleColor(e){ syncColorPair('#f-title-color','#f-title-hex', e.target.value); applyTitleStyle(); }
  function onTitleHex(e){ const v = toHex(e.target.value); syncColorPair('#f-title-color','#f-title-hex', v); applyTitleStyle(); }
  function onTitleSize(){ applyTitleStyle(); }
  function onTitleItalic(){ applyTitleStyle(); }
  function applyTitleStyle(){
    if (!S.selected) return;
    const tn = titleNode(S.selected);
    if (!tn) return;
    tn.style.color = getValue('#f-title-hex') || '';
    const fs = toNum(getValue('#f-title-size'));
    if (fs) tn.style.fontSize = fs + 'px';
    tn.style.fontStyle = getValue('#f-title-italic') ? 'italic' : 'normal';
  }

  // ==================== Header Handlers ====================
  function onHeaderToggle(){
    if (!S.selected) return;
    const enable = !!getValue('#f-header-enable');
    if (enable) {
      const {header} = ensureHeader(S.selected);
      header.style.display='';
    } else {
      const {header} = headerElems(S.selected);
      if (header) header.style.display='none';
    }
  }
  function onHeaderBGColor(e){ syncColorPair('#f-header-bg-color','#f-header-bg-hex', e.target.value); applyHeaderBG(); }
  function onHeaderBGHex(e){ const v=toHex(e.target.value); syncColorPair('#f-header-bg-color','#f-header-bg-hex', v); applyHeaderBG(); }
  function applyHeaderBG(){ if (!S.selected) return; const {header}=ensureHeader(S.selected); header.style.background = getValue('#f-header-bg-hex'); }

  function onHeaderTextColor(e){ syncColorPair('#f-header-text-color','#f-header-text-hex', e.target.value); applyHeaderText(); }
  function onHeaderTextHex(e){ const v=toHex(e.target.value); syncColorPair('#f-header-text-color','#f-header-text-hex', v); applyHeaderText(); }
  function onHeaderSize(){ applyHeaderText(); }
  function onHeaderItalic(){ applyHeaderText(); }
  function applyHeaderText(){
    if (!S.selected) return;
    const { title } = ensureHeader(S.selected);
    title.style.color = getValue('#f-header-text-hex') || '';
    const fs = toNum(getValue('#f-header-size'));
    if (fs) title.style.fontSize = fs + 'px';
    title.style.fontStyle = getValue('#f-header-italic') ? 'italic' : 'normal';
  }

  // ==================== Sections Builders ====================
  function section(title, key) {
    const sec = el('section', { class: 'prop-section', 'data-key': key });
    const header = el('header', { class: 'prop-header', tabindex:'0' }, [ el('span', { class:'prop-title', text: title }), toggleBtn() ]);
    const body = el('div', { class: 'prop-body' });

    // mount header/body using native appendChild
    sec.appendChild(header);
    sec.appendChild(body);

    // Shadow native appendChild for this instance so callers can do wrap.appendChild(x)
    const nativeAppend = sec.appendChild.bind(sec);
    sec.appendChild = function (child) { body.appendChild(child); return sec; };

    header.querySelector('.prop-toggle').addEventListener('click', () => sec.classList.toggle('collapsed'));
    header.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); sec.classList.toggle('collapsed'); }});
    return sec;
  }

  function row(children) { return el('div', { class:'prop-row' }, children); }
  function label(text){ return el('label', { class:'prop-label', text }); }
  function input(attrs, on){ const i = el('input', attrs); if (on) i.addEventListener('input', on); return i; }
  function btn(text, title, on){ const b = el('button', { class:'prop-btn', title }, [ document.createTextNode(text) ]); if (on) b.addEventListener('click', on); return b; }
  function toggleBtn(){ const b = el('button', { class:'prop-toggle', title:'Покажи/Скрий' }); b.appendChild(svgChevron()); return b; }

  function el(tag, attrs, children){
    const n=document.createElement(tag);
    if(attrs){ for(const[k,v] of Object.entries(attrs)){
      if(k==='class') n.className=v;
      else if(k==='text') n.textContent=v;
      else n.setAttribute(k,v);
    }}
    if(children){ for(const c of children) n.appendChild(c);} 
    return n;
  }

  function svgChevron(){ const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width','16'); svg.setAttribute('height','16'); const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d','M8.12 9.29L12 13.17l3.88-3.88 1.41 1.41L12 16l-5.29-5.29 1.41-1.42z'); p.setAttribute('fill','currentColor'); svg.appendChild(p); return svg; }

  // ==================== Utils ====================
  function syncColorPair(colorSel, hexSel, v) {
    const val = toHex(v);
    const color = S.container.querySelector(colorSel);
    const hex = S.container.querySelector(hexSel);
    if (color) color.value = val;
    if (hex) hex.value = val.toUpperCase();
  }
  function toNum(v, def='') { const n = parseFloat(v); return Number.isFinite(n) ? n : def; }
  function dispatch(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail })); }

  // ==================== CSS helpers ====================
  function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    if (rgb.startsWith('#')) return toHex(rgb);
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return '#000000';
    const r = Number(m[1]).toString(16).padStart(2,'0');
    const g = Number(m[2]).toString(16).padStart(2,'0');
    const b = Number(m[3]).toString(16).padStart(2,'0');
    return `#${r}${g}${b}`.toUpperCase();
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

})(window);
