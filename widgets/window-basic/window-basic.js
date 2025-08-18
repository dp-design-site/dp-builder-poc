/*
 DP Configurator — Widget: Window (window-basic)
 File: widgets/window-basic/window-basic.js

 Contract with WidgetRegistry:
 - Must call WidgetRegistry.define('window-basic', { ... })
 - Exports init(el, options, ctx) → sets up behavior inside the widget
 - Optional: schema, getState, setState, serialize for Properties panel
*/

(function(){
  if (!window.WidgetRegistry) {
    console.error('WidgetRegistry not found. window-basic.js requires it.');
    return;
  }

  WidgetRegistry.define('window-basic', {
    /**
     * Init is called after HTML template + CSS are loaded and inserted.
     * @param {HTMLElement} el - the .widget[data-type="window-basic"] element
     * @param {Object} options - payload from LibraryUI (e.g. {label})
     * @param {Object} ctx - { type, assets, registry }
     */
    init(el, options, ctx) {
      // If label provided → set name span
      if (options?.label) {
        const nameSpan = el.querySelector('.wb-name');
        if (nameSpan) nameSpan.textContent = options.label;
      }

      // Example behavior: double-click to toggle sash orientation (vertical/horizontal)
      const sash = el.querySelector('.wb-sash');
      if (sash) {
        sash.addEventListener('dblclick', () => {
          const vertical = sash.classList.toggle('horizontal');
          if (vertical) {
            sash.style.width = '100%';
            sash.style.height = '2px';
          } else {
            sash.style.width = '2px';
            sash.style.height = '100%';
          }
        });
      }
    },

    /**
     * Schema for Properties panel (MVP example)
     */
    schema: {
      name: { type: 'string', label: 'Name' },
      width: { type: 'number', label: 'Width' },
      height: { type: 'number', label: 'Height' },
      lock: { type: 'boolean', label: 'Lock size/pos' },
      zIndex: { type: 'number', label: 'Z-index' }
    },

    getState(el) {
      return {
        name: el.querySelector('.wb-name')?.textContent || 'Window',
        width: el.offsetWidth,
        height: el.offsetHeight,
        lock: el.classList.contains('locked'),
        zIndex: parseInt(el.style.zIndex || '0', 10)
      };
    },

    setState(el, state) {
      if (!state) return;
      if (state.name) {
        const nameSpan = el.querySelector('.wb-name');
        if (nameSpan) nameSpan.textContent = state.name;
      }
      if (state.width) el.style.width = state.width + 'px';
      if (state.height) el.style.height = state.height + 'px';
      if (state.lock) el.classList.add('locked'); else el.classList.remove('locked');
      if (state.zIndex !== undefined) el.style.zIndex = String(state.zIndex);
    },

    serialize(el) {
      return this.getState(el);
    }
  });
})();
