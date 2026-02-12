const CUBE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;

const TRASH_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

export class Sidebar {
    constructor(container) {
        this.container = container;
        this.items = [];
        this.onSelect = null;
        this.onDelete = null;
    }

    addItem(object) {
        const name = object.userData.displayName || 'Untitled';
        this.items.push({ object, name });
        this._render();
    }

    removeItem(object) {
        this.items = this.items.filter(item => item.object !== object);
        this._render();
    }

    setSelected(object) {
        const itemEls = this.container.querySelectorAll('.tree-item');
        itemEls.forEach((el, index) => {
            if (this.items[index]?.object === object) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }

    _render() {
        if (this.items.length === 0) {
            this.container.innerHTML = `
        <div class="scene-tree-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <p>No models loaded</p>
          <span>Import an OBJ file to begin</span>
        </div>
      `;
            return;
        }

        this.container.innerHTML = this.items.map((item, index) => `
      <div class="tree-item" data-index="${index}">
        <div class="tree-item-icon">${CUBE_ICON}</div>
        <span class="tree-item-name">${item.name}</span>
        <button class="tree-item-delete" data-index="${index}" title="Remove">${TRASH_ICON}</button>
      </div>
    `).join('');

        // Bind click events
        this.container.querySelectorAll('.tree-item').forEach((el) => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.tree-item-delete')) return;
                const idx = parseInt(el.dataset.index);
                if (this.onSelect) this.onSelect(this.items[idx].object);
            });
        });

        this.container.querySelectorAll('.tree-item-delete').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                if (this.onDelete) this.onDelete(this.items[idx].object);
            });
        });
    }
}
