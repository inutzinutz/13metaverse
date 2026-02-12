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
                    <div class="pp-specs"></div>
                    <div class="pp-price"></div>
                    <a class="pp-buy" href="#" target="_blank">
                        🛒 สั่งซื้อที่ DJI 13Store
                    </a>
                    <div class="pp-hint">กด E เพื่อปิด · เดินออกห่างเพื่อซ่อน</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.el);

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
                background: rgba(20, 20, 20, 0.95);
                backdrop-filter: blur(12px);
                border-radius: 16px;
                overflow: hidden;
                width: 340px;
                border: 1px solid rgba(226, 0, 26, 0.3);
                box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(226, 0, 26, 0.15);
            }
            .pp-accent {
                height: 4px;
                background: linear-gradient(90deg, #e2001a, #ff4444, #e2001a);
            }
            .pp-content {
                padding: 20px 24px;
            }
            .pp-name {
                font-size: 22px;
                font-weight: 800;
                color: #fff;
                margin-bottom: 8px;
            }
            .pp-specs {
                font-size: 13px;
                color: #aaa;
                line-height: 1.6;
                margin-bottom: 12px;
            }
            .pp-price {
                font-size: 28px;
                font-weight: 900;
                color: #e2001a;
                margin-bottom: 16px;
            }
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
            .pp-hint {
                text-align: center;
                font-size: 11px;
                color: #666;
                margin-top: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    show(product) {
        if (this.currentProduct === product.id) return;
        this.currentProduct = product.id;

        this.el.querySelector('.pp-name').textContent = product.name;
        this.el.querySelector('.pp-specs').textContent = product.specs;
        this.el.querySelector('.pp-price').textContent = product.price;
        this.el.querySelector('.pp-buy').href = product.url;

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
