/**
 * ShoppingCart — E-commerce cart for DJI showroom
 * Add products from ProductPopup, view cart, checkout via LINE
 */
export class ShoppingCart {
    constructor() {
        this.items = []; // { id, name, price, qty, image }
        this.isOpen = false;
        this._createUI();
    }

    _createUI() {
        const style = document.createElement('style');
        style.textContent = `
            #cart-fab {
                position: fixed; bottom: 80px; right: 20px;
                width: 56px; height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #e2001a, #b71c1c);
                border: none; color: #fff;
                font-size: 24px; cursor: pointer;
                box-shadow: 0 4px 20px rgba(226,0,26,0.4);
                z-index: 550;
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.2s;
            }
            #cart-fab:hover { transform: scale(1.1); }
            #cart-badge {
                position: absolute; top: -4px; right: -4px;
                min-width: 20px; height: 20px;
                border-radius: 10px; padding: 0 5px;
                background: #fff; color: #e2001a;
                font-size: 11px; font-weight: 700;
                display: none; align-items: center; justify-content: center;
            }

            #cart-panel {
                display: none;
                position: fixed; top: 0; right: 0; bottom: 0;
                width: 360px; max-width: 90vw;
                background: rgba(18,18,18,0.96);
                border-left: 1px solid rgba(226,0,26,0.3);
                z-index: 700;
                font-family: 'Inter', sans-serif;
                color: #fff;
                backdrop-filter: blur(12px);
                overflow-y: auto;
                animation: cart-slide 0.3s ease;
            }
            @keyframes cart-slide {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
            #cart-panel.open { display: flex; flex-direction: column; }
            .cart-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }
            .cart-header h3 { margin: 0; font-size: 16px; }
            .cart-header button { background: none; border: none; color: #aaa; cursor: pointer; font-size: 20px; }
            .cart-items { flex: 1; padding: 12px 16px; }
            .cart-empty { text-align: center; padding: 40px 0; color: #666; }
            .cart-item {
                display: flex; align-items: center; gap: 12px;
                padding: 12px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .cart-item-icon {
                width: 48px; height: 48px;
                border-radius: 8px;
                background: rgba(226,0,26,0.15);
                display: flex; align-items: center; justify-content: center;
                font-size: 24px;
            }
            .cart-item-info { flex: 1; }
            .cart-item-info .name { font-size: 13px; font-weight: 600; }
            .cart-item-info .price { font-size: 12px; color: #e2001a; margin-top: 2px; }
            .cart-item-qty {
                display: flex; align-items: center; gap: 6px;
            }
            .cart-item-qty button {
                width: 24px; height: 24px; border-radius: 50%;
                background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
                color: #fff; cursor: pointer; font-size: 14px;
                display: flex; align-items: center; justify-content: center;
            }
            .cart-item-qty span { font-size: 13px; min-width: 20px; text-align: center; }

            .cart-footer {
                padding: 16px 20px;
                border-top: 1px solid rgba(255,255,255,0.08);
            }
            .cart-total {
                display: flex; justify-content: space-between;
                font-size: 16px; font-weight: 700; margin-bottom: 12px;
            }
            .cart-total .amount { color: #e2001a; }
            #cart-checkout {
                width: 100%; padding: 12px;
                background: linear-gradient(135deg, #e2001a, #b71c1c);
                border: none; border-radius: 8px;
                color: #fff; font-size: 14px; font-weight: 600;
                cursor: pointer;
            }
            #cart-checkout:hover { filter: brightness(1.15); }
            #cart-checkout:disabled { opacity: 0.4; cursor: default; }

            .cart-overlay {
                display: none; position: fixed; inset: 0;
                background: rgba(0,0,0,0.5); z-index: 699;
            }
            .cart-overlay.open { display: block; }

            /* Checkout success modal */
            #checkout-modal {
                display: none; position: fixed; inset: 0;
                z-index: 800;
                align-items: center; justify-content: center;
                background: rgba(0,0,0,0.7);
            }
            #checkout-modal.open { display: flex; }
            .checkout-card {
                background: #1a1a1a; border-radius: 16px;
                padding: 32px; max-width: 380px; text-align: center;
                border: 1px solid rgba(226,0,26,0.3);
            }
            .checkout-card h2 { margin: 0 0 8px; font-size: 20px; }
            .checkout-card p { color: #aaa; font-size: 13px; margin: 0 0 20px; }
            .checkout-links { display: flex; gap: 10px; justify-content: center; }
            .checkout-links a {
                padding: 10px 20px; border-radius: 8px;
                text-decoration: none; font-weight: 600; font-size: 13px;
            }
            .btn-line { background: #06c755; color: #fff; }
            .btn-wa { background: #25d366; color: #fff; }
            .checkout-close {
                margin-top: 16px; background: none; border: 1px solid #555;
                color: #aaa; padding: 8px 20px; border-radius: 8px; cursor: pointer;
            }
        `;
        document.head.appendChild(style);

        // FAB button
        const fab = document.createElement('button');
        fab.id = 'cart-fab';
        fab.innerHTML = `🛒<span id="cart-badge">0</span>`;
        fab.addEventListener('click', () => this.togglePanel(true));
        document.body.appendChild(fab);

        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'cart-overlay';
        overlay.id = 'cart-overlay';
        overlay.addEventListener('click', () => this.togglePanel(false));
        document.body.appendChild(overlay);

        // Cart panel
        const panel = document.createElement('div');
        panel.id = 'cart-panel';
        panel.innerHTML = `
            <div class="cart-header">
                <h3>🛒 ตะกร้าสินค้า</h3>
                <button id="cart-close">✕</button>
            </div>
            <div class="cart-items" id="cart-items-list">
                <div class="cart-empty">ตะกร้าว่างเปล่า</div>
            </div>
            <div class="cart-footer">
                <div class="cart-total">
                    <span>รวมทั้งหมด</span>
                    <span class="amount" id="cart-total-amount">฿0</span>
                </div>
                <button id="cart-checkout" disabled>ดำเนินการสั่งซื้อ</button>
            </div>
        `;
        document.body.appendChild(panel);

        // Checkout modal
        const checkout = document.createElement('div');
        checkout.id = 'checkout-modal';
        checkout.innerHTML = `
            <div class="checkout-card">
                <h2>✅ สรุปคำสั่งซื้อ</h2>
                <p id="checkout-summary"></p>
                <div class="checkout-links">
                    <a class="btn-line" id="checkout-line" href="#" target="_blank">💬 LINE</a>
                    <a class="btn-wa" id="checkout-wa" href="#" target="_blank">📱 WhatsApp</a>
                </div>
                <button class="checkout-close" id="checkout-close">ปิด</button>
            </div>
        `;
        document.body.appendChild(checkout);

        document.getElementById('cart-close').addEventListener('click', () => this.togglePanel(false));
        document.getElementById('cart-checkout').addEventListener('click', () => this._checkout());
        document.getElementById('checkout-close').addEventListener('click', () => {
            document.getElementById('checkout-modal').classList.remove('open');
            this.items = [];
            this._renderItems();
        });
    }

