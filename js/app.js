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

  interact('.widget').resizable({
  edges: { left: true, right: true, top: true, bottom: true },
  inertia: false,
  listeners: {
    start (event) {
      const t = event.target;
      const x = parseFloat(t.getAttribute('data-x')) || 0;
      const y = parseFloat(t.getAttribute('data-y')) || 0;
      event.interaction._resizeStart = {
        x, y,
        w: t.offsetWidth,
        h: t.offsetHeight,
        right: x + t.offsetWidth,
        bottom: y + t.offsetHeight
      };
    },
    move (event) {
      const start = event.interaction._resizeStart;
      const moving = event.edges || {}; // {left?, right?, top?, bottom?}

      // 1) Предложени стойности (без писане в DOM)
      let x = start.x + event.deltaRect.left;
      let y = start.y + event.deltaRect.top;
      let w = start.w + event.deltaRect.width;
      let h = start.h + event.deltaRect.height;

      // 2) Кандидат-ръбове
      let left   = x;
      let right  = x + w;
      let top    = y;
      let bottom = y + h;

      // 3) SNAP САМО за движещите се ръбове (намалява jitter)
      const tol = SNAP_TOL;
      if (SNAP_ENABLED && !event.shiftKey) {
        for (const other of allWidgets(event.target)) {
          const or = getRect(other);

          // хоризонтални ръбове
          if (SNAP_EDGES) {
            if (moving.left) {
              for (const ox of [or.left, or.right]) {
                if (Math.abs(left - ox) < tol) { left = ox; }
              }
            }
            if (moving.right) {
              for (const ox of [or.left, or.right]) {
                if (Math.abs(right - ox) < tol) { right = ox; }
              }
            }
          }
          // по време на resize център-снап често води до тресене → по желание го изключи
          // ако държиш да го имаш, активирай само за moving.right|left, но внимателно.
          // if (SNAP_CENTERS && (moving.left || moving.right)) { ... }

          // вертикални ръбове
          if (SNAP_EDGES) {
            if (moving.top) {
              for (const oy of [or.top, or.bottom]) {
                if (Math.abs(top - oy) < tol) { top = oy; }
              }
            }
            if (moving.bottom) {
              for (const oy of [or.top, or.bottom]) {
                if (Math.abs(bottom - oy) < tol) { bottom = oy; }
              }
            }
          }
          // if (SNAP_CENTERS && (moving.top || moving.bottom)) { ... }
        }
      }

      // 4) Рекомпозиция според фиксирания ръб
      // хоризонтално
      if (moving.left && !moving.right) {
        x = left;
        w = start.right - left;
      } else if (moving.right && !moving.left) {
        x = start.x;
        w = right - start.x;
      } else {
        // и двата ръба (рядко): приоритизираме right
        x = left;
        w = right - left;
      }

      // вертикално
      if (moving.top && !moving.bottom) {
        y = top;
        h = start.bottom - top;
      } else if (moving.bottom && !moving.top) {
        y = start.y;
        h = bottom - start.y;
      } else {
        y = top;
        h = bottom - top;
      }

      // 5) Минимални размери + писане в DOM (еднократно)
      w = Math.max(40, w);
      h = Math.max(40, h);

      event.target.style.transform = `translate(${x}px, ${y}px)`;
      event.target.setAttribute('data-x', x);
      event.target.setAttribute('data-y', y);
      event.target.style.width  = w + 'px';
      event.target.style.height = h + 'px';

      // Гайдове — показваме само ако съответният ръб е снапнал
      // (по-добра визуална стабилност; тук ги скриваме изцяло, може да върнеш логика при нужда)
      hideGuides();
    },
    end () {
      hideGuides();
    }
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
