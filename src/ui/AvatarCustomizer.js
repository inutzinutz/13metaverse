/**
 * AvatarCustomizer — UI for personalizing the player's avatar
 */
export class AvatarCustomizer {
    constructor(avatar, onUpdate) {
        this.avatar = avatar;
        this.onUpdate = onUpdate; // Callback to sync changes to network

        this.isVisible = false;
        this._createUI();
    }

    _createUI() {
        this.container = document.createElement('div');
        this.container.id = 'avatar-customizer';
        this.container.className = 'glass-panel customizer-panel';
        this.container.style.display = 'none';

        this.container.innerHTML = `
            <div class="customizer-header">
                <h3><span style="color:#e2001a">AVATAR</span> CUSTOMIZER</h3>
                <button class="close-btn" id="close-customizer">&times;</button>
            </div>
            <div class="customizer-sections">
                <!-- Hair Section -->
                <div class="customizer-section">
                    <h4>Hair Style</h4>
                    <div class="option-grid" id="hair-style-options">
                        <button class="option-btn active" data-style="short">Short</button>
                        <button class="option-btn" data-style="long">Long</button>
                        <button class="option-btn" data-style="mohawk">Mohawk</button>
                        <button class="option-btn" data-style="bald">Bald</button>
                    </div>
                    <h4>Hair Color</h4>
                    <input type="color" id="hair-color-picker" value="#3e2723">
                </div>

                <!-- Clothing Section -->
                <div class="customizer-section">
                    <h4>Top Style</h4>
                    <div class="option-grid" id="shirt-type-options">
                        <button class="option-btn active" data-type="tshirt">T-Shirt</button>
                        <button class="option-btn" data-type="jacket">Jacket</button>
                    </div>
                    <h4>Colors</h4>
                    <div class="color-row">
                        <div>
                            <label>Shirt</label>
                            <input type="color" id="shirt-color-picker" value="#42a5f5">
                        </div>
                        <div>
                            <label>Pants</label>
                            <input type="color" id="pants-color-picker" value="#1565c0">
                        </div>
                    </div>
                </div>

                <!-- Body Section -->
                <div class="customizer-section">
                    <h4>Skin Tone</h4>
                    <div class="skin-grid" id="skin-tone-options">
                        <div class="skin-swatch" style="background:#deb887" data-color="#deb887"></div>
                        <div class="skin-swatch" style="background:#8d5524" data-color="#8d5524"></div>
                        <div class="skin-swatch" style="background:#c68642" data-color="#c68642"></div>
                        <div class="skin-swatch" style="background:#e0ac69" data-color="#e0ac69"></div>
                        <div class="skin-swatch" style="background:#f1c27d" data-color="#f1c27d"></div>
                        <div class="skin-swatch" style="background:#ffdbac" data-color="#ffdbac"></div>
                    </div>
                </div>
            </div>
            <div class="customizer-footer">
                <button class="primary-btn" id="save-avatar">SAVE & CLOSE</button>
            </div>
        `;

        document.body.appendChild(this.container);
        this._initListeners();
    }

    _initListeners() {
        // Close buttons
        this.container.querySelector('#close-customizer').onclick = () => this.hide();
        this.container.querySelector('#save-avatar').onclick = () => this.hide();

        // Hair style
        this.container.querySelectorAll('#hair-style-options .option-btn').forEach(btn => {
            btn.onclick = () => {
                this.container.querySelectorAll('#hair-style-options .option-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.update('hairStyle', btn.dataset.style);
            };
        });

        // Hair color
        this.container.querySelector('#hair-color-picker').oninput = (e) => {
            this.update('hairColor', e.target.value);
        };

        // Shirt type
        this.container.querySelectorAll('#shirt-type-options .option-btn').forEach(btn => {
            btn.onclick = () => {
                this.container.querySelectorAll('#shirt-type-options .option-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.update('shirtType', btn.dataset.type);
            };
        });

        // Shirt color
        this.container.querySelector('#shirt-color-picker').oninput = (e) => {
            this.update('shirtColor', e.target.value);
        };

        // Pants color
        this.container.querySelector('#pants-color-picker').oninput = (e) => {
            this.update('pantsColor', e.target.value);
        };

        // Skin tone
        this.container.querySelectorAll('.skin-swatch').forEach(swatch => {
            swatch.onclick = () => {
                this.container.querySelectorAll('.skin-swatch').forEach(s => s.style.border = 'none');
                swatch.style.border = '2px solid #e2001a';
                this.update('skinColor', swatch.dataset.color);
            };
        });
    }

    update(key, value) {
        const hexToNum = (hex) => parseInt(hex.replace('#', '0x'), 16);
        const finalValue = typeof value === 'string' && value.startsWith('#') ? hexToNum(value) : value;

        const options = {};
        options[key] = finalValue;

        this.avatar.updateAppearance(options);
        if (this.onUpdate) this.onUpdate(options);
    }

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'flex';
        // Play opening sound if needed
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        // Sync with server/localStorage
        this._saveToLocal();
    }

    _saveToLocal() {
        const config = {
            hairStyle: this.avatar.hairStyle,
            hairColor: this.avatar.hairColor,
            shirtType: this.avatar.shirtType,
            shirtColor: this.avatar.shirtColor,
            pantsColor: this.avatar.pantsColor,
            skinColor: this.avatar.skinColor
        };
        localStorage.setItem('dji_avatar_config', JSON.stringify(config));
    }
}
