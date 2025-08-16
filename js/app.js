import './core/component-loader.js'; // дефинира window.loadComponent
import { initSelection } from './core/selection.js';
import { smartSnap, hideGuides, updateGuideStyles, setSnapOptions } from './core/snap.js';
import { groupSelected, ungroupSelected, copySelected, pasteClipboard, duplicateSelected, deleteSelected } from './actions/context-actions.js';

// ==============================
// Локално състояние за snap (временно, докато финализираме resize snap)
// ==============================
let SNAP_TOL = 3;
let SNAP_ENABLED = true;
let SNAP_EDGES = true;
let SNAP_CENTERS = true;

function allWidgets(except = null, ignoreSelected = false) {
  return Array.from(document.querySelectorAll('.widget')).filter(w =>
    w !== except && (!ignoreSelected || !w.classList.contains('selected'))
  );
}

function getRect(el) {
  const x = parseFloat(el.getAttribute('data-x')) || 0;
  const y = parseFloat(el.getAttribute('data-y')) || 0;
  const w = el.offsetWidth, h = el.offsetHeight;
  return {
    left: x, right: x + w, top: y, bottom: y + h,
    centerX: x + w / 2, centerY: y + h / 2,
    width: w, height: h
  };
}

function showGuideLocal(axis, pos) {
  const guide = document.getElementById(axis === 'v' ? 'guide-v' : 'guide-h');
  if (!guide) return;
  if (axis === 'v') guide.style.left = pos + 'px';
  else guide.style.top = pos + 'px';
  guide.style.display = 'block';
  updateGuideStyles();
}

