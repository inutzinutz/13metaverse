/**
 * ProductPopup — DJI product info overlay
 * Shows drone specs, price, and buy link when player approaches a display
 */
export class ProductPopup {
    constructor() {
        this._createDOM();
        this.isVisible = false;
        this.currentProduct = null;
    }

    _createDOM() {
        // Container
        this.el = document.createElement('div');
        this.el.id = 'product-popup';
        this.el.innerHTML = `
            <div class="pp-card">
                <div class="pp-accent"></div>
                <div class="pp-content">
                    <div class="pp-name"></div>
                    <div class="pp-stock" id="pp-stock-status"></div>
                    <div class="pp-specs"></div>
                    <div class="pp-price"></div>
                    
                    <div class="pp-section-title">CHOOSE COLOR</div>
                    <div class="pp-colors" id="pp-color-swatches"></div>

                    <button class="pp-cart-btn" id="pp-add-cart">
                        ➕ เพิ่มลงตะกร้า
                    </button>
                    <a class="pp-buy" href="#" target="_blank">
                        🌐 สั่งซื้อที่ DJI 13Store
                    </a>
                    <div class="pp-hint">กด E เพื่อปิด · เดินออกห่างเพื่อซ่อน</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.el);

        this.onAddToCart = null;
        this.onColorChange = null;

        document.getElementById('pp-add-cart').addEventListener('click', () => {
            if (this.onAddToCart && this.productData) {
                this.onAddToCart(this.productData);
            }
        });

        // Style
        const style = document.createElement('style');
        style.textContent = `
            #product-popup {
                position: fixed;
                right: 30px;
                top: 50%;
                transform: translateY(-50%) translateX(20px);
                z-index: 200;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s, transform 0.3s;
            }
            #product-popup.visible {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(-50%) translateX(0);
            }
            .pp-card {
                background: rgba(20, 20, 20, 0.98);
                backdrop-filter: blur(16px);
                border-radius: 16px;
                overflow: hidden;
                width: 320px;
                border: 1px solid rgba(226, 0, 26, 0.3);
                box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(226, 0, 26, 0.15);
            }
            .pp-accent {
                height: 4px;
                background: linear-gradient(90deg, #e2001a, #ff4444, #e2001a);
            }
            .pp-content {
                padding: 24px;
            }
            .pp-name {
                font-size: 24px;
                font-weight: 800;
                color: #fff;
                margin-bottom: 4px;
            }
            .pp-stock {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 12px;
                letter-spacing: 0.5px;
            }
            .pp-stock.in-stock { color: #66bb6a; }
            .pp-stock.low-stock { color: #ffa726; }
            .pp-stock.out-of-stock { color: #ef5350; }

            .pp-specs {
                font-size: 13px;
                color: #aaa;
                line-height: 1.6;
                margin-bottom: 16px;
                border-left: 2px solid #333;
                padding-left: 12px;
            }
            .pp-price {
                font-size: 30px;
                font-weight: 950;
                color: #fff;
                margin-bottom: 20px;
            }
            .pp-section-title {
                font-size: 10px;
                font-weight: 800;
                color: #666;
                margin-bottom: 8px;
                letter-spacing: 1px;
            }
            .pp-colors {
                display: flex;
                gap: 8px;
                margin-bottom: 24px;
            }
            .pp-color-btn {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid transparent;
                cursor: pointer;
                transition: transform 0.2s, border-color 0.2s;
            }
            .pp-color-btn:hover { transform: scale(1.15); }
            .pp-color-btn.active { border-color: #fff; transform: scale(1.15); }

            .pp-buy {
                display: block;
                text-align: center;
                padding: 12px;
                background: #e2001a;
                color: #fff;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 700;
                font-size: 15px;
                transition: background 0.2s;
            }
            .pp-buy:hover { background: #ff1a33; }
            .pp-cart-btn {
                display: block;
                width: 100%;
                text-align: center;
                padding: 12px;
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #fff;
                border-radius: 10px;
                font-weight: 700;
                font-size: 15px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: background 0.2s, border-color 0.2s;
            }
            .pp-cart-btn:hover {
                background: rgba(255, 255, 255, 0.12);
                border-color: rgba(255, 255, 255, 0.3);
            }
            .pp-hint {
                text-align: center;
                font-size: 11px;
                color: #444;
                margin-top: 15px;
            }
        `;
        document.head.appendChild(style);
    }

    show(product) {
        if (this.currentProduct === product.id) return;
        this.currentProduct = product.id;
        this.productData = product;

        this.el.querySelector('.pp-name').textContent = product.name;
        this.el.querySelector('.pp-specs').textContent = product.specs;
        this.el.querySelector('.pp-price').textContent = typeof product.price === 'number' ? `฿${product.price.toLocaleString()}` : product.price;
        this.el.querySelector('.pp-buy').href = product.url;

        // Simulated Live Stock Status
        const stockEl = this.el.querySelector('#pp-stock-status');
        const stockLevels = [
            { label: '● In Stock (Available)', class: 'in-stock' },
            { label: '● Low Stock (Only 2 left!)', class: 'low-stock' },
            { label: '● Out of Stock (Next batch: 3 days)', class: 'out-of-stock' }
        ];
        // Use pseudo-random based on ID for consistency
        const idx = (product.id.length % 5 === 0) ? 1 : (product.id.length % 7 === 0 ? 2 : 0);
        stockEl.textContent = stockLevels[idx].label;
        stockEl.className = 'pp-stock ' + stockLevels[idx].class;

        // Color Swatches
        const colorContainer = this.el.querySelector('#pp-color-swatches');
        colorContainer.innerHTML = '';
        const colors = product.availableColors || [0x8a8a8a, 0x1a1a1a, 0xe2001a, 0xffffff];
        colors.forEach(hex => {
            const btn = document.createElement('div');
            btn.className = 'pp-color-btn';
            btn.style.background = '#' + hex.toString(16).padStart(6, '0');
            if (hex === (product.bodyColor || colors[0])) btn.classList.add('active');

            btn.onclick = () => {
                colorContainer.querySelectorAll('.pp-color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.onColorChange) this.onColorChange(hex);
            };
            colorContainer.appendChild(btn);
        });

        this.el.classList.add('visible');
        this.isVisible = true;
    }

    hide() {
        if (!this.isVisible) return;
        this.el.classList.remove('visible');
        this.isVisible = false;
        this.currentProduct = null;
    }
}
