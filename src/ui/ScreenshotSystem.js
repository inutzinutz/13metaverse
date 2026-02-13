/**
 * ScreenshotSystem — Capture canvas screenshots with DJI branding
 * Press F2 to capture
 */
export class ScreenshotSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.screenshots = [];
        this._createUI();
        this._bindKeys();
    }

    _createUI() {
        const style = document.createElement('style');
        style.textContent = `
            #screenshot-flash {
                position: fixed; inset: 0;
                background: #fff; opacity: 0;
                pointer-events: none; z-index: 900;
                transition: opacity 0.15s;
            }
            #screenshot-flash.flash { opacity: 0.7; }

            #screenshot-preview {
                display: none;
                position: fixed; bottom: 20px; left: 50%;
                transform: translateX(-50%);
                z-index: 600;
                animation: ss-slide-up 0.4s ease;
            }
            @keyframes ss-slide-up {
                from { transform: translateX(-50%) translateY(40px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            #screenshot-preview.show { display: block; }
            .ss-card {
                background: rgba(18,18,18,0.95);
                border: 1px solid rgba(226,0,26,0.4);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            }
            .ss-card img {
                width: 320px; height: auto;
                display: block;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .ss-actions {
                display: flex; gap: 6px; padding: 10px;
                justify-content: center;
            }
            .ss-btn {
                padding: 6px 16px;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.15);
                background: rgba(255,255,255,0.06);
                color: #ddd; font-size: 12px;
                cursor: pointer; font-family: 'Inter', sans-serif;
            }
            .ss-btn.primary {
                background: linear-gradient(135deg, #e2001a, #b71c1c);
                border-color: transparent; color: #fff;
            }
            .ss-btn:hover { filter: brightness(1.2); }

            #screenshot-gallery {
                display: none;
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.85);
                z-index: 800;
                align-items: center; justify-content: center;
                flex-direction: column;
            }
            #screenshot-gallery.open { display: flex; }
            .gallery-grid {
                display: grid; grid-template-columns: repeat(auto-fill, 240px);
                gap: 12px; padding: 20px;
                max-height: 70vh; overflow-y: auto;
            }
            .gallery-grid img {
                width: 240px; border-radius: 8px;
                cursor: pointer; border: 2px solid transparent;
                transition: border 0.2s;
            }
            .gallery-grid img:hover { border-color: #e2001a; }
            .gallery-header {
                display: flex; align-items: center; gap: 20px;
                padding: 16px 20px; color: #fff;
                font-family: 'Inter', sans-serif;
            }
            .gallery-header h3 { margin: 0; }
            .gallery-close {
                background: none; border: 1px solid #555;
                color: #aaa; padding: 6px 14px; border-radius: 6px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);

        // Flash overlay
        const flash = document.createElement('div');
        flash.id = 'screenshot-flash';
        document.body.appendChild(flash);

        // Preview card
        const preview = document.createElement('div');
        preview.id = 'screenshot-preview';
        preview.innerHTML = `
            <div class="ss-card">
                <img id="ss-preview-img" src="" alt="Screenshot" />
                <div class="ss-actions">
                    <button class="ss-btn primary" id="ss-download">💾 บันทึก</button>
                    <button class="ss-btn" id="ss-share">📤 แชร์</button>
                    <button class="ss-btn" id="ss-gallery-btn">🖼 แกลเลอรี</button>
                    <button class="ss-btn" id="ss-close">✕</button>
                </div>
            </div>
        `;
        document.body.appendChild(preview);

        // Gallery
        const gallery = document.createElement('div');
        gallery.id = 'screenshot-gallery';
        gallery.innerHTML = `
            <div class="gallery-header">
                <h3>🖼 แกลเลอรีภาพ</h3>
                <button class="gallery-close" id="gallery-close">ปิด</button>
            </div>
            <div class="gallery-grid" id="gallery-grid"></div>
        `;
        document.body.appendChild(gallery);

        // Events
        document.getElementById('ss-close').addEventListener('click', () => {
            document.getElementById('screenshot-preview').classList.remove('show');
        });
        document.getElementById('ss-download').addEventListener('click', () => this._downloadLast());
        document.getElementById('ss-share').addEventListener('click', () => this._shareLast());
        document.getElementById('ss-gallery-btn').addEventListener('click', () => this._openGallery());
        document.getElementById('gallery-close').addEventListener('click', () => {
            document.getElementById('screenshot-gallery').classList.remove('open');
        });
    }

    _bindKeys() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                this.capture();
            }
        });
    }

    capture() {
        // Force render to get current frame
        const canvas = this.renderer.domElement;

        // Create branded screenshot
        const w = canvas.width;
        const h = canvas.height;
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext('2d');

        // Draw game canvas
        ctx.drawImage(canvas, 0, 0);

        // DJI watermark
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, h - 36, w, 36);
        ctx.fillStyle = '#e2001a';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('DJI 13Store — Virtual Showroom', 12, h - 12);

        // Timestamp
        const now = new Date();
        const ts = now.toLocaleString('th-TH');
        ctx.fillStyle = '#aaa';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(ts, w - 12, h - 12);

        // Convert to data URL
        const dataUrl = offscreen.toDataURL('image/png');
        this.screenshots.push(dataUrl);

        // Flash effect
        const flash = document.getElementById('screenshot-flash');
        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 150);

        // Show preview
        document.getElementById('ss-preview-img').src = dataUrl;
        const preview = document.getElementById('screenshot-preview');
        preview.classList.remove('show');
        void preview.offsetWidth;
        preview.classList.add('show');

        // Auto-hide after 5s
        setTimeout(() => preview.classList.remove('show'), 5000);

        return dataUrl;
    }

    _downloadLast() {
        if (this.screenshots.length === 0) return;
        const dataUrl = this.screenshots[this.screenshots.length - 1];
        const link = document.createElement('a');
        link.download = `dji-13store-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    }

    async _shareLast() {
        if (this.screenshots.length === 0) return;
        const dataUrl = this.screenshots[this.screenshots.length - 1];

        if (navigator.share) {
            try {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], 'dji-13store-screenshot.png', { type: 'image/png' });
                await navigator.share({
                    title: 'DJI 13Store Screenshot',
                    text: 'Check out my DJI 13Store virtual showroom! 🚁',
                    files: [file],
                });
            } catch {
                // User cancelled or unsupported
                this._downloadLast();
            }
        } else {
            this._downloadLast();
        }
    }

    _openGallery() {
        const grid = document.getElementById('gallery-grid');
        if (this.screenshots.length === 0) {
            grid.innerHTML = '<p style="color: #666; text-align: center; grid-column: 1/-1;">ยังไม่มีภาพ — กด F2 เพื่อถ่ายภาพ</p>';
        } else {
            grid.innerHTML = this.screenshots.map((url, i) =>
                `<img src="${url}" alt="Screenshot ${i + 1}" onclick="window.open('${url}','_blank')" />`
            ).join('');
        }
        document.getElementById('screenshot-gallery').classList.add('open');
        document.getElementById('screenshot-preview').classList.remove('show');
    }
}