// ==============================
// BOOTSTRAP
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  // Delete / Backspace (ако фокусът не е в поле за въвеждане)
  document.addEventListener('keydown', function(e) {
    const isTextInput = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
    if (!isTextInput && (e.key === 'Delete' || e.key === 'Backspace')) {
      deleteSelected();
      e.preventDefault();
    }
  });

  // --- Color picker + hex sync ---
  const colorPicker = document.getElementById('guide-color');
  const colorHex = document.getElementById('guide-color-hex');
  if (colorPicker && colorHex) {
    colorPicker.addEventListener('input', e => {
      colorHex.value = e.target.value;
      updateGuideStyles();
    });
    colorHex.addEventListener('input', e => {
      let val = e.target.value;
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        colorPicker.value = val;
        updateGuideStyles();
      }
    });
  }
  updateGuideStyles();

  // Snapbar контроли → синхронизираме локално и към snap.js
  document.getElementById('snap-enable')?.addEventListener('change', e => {
    SNAP_ENABLED = !!e.target.checked; setSnapOptions({ enabled: SNAP_ENABLED });
  });
  document.getElementById('snap-edges')?.addEventListener('change', e => {
    SNAP_EDGES = !!e.target.checked; setSnapOptions({ edges: SNAP_EDGES });
  });
  document.getElementById('snap-centers')?.addEventListener('change', e => {
    SNAP_CENTERS = !!e.target.checked; setSnapOptions({ centers: SNAP_CENTERS });
  });
  document.getElementById('snap-tolerance')?.addEventListener('input', e => {
    SNAP_TOL = parseInt(e.target.value, 10); setSnapOptions({ tolerance: SNAP_TOL });
  });
  for (const id of ['guide-style','guide-color','guide-width']) {
    document.getElementById(id)?.addEventListener('input', updateGuideStyles);
  }

  // Selection
  initSelection();

  // === DRAG/RESIZE с MULTI-SELECTION ===
  let dragGroupStart = new Map();

  interact('.widget').draggable({
    listeners: {
      start (event) {
        dragGroupStart.clear();
        const target = event.target;
        const selected = target.classList.contains('selected')
          ? document.querySelectorAll('.widget.selected')
          : [target];
        for (const w of selected) {
          dragGroupStart.set(w, {
            x: parseFloat(w.getAttribute('data-x')) || 0,
            y: parseFloat(w.getAttribute('data-y')) || 0
          });
        }
        event.interaction.startX = parseFloat(target.getAttribute('data-x')) || 0;
        event.interaction.startY = parseFloat(target.getAttribute('data-y')) || 0;
      },
      move (event) {
        const target = event.target;
        let dx = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx - (event.interaction.startX || 0);
        let dy = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy - (event.interaction.startY || 0);

        // Smart snap (от snap.js) само за target
        let tx = (dragGroupStart.get(target)?.x || 0) + dx;
        let ty = (dragGroupStart.get(target)?.y || 0) + dy;
        const snapped = smartSnap(target, tx, ty, event);
        let sdx = snapped.x - (dragGroupStart.get(target)?.x || 0);
        let sdy = snapped.y - (dragGroupStart.get(target)?.y || 0);

        for (const [w, start] of dragGroupStart) {
          let x = start.x + sdx;
          let y = start.y + sdy;
          w.style.transform = `translate(${x}px, ${y}px)`;
          w.setAttribute('data-x', x);
          w.setAttribute('data-y', y);
        }
      },
      end () {
        hideGuides();
        dragGroupStart.clear();
      }
    }
  });

  // В момента resize snap остава локално (ще го изнесем по-късно)
  interact('.widget').resizable({
    edges: { left: true, right: true, top: true, bottom: true },
    listeners: {
      move (event) {
        let x = parseFloat(event.target.getAttribute('data-x')) || 0;
        let y = parseFloat(event.target.getAttribute('data-y')) || 0;
        event.target.style.width  = event.rect.width + 'px';
        event.target.style.height = event.rect.height + 'px';
        x += event.deltaRect.left; y += event.deltaRect.top;

        const w = event.rect.width; const h = event.rect.height;
        const tr = { left:x, right:x+w, top:y, bottom:y+h, centerX:x+w/2, centerY:y+h/2 };
        let snappedX = x, snappedY = y; let snappedW = w, snappedH = h;
        let vGuide = null, hGuide = null; let vGuidePos = null, hGuidePos = null;

        if (SNAP_ENABLED && !event.shiftKey) {
          for (const other of allWidgets(event.target)) {
            const or = getRect(other);
            if (SNAP_EDGES) {
              for (const [txName, tx] of [['left', tr.left], ['right', tr.right]]) {
                for (const ox of [or.left, or.right]) {
                  if (Math.abs(tx - ox) < SNAP_TOL) {
                    if (txName === 'left')   { snappedX = ox; snappedW = tr.right - ox; vGuide = true; vGuidePos = ox; }
                    if (txName === 'right')  { snappedW = ox - tr.left; vGuide = true; vGuidePos = ox; }
                  }
                }
              }
            }
            if (SNAP_CENTERS) {
              for (const [txName, tx] of [['centerX', tr.centerX]]) {
                for (const ox of [or.centerX]) {
                  if (Math.abs(tx - ox) < SNAP_TOL) {
                    const newX = ox - (tr.right - tr.left)/2;
                    snappedX = newX; snappedW = tr.right - tr.left; vGuide = true; vGuidePos = ox;
                  }
                }
              }
            }
            if (SNAP_EDGES) {
              for (const [tyName, ty] of [['top', tr.top], ['bottom', tr.bottom]]) {
                for (const oy of [or.top, or.bottom]) {
                  if (Math.abs(ty - oy) < SNAP_TOL) {
                    if (tyName === 'top')    { snappedY = oy; snappedH = tr.bottom - oy; hGuide = true; hGuidePos = oy; }
                    if (tyName === 'bottom') { snappedH = oy - tr.top; hGuide = true; hGuidePos = oy; }
                  }
                }
              }
            }
            if (SNAP_CENTERS) {
              for (const [tyName, ty] of [['centerY', tr.centerY]]) {
                for (const oy of [or.centerY]) {
                  if (Math.abs(ty - oy) < SNAP_TOL) {
                    const newY = oy - (tr.bottom - tr.top)/2;
                    snappedY = newY; snappedH = tr.bottom - tr.top; hGuide = true; hGuidePos = oy;
                  }
                }
              }
            }
          }
        }

        event.target.style.transform = `translate(${snappedX}px, ${snappedY}px)`;
        event.target.setAttribute('data-x', snappedX);
        event.target.setAttribute('data-y', snappedY);
        event.target.style.width  = Math.max(40, snappedW) + 'px';
        event.target.style.height = Math.max(40, snappedH) + 'px';

        if (vGuide && vGuidePos !== null) showGuideLocal('v', vGuidePos); else { const gv=document.getElementById('guide-v'); if (gv) gv.style.display='none'; }
        if (hGuide && hGuidePos !== null) showGuideLocal('h', hGuidePos); else { const gh=document.getElementById('guide-h'); if (gh) gh.style.display='none'; }
      },
      end () { hideGuides(); }
    }
  });

  // === Context Menu Mount ===
  loadComponent('#context-menu-mount', 'components/context-menu.html').then(() => {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    canvas.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      showContextMenu(e.pageX, e.pageY, [
        { label: 'Group',     shortcut: 'Ctrl+G',        action: groupSelected },
        { label: 'Ungroup',   shortcut: 'Ctrl+Shift+G',  action: ungroupSelected },
        'separator',
        { label: 'Copy',      shortcut: 'Ctrl+C',        action: copySelected },
        { label: 'Paste',     shortcut: 'Ctrl+V',        action: pasteClipboard },
        { label: 'Duplicate', shortcut: 'Ctrl+D',        action: duplicateSelected },
        { label: 'Delete',    shortcut: 'Del',           action: deleteSelected }
      ]);
    });
  });
});
