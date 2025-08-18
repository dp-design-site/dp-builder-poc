/*
 DP Configurator — Properties Panel (v0.15)
 File: js/ui/properties.js

 Additions in v0.15:
 - New sections: "Заглавие" (Label) and "Хедър" (Header).
 - Controls:
   • Label: text color (palette+HEX), font-size (px), italic toggle.
   • Header: show/hide, header background (palette+HEX), header text color (palette+HEX),
             font-size (px), italic toggle. Name is reused as title text.
 - Styling is applied to inner nodes (.wb, .wb-header, .wb-title, .wb-name) so selection visuals remain intact.
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
    root.appendChild(sectionLabel());
    root.appendChild(sectionHeader());
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

    // label
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

  function sectionLabel(){
    const wrap = section('Заглавие', 'label');
    // Title color + hex
    const lc = row([
      label('Цвят'),
      input({ id:'f-title-color', type:'color' }, onTitleColor),
      input({ id:'f-title-hex', type:'text', class:'hex', placeholder:'#RRGGBB' }, onTitleHex),
    ]); lc.classList.add('row-color');
    // Size
    const ls = row([
      label('Размер'), input({ id:'f-title-size', type:'number', min:'8', step:'1' }, onTitleSize),
    ]); ls.classList.add('row-2');
    // Italic
    const li = row([
      label('Italic'), input({ id:'f-title-italic', type:'checkbox' }, onTitleItalic),
    ]); li.classList.add('row-2');

    wrap.appendChild(lc); wrap.appendChild(ls); wrap.appendChild(li);
    return wrap;
  }

  function sectionHeader(){
    const wrap = section('Хедър', 'header');
    // Enable
    const he = row([
      label('Показвай'), input({ id:'f-header-enable', type:'checkbox' }, onHeaderToggle),
    ]); he.classList.add('row-2');
    // Header BG
    const hb = row([
      label('Bg'), input({ id:'f-header-bg-color', type:'color' }, onHeaderBGColor),
      input({ id:'f-header-bg-hex', type:'text', class:'hex', placeholder:'#RRGGBB' }, onHeaderBGHex),
    ]); hb.classList.add('row-color');
    // Header Text Color
    const htc = row([
      label('Текст'), input({ id:'f-header-text-color', type:'color' }, onHeaderTextColor),
      input({ id:'f-header-text-hex', type:'text', class:'hex', placeholder:'#RRGGBB' }, onHeaderTextHex),
    ]); htc.classList.add('row-color');
    // Header Size
    const hs = row([
      label('Размер'), input({ id:'f-header-size', type:'number', min:'8', step:'1' }, onHeaderSize),
    ]); hs.classList.add('row-2');
    // Header Italic
    const hi = row([
      label('Italic'), input({ id:'f-header-italic', type:'checkbox' }, onHeaderItalic),
    ]); hi.classList.add('row-2');

    wrap.appendChild(he); wrap.appendChild(hb); wrap.appendChild(htc); wrap.appendChild(hs); wrap.appendChild(hi);
    return wrap;
  }

  // ============ Read/Write Widget State ============
  function appearanceTarget(el){ return el.querySelector('.wb') || el; }
  function titleNode(el){
    // Prefer header title; else fall back to .wb-name/.widget-title
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
    // seed text from name
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

  // ============ Handlers: Identity ============
  function onNameChange(e) {
    if (!S.selected) return;
    const v = e.target.value || '';
    const nameEl = S.selected.querySelector('.widget-title, .wb-name');
    if (nameEl) nameEl.textContent = v;
    const { header, title } = headerElems(S.selected);
    if (title) title.textContent = v;
  }

  // ============ Handlers: Layout ============
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

  // ============ Handlers: Appearance ============
