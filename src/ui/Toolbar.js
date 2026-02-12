export class Toolbar {
    constructor() {
        this.btnImport = document.getElementById('btn-import');
        this.btnTranslate = document.getElementById('btn-translate');
        this.btnRotate = document.getElementById('btn-rotate');
        this.btnScale = document.getElementById('btn-scale');
        this.btnGrid = document.getElementById('btn-grid');
        this.btnWireframe = document.getElementById('btn-wireframe');
        this.btnFullscreen = document.getElementById('btn-fullscreen');

        this.onImport = null;
        this.onTransformMode = null;
        this.onToggleGrid = null;
        this.onToggleWireframe = null;
        this.onFullscreen = null;

        this._bindEvents();
        this._bindKeyboard();
    }

    _bindEvents() {
        this.btnImport.addEventListener('click', () => {
            if (this.onImport) this.onImport();
        });

        // Transform buttons
        [this.btnTranslate, this.btnRotate, this.btnScale].forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this._setActiveTransform(mode);
                if (this.onTransformMode) this.onTransformMode(mode);
            });
        });

        this.btnGrid.addEventListener('click', () => {
            if (this.onToggleGrid) {
                const isActive = this.onToggleGrid();
                this.btnGrid.classList.toggle('active', isActive);
            }
        });

        this.btnWireframe.addEventListener('click', () => {
            if (this.onToggleWireframe) {
                const isActive = this.onToggleWireframe();
                this.btnWireframe.classList.toggle('active', isActive);
            }
        });

        this.btnFullscreen.addEventListener('click', () => {
            if (this.onFullscreen) this.onFullscreen();
        });
    }

    _bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT') return;

            switch (e.key.toLowerCase()) {
                case 'w':
                    this._setActiveTransform('translate');
                    if (this.onTransformMode) this.onTransformMode('translate');
                    break;
                case 'e':
                    this._setActiveTransform('rotate');
                    if (this.onTransformMode) this.onTransformMode('rotate');
                    break;
                case 'r':
                    this._setActiveTransform('scale');
                    if (this.onTransformMode) this.onTransformMode('scale');
                    break;
                case 'g':
                    this.btnGrid.click();
                    break;
                case 'f':
                    this.btnWireframe.click();
                    break;
            }
        });
    }

    _setActiveTransform(mode) {
        [this.btnTranslate, this.btnRotate, this.btnScale].forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
    }
}
