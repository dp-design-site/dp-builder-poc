// js/actions/context-actions.js
// Генерични действия за контекстното меню. Нямат зависимост от конкретен компонент на менюто.
// Използват текущата DOM селекция (.widget.selected).

let _clipboard = [];

export function getSelected() {
  return Array.from(document.querySelectorAll('.widget.selected'));
}

export function clearSelected() {
  for (const w of getSelected()) w.classList.remove('selected');
}

export function groupSelected() {
  // TODO: реално групиране (container widget). Засега само лог за дебъг.
  console.log('[actions] Group', getSelected());
}

export function ungroupSelected() {
  console.log('[actions] Ungroup', getSelected());
}

export function copySelected() {
  _clipboard = getSelected().map(n => {
    const clone = n.cloneNode(true);
    clone.setAttribute('data-x', n.getAttribute('data-x') || '0');
    clone.setAttribute('data-y', n.getAttribute('data-y') || '0');
    clone.style.transform = n.style.transform;
    clone.style.width = n.style.width;
    clone.style.height = n.style.height;
    return clone;
  });
  console.log('[actions] Copied', _clipboard.length);
}

export function pasteClipboard(offset = { x: 20, y: 20 }) {
  if (!_clipboard.length) return;
  const canvas = document.getElementById('canvas');
  let i = 0;
  for (const c of _clipboard) {
    const el = c.cloneNode(true);
    el.classList.remove('selected');
    el.id = 'widget-' + Math.random().toString(36).slice(2, 8);
    const x = (parseFloat(c.getAttribute('data-x')) || 0) + offset.x + i * 5;
    const y = (parseFloat(c.getAttribute('data-y')) || 0) + offset.y + i * 5;
    el.setAttribute('data-x', x);
    el.setAttribute('data-y', y);
    el.style.transform = `translate(${x}px, ${y}px)`;
    canvas.appendChild(el);
    i++;
  }
  console.log('[actions] Pasted', i);
}

export function duplicateSelected() {
  _clipboard = getSelected().map(n => n);
  pasteClipboard({ x: 12, y: 12 });
}

export function deleteSelected() {
  for (const w of getSelected()) w.remove();
  console.log('[actions] Deleted');
}
