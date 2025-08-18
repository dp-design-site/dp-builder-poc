// js/core/selection.js
// Отговаря за: marquee selection, ESC за чистене, клик поведение и helper-и.
// Използване: import { initSelection, getSelected, clearSelection, toggleSelection, setSelection } from './core/selection.js'

export function getSelected() {
  return Array.from(document.querySelectorAll('.widget.selected'));
}

export function clearSelection() {
  for (const w of getSelected()) w.classList.remove('selected');
}

export function toggleSelection(el) {
  el.classList.toggle('selected');
}

export function setSelection(els) {
  clearSelection();
  for (const el of els) el.classList.add('selected');
}

function setMarqueeDragging(dragging) {
  if (dragging) document.body.classList.add('marquee-dragging');
  else document.body.classList.remove('marquee-dragging');
}

export function initSelection() {
  const canvas = document.getElementById('canvas');
  const marquee = document.getElementById('marquee');
  if (!canvas || !marquee) return;

  let marqueeActive = false;
  let marqueeStart = { x: 0, y: 0 };
  let marqueeType = 'normal'; // left-right или right-left

  // ==============================
  // Marquee start (фикс: ползвай closest('.widget'))
  // ==============================
  canvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;

    // FIX: ако кликът е върху ИЛИ вътре в widget, НЕ стартираме marquee
    const widgetUnder = e.target.closest('.widget');
    if (widgetUnder) return;

    if (!e.shiftKey && !e.ctrlKey) clearSelection();

    marqueeActive = true;
    setMarqueeDragging(true);
    marqueeStart = { x: e.offsetX, y: e.offsetY };
    marquee.style.left = marqueeStart.x + 'px';
    marquee.style.top = marqueeStart.y + 'px';
    marquee.style.width = marquee.style.height = '0px';
    marquee.style.display = 'block';
    marqueeType = null;
  });

  // Marquee move
  canvas.addEventListener('mousemove', function (e) {
    if (!marqueeActive) return;
    const x = e.offsetX, y = e.offsetY;
    const left = Math.min(marqueeStart.x, x);
    const top = Math.min(marqueeStart.y, y);
    const width = Math.abs(marqueeStart.x - x);
    const height = Math.abs(marqueeStart.y - y);

    marquee.style.left = left + 'px';
    marquee.style.top = top + 'px';
    marquee.style.width = width + 'px';
    marquee.style.height = height + 'px';

    marqueeType = (x >= marqueeStart.x) ? 'left-right' : 'right-left';

    for (const w of document.querySelectorAll('.widget')) {
      const wx = parseFloat(w.getAttribute('data-x')) || 0;
      const wy = parseFloat(w.getAttribute('data-y')) || 0;
      const ww = w.offsetWidth, wh = w.offsetHeight;

      if (marqueeType === 'left-right') {
        // изцяло в прозореца
        if (wx >= left && wx + ww <= left + width && wy >= top && wy + wh <= top + height) w.classList.add('selected');
        else w.classList.remove('selected');
      } else {
        // докосване
        if (wx < left + width && wx + ww > left && wy < top + height && wy + wh > top) w.classList.add('selected');
        else w.classList.remove('selected');
      }
    }
  });

  // Marquee end
  canvas.addEventListener('mouseup', function () {
    if (!marqueeActive) return;
    marqueeActive = false;
    setMarqueeDragging(false);
    marquee.style.display = 'none';
  });

  // ESC за изчистване
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      clearSelection();
      marqueeActive = false;
      setMarqueeDragging(false);
      marquee.style.display = 'none';
    }
  });

  // ==============================
  // Клик върху widget (оставено с closest)
  // ==============================
  let dragTimer = null, dragStarted = false;
  canvas.addEventListener('mousedown', function (e) {
    const widget = e.target.closest('.widget');
    if (!widget || e.button !== 0) return;

    if (e.shiftKey) {
      toggleSelection(widget);
      e.stopPropagation();
      return;
    }

    // ако вече има мултиселекция и този е част от нея – подготвяме long-press
    const selected = document.querySelectorAll('.widget.selected');
    if (selected.length > 1 && widget.classList.contains('selected')) {
      dragStarted = false;
      dragTimer = setTimeout(() => { dragStarted = true; }, 200);

      const moveHandler = () => {
        if (dragTimer) { clearTimeout(dragTimer); dragTimer = null; dragStarted = true; }
        window.removeEventListener('mousemove', moveHandler);
      };
      const upHandler = () => {
        if (!dragStarted) { setSelection([widget]); }
        window.removeEventListener('mouseup', upHandler);
        window.removeEventListener('mousemove', moveHandler);
        if (dragTimer) clearTimeout(dragTimer);
      };
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', upHandler);
    } else {
      setSelection([widget]);
    }

    e.stopPropagation();
  });
}