    addItem(product) {
        const existing = this.items.find(i => i.id === product.id);
        if (existing) {
            existing.qty++;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                qty: 1,
                icon: product.icon || '📦'
            });
        }
        this._renderItems();
        this._updateBadge();
        this._showAddAnimation();
    }

    removeItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this._renderItems();
        this._updateBadge();
    }

    changeQty(id, delta) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) {
            this.removeItem(id);
            return;
        }
        this._renderItems();
        this._updateBadge();
    }

    togglePanel(open) {
        this.isOpen = open;
        document.getElementById('cart-panel').classList.toggle('open', open);
        document.getElementById('cart-overlay').classList.toggle('open', open);
    }

    _renderItems() {
        const container = document.getElementById('cart-items-list');
        if (this.items.length === 0) {
            container.innerHTML = '<div class="cart-empty">ตะกร้าว่างเปล่า</div>';
            document.getElementById('cart-checkout').disabled = true;
            document.getElementById('cart-total-amount').textContent = '฿0';
            return;
        }
        document.getElementById('cart-checkout').disabled = false;

        let total = 0;
        container.innerHTML = this.items.map(item => {
            total += item.price * item.qty;
            return `
                <div class="cart-item">
                    <div class="cart-item-icon">${item.icon}</div>
                    <div class="cart-item-info">
                        <div class="name">${item.name}</div>
                        <div class="price">฿${item.price.toLocaleString()}</div>
                    </div>
                    <div class="cart-item-qty">
                        <button onclick="window.__cart.changeQty('${item.id}',-1)">−</button>
                        <span>${item.qty}</span>
                        <button onclick="window.__cart.changeQty('${item.id}',1)">+</button>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('cart-total-amount').textContent = `฿${total.toLocaleString()}`;
    }

    _updateBadge() {
        const badge = document.getElementById('cart-badge');
        const count = this.items.reduce((s, i) => s + i.qty, 0);
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    _showAddAnimation() {
        const fab = document.getElementById('cart-fab');
        fab.style.transform = 'scale(1.3)';
        setTimeout(() => { fab.style.transform = 'scale(1)'; }, 200);
    }

    _checkout() {
        const lines = this.items.map(i => `${i.name} x${i.qty} = ฿${(i.price * i.qty).toLocaleString()}`);
        const total = this.items.reduce((s, i) => s + i.price * i.qty, 0);
        const summary = lines.join('\n') + `\n\nรวม: ฿${total.toLocaleString()}`;
        const msgText = `สั่งซื้อจาก DJI 13Store:\n${summary}`;

        document.getElementById('checkout-summary').textContent = summary;
        document.getElementById('checkout-line').href = `https://line.me/R/msg/text/?${encodeURIComponent(msgText)}`;
        document.getElementById('checkout-wa').href = `https://wa.me/?text=${encodeURIComponent(msgText)}`;
        document.getElementById('checkout-modal').classList.add('open');

        this.togglePanel(false);
    }

    getTotalItems() {
        return this.items.reduce((s, i) => s + i.qty, 0);
    }

    getTotalPrice() {
        return this.items.reduce((s, i) => s + i.price * i.qty, 0);
    }
}
