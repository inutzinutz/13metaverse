export class ImportModal {
    constructor() {
        this.overlay = document.getElementById('import-modal');
        this.closeBtn = document.getElementById('modal-close');
        this.dropzone = document.getElementById('import-dropzone');
        this.browseBtn = document.getElementById('btn-browse');
        this.fileInput = document.getElementById('file-input');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingText = document.getElementById('loading-text');
        this.loadingProgress = document.getElementById('loading-progress');

        this.onFilesSelected = null;

        this._bindEvents();
    }

    _bindEvents() {
        // Close
        this.closeBtn.addEventListener('click', () => this.hide());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });

        // Browse
        this.browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this._handleFiles(e.target.files);
                this.fileInput.value = '';
            }
        });

        // Dropzone drag & drop
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropzone.classList.add('dragover');
        });

        this.dropzone.addEventListener('dragleave', () => {
            this.dropzone.classList.remove('dragover');
        });

        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this._handleFiles(e.dataTransfer.files);
            }
        });

        // Click dropzone to browse
        this.dropzone.addEventListener('click', (e) => {
            if (e.target !== this.browseBtn && !this.browseBtn.contains(e.target)) {
                this.fileInput.click();
            }
        });
    }

    _handleFiles(files) {
        let objFile = null;
        let mtlFile = null;

        for (const file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'obj') objFile = file;
            if (ext === 'mtl') mtlFile = file;
        }

        if (!objFile) {
            alert('Please select an .obj file');
            return;
        }

        this.hide();
        if (this.onFilesSelected) {
            this.onFilesSelected(objFile, mtlFile);
        }
    }

    show() {
        this.overlay.classList.remove('hidden');
    }

    hide() {
        this.overlay.classList.add('hidden');
    }

    showLoading(text = 'Loading model...') {
        this.loadingText.textContent = text;
        this.loadingProgress.style.width = '0%';
        this.loadingOverlay.classList.remove('hidden');
    }

    updateProgress(percent) {
        this.loadingProgress.style.width = `${percent}%`;
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }
}
