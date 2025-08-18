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

})(this);
