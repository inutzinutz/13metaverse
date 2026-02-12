/**
 * Whiteboard — Collaborative drawing canvas
 * Synced across all players via WebSocket
 */
export class Whiteboard {
    constructor(networkManager) {
        this.network = networkManager;
        this.isOpen = false;
        this.isDrawing = false;
        this.currentColor = '#ffffff';
        this.brushSize = 3;
        this.tool = 'pen'; // pen, eraser
        this.lastPoint = null;
        this._createDOM();
    }

    _createDOM() {
        this.el = document.createElement('div');
        this.el.id = 'whiteboard';
        this.el.className = 'wb-overlay hidden';
        this.el.innerHTML = `
            <div class="wb-container">
                <div class="wb-header">
                    <div class="wb-title">📝 Whiteboard — DJI 13Store</div>
                    <div class="wb-tools">
                        <button class="wb-tool active" data-tool="pen" title="Pen">✏️</button>
                        <button class="wb-tool" data-tool="eraser" title="Eraser">🧹</button>
                        <input type="color" id="wb-color" value="#ffffff" class="wb-color-picker">
                        <select id="wb-size" class="wb-size">
                            <option value="2">เล็ก</option>
                            <option value="4" selected>กลาง</option>
                            <option value="8">ใหญ่</option>
                            <option value="16">ใหญ่มาก</option>
                        </select>
                        <button id="wb-clear" class="wb-btn-clear">🗑 ล้าง</button>
                    </div>
                    <button id="wb-close" class="wb-btn-close">✕</button>
                </div>
                <div class="wb-body">
                    <canvas id="wb-canvas" width="1200" height="700"></canvas>
                </div>
            </div>
        `;
        document.body.appendChild(this.el);
        this._injectStyles();
        this._bindEvents();
    }

    _injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .wb-overlay {
                position: fixed; inset: 0; z-index: 500;
                background: rgba(0,0,0,0.85);
                display: flex; align-items: center; justify-content: center;
                animation: wbFadeIn 0.3s ease;
            }
            .wb-overlay.hidden { display: none; }
            @keyframes wbFadeIn { from { opacity:0; } to { opacity:1; } }
            .wb-container {
                width: 90vw; height: 85vh;
                background: #1a1a1a; border-radius: 16px;
                border: 1px solid rgba(226,0,26,0.3);
                overflow: hidden; display: flex; flex-direction: column;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }
            .wb-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 16px; background: #111;
                border-bottom: 1px solid #333;
            }
            .wb-title { font-weight: 700; font-size: 15px; color: #fff; }
            .wb-tools {
                display: flex; align-items: center; gap: 8px;
            }
            .wb-tool {
                width: 36px; height: 36px; border: 1px solid #444;
                border-radius: 8px; background: #222; cursor: pointer;
                font-size: 16px; transition: all 0.2s;
            }
            .wb-tool.active { border-color: #e2001a; background: #e2001a22; }
            .wb-tool:hover { border-color: #e2001a; }
            .wb-color-picker {
                width: 36px; height: 36px; border: none;
                border-radius: 8px; cursor: pointer; background: none;
            }
            .wb-size {
                padding: 6px 10px; background: #222; border: 1px solid #444;
                border-radius: 8px; color: #fff; font-family: inherit;
                font-size: 12px; cursor: pointer;
            }
            .wb-btn-clear {
                padding: 6px 14px; background: #333; border: 1px solid #555;
                border-radius: 8px; color: #fff; cursor: pointer;
                font-size: 13px; font-family: inherit; transition: all 0.2s;
            }
            .wb-btn-clear:hover { background: #e2001a; border-color: #e2001a; }
            .wb-btn-close {
                width: 36px; height: 36px; border: none;
                background: #e2001a; color: #fff; border-radius: 8px;
                font-size: 16px; cursor: pointer; transition: background 0.2s;
            }
            .wb-btn-close:hover { background: #ff1a33; }
            .wb-body { flex: 1; display: flex; justify-content: center; align-items: center; background: #0d0d0d; }
            #wb-canvas {
                background: #222; border-radius: 4px;
                cursor: crosshair; max-width: 100%; max-height: 100%;
            }
        `;
        document.head.appendChild(style);
    }

    _bindEvents() {
        const canvas = document.getElementById('wb-canvas');
        const ctx = canvas.getContext('2d');
        this.ctx = ctx;
        this.canvas = canvas;

        // Drawing
        canvas.addEventListener('pointerdown', (e) => this._startDraw(e));
        canvas.addEventListener('pointermove', (e) => this._draw(e));
        canvas.addEventListener('pointerup', () => this._endDraw());
        canvas.addEventListener('pointerleave', () => this._endDraw());

        // Tools
        this.el.querySelectorAll('.wb-tool').forEach(btn => {
            btn.addEventListener('click', () => {
                this.el.querySelectorAll('.wb-tool').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.tool = btn.dataset.tool;
            });
        });

        // Color
        document.getElementById('wb-color').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });

        // Size
        document.getElementById('wb-size').addEventListener('change', (e) => {
            this.brushSize = parseInt(e.target.value);
        });

        // Clear
        document.getElementById('wb-clear').addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this._sendDraw({ type: 'clear' });
        });

        // Close
        document.getElementById('wb-close').addEventListener('click', () => this.close());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    }

    _getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
        };
    }

    _startDraw(e) {
        this.isDrawing = true;
        this.lastPoint = this._getCanvasPos(e);
    }

    _draw(e) {
        if (!this.isDrawing || !this.lastPoint) return;
        const pos = this._getCanvasPos(e);
        const drawData = {
            type: 'line',
            x1: this.lastPoint.x, y1: this.lastPoint.y,
            x2: pos.x, y2: pos.y,
            color: this.tool === 'eraser' ? '#222222' : this.currentColor,
            size: this.tool === 'eraser' ? this.brushSize * 4 : this.brushSize,
        };
        this._drawLine(drawData);
        this._sendDraw(drawData);
        this.lastPoint = pos;
    }

    _endDraw() {
        this.isDrawing = false;
        this.lastPoint = null;
    }

    _drawLine(data) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(data.x1, data.y1);
        ctx.lineTo(data.x2, data.y2);
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    _sendDraw(data) {
        if (this.network && this.network.ws && this.network.ws.readyState === 1) {
            this.network.ws.send(JSON.stringify({ type: 'whiteboard', data }));
        }
    }

    /**
     * Handle incoming whiteboard data from server
     */
    receiveDrawData(data) {
        if (data.type === 'clear') {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (data.type === 'line') {
            this._drawLine(data);
        }
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.el.classList.remove('hidden');
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.el.classList.add('hidden');
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }
}
