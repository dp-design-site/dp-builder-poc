let SNAP_TOL = 8;
let SNAP_ENABLED = true;
let SNAP_EDGES = true;
let SNAP_CENTERS = true;

function allWidgets(except = null) {
  return Array.from(document.querySelectorAll('.widget')).filter(w => w !== except);
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

function hideGuides() {
  document.getElementById('guide-v').style.display = 'none';
  document.getElementById('guide-h').style.display = 'none';
}

function showGuide(axis, pos) {
  const guide = document.getElementById(axis === 'v' ? 'guide-v' : 'guide-h');
  if (axis === 'v') {
    guide.style.left = pos + 'px';
    guide.style.display = 'block';
  } else {
    guide.style.top = pos + 'px';
    guide.style.display = 'block';
  }
  updateGuideStyles(); // винаги обновявай стиловете!
}

function updateGuideStyles() {
  const style = document.getElementById('guide-style')?.value || 'solid';
  const color = document.getElementById('guide-color')?.value || '#37bcff';
  const width = document.getElementById('guide-width')?.value || 2;
  for (const id of ['guide-v', 'guide-h']) {
    const guide = document.getElementById(id);
    // Style: dashed, dotted, solid
    if (style !== 'solid') {
      guide.style.background = 'none';
      if (id === 'guide-v') {
        guide.style.borderLeft = width + 'px ' + style + ' ' + color;
        guide.style.borderTop = 'none';
      } else {
        guide.style.borderTop = width + 'px ' + style + ' ' + color;
        guide.style.borderLeft = 'none';
      }
    } else {
      guide.style.border = 'none';
      guide.style.background = color;
    }
    guide.style.width = id === 'guide-v' ? width + 'px' : '';
    guide.style.height = id === 'guide-h' ? width + 'px' : '';
  }
}

function smartSnap(target, nx, ny, event = {}) {
  if (!SNAP_ENABLED || event.shiftKey) {
    hideGuides();
    return { x: nx, y: ny };
  }
  const tr = getRect(target);
  let snappedX = nx, snappedY = ny;
  let vGuide = null, hGuide = null;
  let vGuidePos = null, hGuidePos = null;

  for (const other of allWidgets(target)) {
    const or = getRect(other);

    // Vertical snap (left, center, right)
    if (SNAP_EDGES) {
      for (const [txName, tx] of [['left', tr.left], ['right', tr.right]]) {
        for (const ox of [or.left, or.right]) {
          if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
            snappedX = ox - (tx - tr.left);
            vGuide = true;
            vGuidePos = snappedX + (tx - tr.left);
          }
        }
      }
    }
    if (SNAP_CENTERS) {
      for (const [txName, tx] of [['centerX', tr.centerX]]) {
        for (const ox of [or.centerX]) {
          if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
            snappedX = ox - (tx - tr.left);
            vGuide = true;
            vGuidePos = snappedX + (tx - tr.left);
          }
        }
      }
    }

    // Horizontal snap (top, center, bottom)
    if (SNAP_EDGES) {
      for (const [tyName, ty] of [['top', tr.top], ['bottom', tr.bottom]]) {
        for (const oy of [or.top, or.bottom]) {
          if (Math.abs((ny + (ty - tr.top)) - oy) < SNAP_TOL) {
            snappedY = oy - (ty - tr.top);
            hGuide = true;
            hGuidePos = snappedY + (ty - tr.top);
          }
        }
      }
    }
    if (SNAP_CENTERS) {
      for (const [tyName, ty] of [['centerY', tr.centerY]]) {
        for (const oy of [or.centerY]) {
          if (Math.abs((ny + (ty - tr.top)) - oy) < SNAP_TOL) {
            snappedY = oy - (ty - tr.top);
            hGuide = true;
            hGuidePos = snappedY + (ty - tr.top);
          }
        }
      }
    }
  }

  if (vGuide && vGuidePos !== null) showGuide('v', vGuidePos);
  else document.getElementById('guide-v').style.display = 'none';
  if (hGuide && hGuidePos !== null) showGuide('h', hGuidePos);
  else document.getElementById('guide-h').style.display = 'none';

  return { x: snappedX, y: snappedY };
}

// === Snapbar logic ===
document.addEventListener('DOMContentLoaded', () => {
  // Guide style update
  updateGuideStyles();
  // Snap enable
  document.getElementById('snap-enable')?.addEventListener('change', e => {
    SNAP_ENABLED = !!e.target.checked;
  });
  document.getElementById('snap-edges')?.addEventListener('change', e => {
    SNAP_EDGES = !!e.target.checked;
  });
  document.getElementById('snap-centers')?.addEventListener('change', e => {
    SNAP_CENTERS = !!e.target.checked;
  });
  document.getElementById('snap-tolerance')?.addEventListener('input', e => {
    SNAP_TOL = parseInt(e.target.value, 10);
  });
  for (const id of ['guide-style','guide-color','guide-width']) {
    document.getElementById(id)?.addEventListener('input', updateGuideStyles);
  }

  // Drag/resize init
  interact('.widget').draggable({
    listeners: {
      move (event) {
        const target = event.target;
        let x = parseFloat(target.getAttribute('data-x')) || 0;
        let y = parseFloat(target.getAttribute('data-y')) || 0;
        x += event.dx;
        y += event.dy;
        // --- SNAPPING ---
        const snapped = smartSnap(target, x, y, event);
        x = snapped.x; y = snapped.y;

        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      },
      end () {
        hideGuides();
      }
    }
  });
  interact('.widget').resizable({
    edges: { left: true, right: true, top: true, bottom: true },
    listeners: {
      move (event) {
        let x = parseFloat(event.target.getAttribute('data-x')) || 0;
        let y = parseFloat(event.target.getAttribute('data-y')) || 0;
        // Преди resize - старите w/h:
        const prevW = event.target.offsetWidth;
        const prevH = event.target.offsetHeight;

        // Update размера
        event.target.style.width  = event.rect.width + 'px';
        event.target.style.height = event.rect.height + 'px';

        // Update позиция ако resize-ваш от ляво/горе
        x += event.deltaRect.left;
        y += event.deltaRect.top;

        // --- SNAPPING ---
        // Правим временно нов getRect:
        const w = event.rect.width;
        const h = event.rect.height;
        const tr = {
          left: x, right: x + w, top: y, bottom: y + h,
          centerX: x + w/2, centerY: y + h/2
        };

        let snappedX = x, snappedY = y;
        let snappedW = w, snappedH = h;
        let vGuide = null, hGuide = null;
        let vGuidePos = null, hGuidePos = null;

        if (SNAP_ENABLED && !event.shiftKey) {
          for (const other of allWidgets(event.target)) {
            const or = getRect(other);

            // Вертикален snap (left/right/center)
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
                    // Snap към център – местим x и width наведнъж
                    const newX = ox - (tr.right - tr.left)/2;
                    snappedX = newX;
                    snappedW = tr.right - tr.left;
                    vGuide = true; vGuidePos = ox;
                  }
                }
              }
            }
            // Хоризонтален snap (top/bottom/center)
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
                    snappedY = newY;
                    snappedH = tr.bottom - tr.top;
                    hGuide = true; hGuidePos = oy;
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

        if (vGuide && vGuidePos !== null) showGuide('v', vGuidePos);
        else document.getElementById('guide-v').style.display = 'none';
        if (hGuide && hGuidePos !== null) showGuide('h', hGuidePos);
        else document.getElementById('guide-h').style.display = 'none';
      },
      end () {
        hideGuides();
      }
    }
  });
});
