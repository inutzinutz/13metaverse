export class PropertiesPanel {
    constructor(container) {
        this.container = container;
        this.currentObject = null;
        this.onChange = null;
        this._updateInterval = null;
    }

    show(object) {
        this.currentObject = object;
        if (!object) {
            this._showEmpty();
            return;
        }

        const name = object.userData.displayName || 'Object';
        const pos = object.position;
        const rot = object.rotation;
        const scl = object.scale;

        // Get first mesh color
        let hexColor = '#7c8ea6';
        object.traverse((child) => {
            if (child.isMesh && child.material?.color) {
                hexColor = '#' + child.material.color.getHexString();
                return;
            }
        });

        this.container.innerHTML = `
      <div class="prop-object-name">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <span class="prop-object-name-text">${name}</span>
      </div>

      <div class="prop-section">
        <div class="prop-section-header">Position</div>
        <div class="prop-row">
          <span class="prop-label x">X</span>
          <input class="prop-input" type="number" step="0.1" id="prop-pos-x" value="${pos.x.toFixed(3)}">
        </div>
        <div class="prop-row">
          <span class="prop-label y">Y</span>
          <input class="prop-input" type="number" step="0.1" id="prop-pos-y" value="${pos.y.toFixed(3)}">
        </div>
        <div class="prop-row">
          <span class="prop-label z">Z</span>
          <input class="prop-input" type="number" step="0.1" id="prop-pos-z" value="${pos.z.toFixed(3)}">
        </div>
      </div>

      <div class="prop-section">
        <div class="prop-section-header">Rotation (°)</div>
        <div class="prop-row">
          <span class="prop-label x">X</span>
          <input class="prop-input" type="number" step="1" id="prop-rot-x" value="${(rot.x * 180 / Math.PI).toFixed(1)}">
        </div>
        <div class="prop-row">
          <span class="prop-label y">Y</span>
          <input class="prop-input" type="number" step="1" id="prop-rot-y" value="${(rot.y * 180 / Math.PI).toFixed(1)}">
        </div>
        <div class="prop-row">
          <span class="prop-label z">Z</span>
          <input class="prop-input" type="number" step="1" id="prop-rot-z" value="${(rot.z * 180 / Math.PI).toFixed(1)}">
        </div>
      </div>

      <div class="prop-section">
        <div class="prop-section-header">Scale</div>
        <div class="prop-row">
          <span class="prop-label x">X</span>
          <input class="prop-input" type="number" step="0.1" id="prop-scl-x" value="${scl.x.toFixed(3)}">
        </div>
        <div class="prop-row">
          <span class="prop-label y">Y</span>
          <input class="prop-input" type="number" step="0.1" id="prop-scl-y" value="${scl.y.toFixed(3)}">
        </div>
        <div class="prop-row">
          <span class="prop-label z">Z</span>
          <input class="prop-input" type="number" step="0.1" id="prop-scl-z" value="${scl.z.toFixed(3)}">
        </div>
      </div>

      <div class="prop-section">
        <div class="prop-section-header">Material</div>
        <div class="prop-color-row">
          <input class="prop-color-input" type="color" id="prop-color" value="${hexColor}">
          <span class="prop-color-label">Color</span>
        </div>
      </div>
    `;

        this._bindInputs();
        this._startLiveUpdate();
    }

    _showEmpty() {
        this.container.innerHTML = `
      <div class="properties-empty">
        <p>Select an object to view properties</p>
      </div>
    `;
        this._stopLiveUpdate();
    }

    _bindInputs() {
        const obj = this.currentObject;
        if (!obj) return;

        // Position
        ['x', 'y', 'z'].forEach(axis => {
            const input = document.getElementById(`prop-pos-${axis}`);
            input?.addEventListener('change', () => {
                obj.position[axis] = parseFloat(input.value) || 0;
            });
        });

        // Rotation
        ['x', 'y', 'z'].forEach(axis => {
            const input = document.getElementById(`prop-rot-${axis}`);
            input?.addEventListener('change', () => {
                obj.rotation[axis] = (parseFloat(input.value) || 0) * Math.PI / 180;
            });
        });

        // Scale
        ['x', 'y', 'z'].forEach(axis => {
            const input = document.getElementById(`prop-scl-${axis}`);
            input?.addEventListener('change', () => {
                obj.scale[axis] = parseFloat(input.value) || 1;
            });
        });

        // Color
        const colorInput = document.getElementById('prop-color');
        colorInput?.addEventListener('input', (e) => {
            const color = parseInt(e.target.value.replace('#', ''), 16);
            obj.traverse((child) => {
                if (child.isMesh && child.material?.color) {
                    child.material.color.setHex(color);
                }
            });
        });
    }

    _startLiveUpdate() {
        this._stopLiveUpdate();
        this._updateInterval = setInterval(() => {
            if (!this.currentObject) return;
            const obj = this.currentObject;

            // Only update if input is not focused
            const active = document.activeElement;
            if (active && active.classList.contains('prop-input')) return;

            this._setVal('prop-pos-x', obj.position.x.toFixed(3));
            this._setVal('prop-pos-y', obj.position.y.toFixed(3));
            this._setVal('prop-pos-z', obj.position.z.toFixed(3));
            this._setVal('prop-rot-x', (obj.rotation.x * 180 / Math.PI).toFixed(1));
            this._setVal('prop-rot-y', (obj.rotation.y * 180 / Math.PI).toFixed(1));
            this._setVal('prop-rot-z', (obj.rotation.z * 180 / Math.PI).toFixed(1));
            this._setVal('prop-scl-x', obj.scale.x.toFixed(3));
            this._setVal('prop-scl-y', obj.scale.y.toFixed(3));
            this._setVal('prop-scl-z', obj.scale.z.toFixed(3));
        }, 100);
    }

    _stopLiveUpdate() {
        if (this._updateInterval) {
            clearInterval(this._updateInterval);
            this._updateInterval = null;
        }
    }

    _setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    hide() {
        this._showEmpty();
        this.currentObject = null;
    }
}
