/**
 * Lobby — Enter name, pick color, join the world
 */
export class Lobby {
    constructor() {
        this.overlay = document.getElementById('lobby-screen');
        this.nameInput = document.getElementById('lobby-name');
        this.joinBtn = document.getElementById('lobby-join');
        this.colorBtns = document.querySelectorAll('.color-option');
        this.onJoin = null;

        this.selectedColor = 0x42a5f5;

        this._bindEvents();
    }

    _bindEvents() {
        // Color picker
        this.colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.colorBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedColor = parseInt(btn.dataset.color, 16);
            });
        });

        // Join
        this.joinBtn.addEventListener('click', () => this._join());
        this.nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._join();
        });

        // Select first color
        if (this.colorBtns.length > 0) {
            this.colorBtns[0].classList.add('selected');
        }
    }

    _join() {
        const name = this.nameInput.value.trim() || `Player${Math.floor(Math.random() * 999)}`;
        if (this.onJoin) {
            this.onJoin(name, this.selectedColor);
        }
    }

    hide() {
        this.overlay.classList.add('hidden');
    }

    show() {
        this.overlay.classList.remove('hidden');
        this.nameInput.focus();
    }

    showError(msg) {
        const err = document.getElementById('lobby-error');
        if (err) {
            err.textContent = msg;
            err.classList.remove('hidden');
        }
    }
}
