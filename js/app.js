// app.js (ES module, minimal)
document.addEventListener('DOMContentLoaded', () => {
  // Drag & resize за всички .widget
  interact('.widget').draggable({
    listeners: {
      move (event) {
        const target = event.target;
        let x = parseInt(target.getAttribute('data-x')) || 0;
        let y = parseInt(target.getAttribute('data-y')) || 0;
        x += event.dx;
        y += event.dy;
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      }
    }
  });
  interact('.widget').resizable({
    edges: { left: true, right: true, top: true, bottom: true },
    listeners: {
      move (event) {
        let { x, y } = event.target.dataset;
        x = parseInt(x) || 0;
        y = parseInt(y) || 0;
        // update the element's style
        event.target.style.width  = event.rect.width + 'px';
        event.target.style.height = event.rect.height + 'px';
        // translate when resizing from top/left edges
        x += event.deltaRect.left;
        y += event.deltaRect.top;
        event.target.style.transform = `translate(${x}px, ${y}px)`;
        event.target.setAttribute('data-x', x);
        event.target.setAttribute('data-y', y);
      }
    }
  });
});
