// js/core/snap.js
let SNAP_TOL = 3;
let SNAP_ENABLED = true;
let SNAP_EDGES = true;
let SNAP_CENTERS = true;

export function setSnapOptions({ enabled, edges, centers, tolerance } = {}) {
  if (enabled  != null) SNAP_ENABLED  = !!enabled;
  if (edges    != null) SNAP_EDGES    = !!edges;
  if (centers  != null) SNAP_CENTERS  = !!centers;
  if (tolerance!= null) SNAP_TOL      = parseInt(tolerance, 10);
}

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

export function hideGuides() {
  const v = document.getElementById('guide-v');
  const h = document.getElementById('guide-h');
  if (v) v.style.display = 'none';
  if (h) h.style.display = 'none';
}

function showGuide(axis, pos) {
  const guide = document.getElementById(axis === 'v' ? 'guide-v' : 'guide-h');
  if (!guide) return;
  if (axis === 'v') { guide.style.left = pos + 'px'; }
  else { guide.style.top = pos + 'px'; }
  guide.style.display = 'block';
  updateGuideStyles();
}

export function updateGuideStyles() {
  const style = document.getElementById('guide-style')?.value || 'solid';
  const color = document.getElementById('guide-color')?.value || '#37bcff';
  const width = parseFloat(document.getElementById('guide-width')?.value || 2);

  for (const id of ['guide-v', 'guide-h']) {
    const guide = document.getElementById(id);
    if (!guide) continue;
    if (style !== 'solid') {
      guide.style.background = 'none';
      if (id === 'guide-v') {
        guide.style.borderLeft = `${width}px ${style} ${color}`;
        guide.style.borderTop  = 'none';
      } else {
        guide.style.borderTop  = `${width}px ${style} ${color}`;
        guide.style.borderLeft = 'none';
      }
    } else {
      guide.style.border = 'none';
      guide.style.background = color;
    }
    guide.style.width  = id === 'guide-v' ? `${width}px` : '';
    guide.style.height = id === 'guide-h' ? `${width}px` : '';
  }
}

export function smartSnap(target, nx, ny, event = {}) {
  if (!SNAP_ENABLED || event.shiftKey) { hideGuides(); return { x: nx, y: ny }; }

  const ignoreSelected = target.classList.contains('selected');
  const tr = getRect(target);
  let snappedX = nx, snappedY = ny;
  let vGuide = null, hGuide = null;
  let vGuidePos = null, hGuidePos = null;

  for (const other of allWidgets(target, ignoreSelected)) {
    const or = getRect(other);

    // Vertical
    if (SNAP_EDGES) {
      for (const tx of [tr.left, tr.right]) {
        for (const ox of [or.left, or.right]) {
          if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
            snappedX = ox - (tx - tr.left);
            vGuide = true; vGuidePos = snappedX + (tx - tr.left);
          }
        }
      }
    }
    if (SNAP_CENTERS) {
      for (const tx of [tr.left, tr.centerX, tr.right]) {
        for (const ox of [or.left, or.centerX, or.right]) {
          if (Math.abs((nx + (tx - tr.left)) - ox) < SNAP_TOL) {
            snappedX = ox - (tx - tr.left);
            vGuide = true; vGuidePos = snappedX + (tx - tr.left);
          }
        }
      }
    }

    // Horizontal
    if (SNAP_EDGES) {
      for (const ty of [tr.top, tr.bottom]) {
        for (const oy of [or.top, or.bottom]) {
          if (Math.abs((ny + (ty - tr.top)) - oy) < SNAP_TOL) {
            snappedY = oy - (ty - tr.top);
            hGuide = true; hGuidePos = snappedY + (ty - tr.top);
          }
        }
      }
    }
    if (SNAP_CENTERS) {
      for (const ty of [tr.centerY]) {
        for (const oy of [or.centerY]) {
          if (Math.abs((ny + (ty - tr.top)) - oy) < SNAP_TOL) {
            snappedY = oy - (ty - tr.top);
            hGuide = true; hGuidePos = snappedY + (ty - tr.top);
          }
        }
      }
    }
  }

  if (vGuide && vGuidePos !== null) showGuide('v', vGuidePos);
  else document.getElementById('guide-v')?.style && (document.getElementById('guide-v').style.display = 'none');
  if (hGuide && hGuidePos !== null) showGuide('h', hGuidePos);
  else document.getElementById('guide-h')?.style && (document.getElementById('guide-h').style.display = 'none');

  return { x: snappedX, y: snappedY };
}
// В core/snap.js
export function snapResize(event, start, moving) {
  // moving: {left?:bool,right?:bool,top?:bool,bottom?:bool}
  const tol = SNAP_TOL;

  // 1) Кандидат стойности (без DOM writes)
  let x = start.x + event.deltaRect.left;
  let y = start.y + event.deltaRect.top;
  let w = start.w + event.deltaRect.width;
  let h = start.h + event.deltaRect.height;

  let left   = x;
  let right  = x + w;
  let top    = y;
  let bottom = y + h;

  // 2) Снап само на активните ръбове (без центрове за стабилност)
  if (SNAP_ENABLED && !event.shiftKey) {
    for (const other of allWidgets(event.target)) {
      const or = getRect(other);

      // хоризонтални ръбове
      if (SNAP_EDGES) {
        if (moving.left) {
          if (Math.abs(left - or.left)  < tol) left  = or.left;
          if (Math.abs(left - or.right) < tol) left  = or.right;
        }
        if (moving.right) {
          if (Math.abs(right - or.left)  < tol) right = or.left;
          if (Math.abs(right - or.right) < tol) right = or.right;
        }
      }

      // вертикални ръбове
      if (SNAP_EDGES) {
        if (moving.top) {
          if (Math.abs(top - or.top)    < tol) top    = or.top;
          if (Math.abs(top - or.bottom) < tol) top    = or.bottom;
        }
        if (moving.bottom) {
          if (Math.abs(bottom - or.top)    < tol) bottom = or.top;
          if (Math.abs(bottom - or.bottom) < tol) bottom = or.bottom;
        }
      }
    }
  }

  // 3) Рекомпозиция спрямо фиксирания ръб (другият остава от стартовия rect)
  if (moving.left && !moving.right) {
    x = left;               w = start.right  - left;
  } else if (moving.right && !moving.left) {
    x = start.x;            w = right - start.x;
  } else { // и двата (рядко) – приемаме left/right като граници
    x = left;               w = right - left;
  }

  if (moving.top && !moving.bottom) {
    y = top;                h = start.bottom - top;
  } else if (moving.bottom && !moving.top) {
    y = start.y;            h = bottom - start.y;
  } else {
    y = top;                h = bottom - top;
  }

  // 4) Минимални размери и леко закръгляне за стабилен UI
  w = Math.max(40, w);
  h = Math.max(40, h);
  // по желание: закръгляй до цели пиксели, но не е задължително
  x = Math.round(x); y = Math.round(y);
  w = Math.round(w); h = Math.round(h);

  return { x, y, w, h };
}

