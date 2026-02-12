/**
 * LoginScreen — Email/password login + registration
 * Replaces lobby name input for authenticated users
 */
export class LoginScreen {
    constructor() {
        this._createDOM();
        this.onLogin = null; // callback: (userData) => void
        this.mode = 'login'; // 'login' | 'register'
    }

    _createDOM() {
        this.el = document.createElement('div');
        this.el.id = 'login-screen';
        this.el.innerHTML = `
            <div class="login-card">
                <div class="login-header">
                    <svg width="40" height="40" viewBox="0 0 52 52" fill="none">
                        <rect x="2" y="2" width="48" height="48" rx="12" stroke="#e2001a" stroke-width="3"/>
                        <text x="26" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#fff" font-family="Inter">DJI</text>
                        <text x="26" y="44" text-anchor="middle" font-size="8" font-weight="bold" fill="#e2001a" font-family="Inter">13STORE</text>
                    </svg>
                    <h2>เข้าสู่ระบบ</h2>
                </div>

                <div class="login-tabs">
                    <button class="login-tab active" data-mode="login">เข้าสู่ระบบ</button>
                    <button class="login-tab" data-mode="register">สมัครสมาชิก</button>
                </div>

                <form id="login-form" autocomplete="off">
                    <div class="login-field" id="register-name-field" style="display:none">
                        <label>ชื่อที่แสดง</label>
                        <input type="text" id="login-displayname" placeholder="ชื่อของคุณ..." maxlength="20">
                    </div>
                    <div class="login-field">
                        <label>อีเมล</label>
                        <input type="email" id="login-email" placeholder="yourname@company.com" required>
                    </div>
                    <div class="login-field">
                        <label>รหัสผ่าน</label>
                        <input type="password" id="login-password" placeholder="รหัสผ่าน..." minlength="4" required>
                    </div>
                    <p id="login-error" class="login-error"></p>
                    <button type="submit" class="login-submit">เข้าสู่ระบบ</button>
                </form>

                <button id="login-skip" class="login-skip">เข้าชมแบบ Guest</button>
            </div>
        `;

        // Inject before lobby
        const lobbyScreen = document.getElementById('lobby-screen');
        lobbyScreen.parentNode.insertBefore(this.el, lobbyScreen);

        this._injectStyles();
        this._bindEvents();
    }

    _injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #login-screen {
                position: fixed; inset: 0; z-index: 1100;
                display: flex; align-items: center; justify-content: center;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%);
            }
            #login-screen.hidden { display: none; }
            .login-card {
                background: rgba(20,20,20,0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(226,0,26,0.2);
                border-radius: 20px;
                padding: 36px 32px;
                width: 380px;
                max-width: 90vw;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 40px rgba(226,0,26,0.1);
            }
            .login-header {
                display: flex; align-items: center; gap: 12px;
                justify-content: center; margin-bottom: 20px;
            }
            .login-header h2 { font-size: 22px; font-weight: 700; color: #fff; }
            .login-tabs {
                display: flex; margin-bottom: 20px; border-radius: 10px;
                background: rgba(255,255,255,0.05); overflow: hidden;
            }
            .login-tab {
                flex: 1; padding: 10px; border: none; background: none;
                color: #888; font-size: 14px; font-weight: 600;
                cursor: pointer; font-family: inherit;
                transition: all 0.2s;
            }
            .login-tab.active { background: #e2001a; color: #fff; }
            .login-field { margin-bottom: 14px; }
            .login-field label {
                display: block; font-size: 12px; font-weight: 600;
                color: #999; text-transform: uppercase; letter-spacing: 1px;
                margin-bottom: 6px;
            }
            .login-field input {
                width: 100%; padding: 12px 14px;
                background: rgba(255,255,255,0.06);
                border: 1.5px solid rgba(255,255,255,0.1);
                border-radius: 10px; color: #fff;
                font-size: 15px; font-family: inherit; outline: none;
                transition: border-color 0.2s;
            }
            .login-field input:focus { border-color: #e2001a; }
            .login-error {
                color: #ef4444; font-size: 13px; text-align: center;
                margin-bottom: 12px; min-height: 20px;
            }
            .login-submit {
                width: 100%; padding: 14px; border: none;
                background: #e2001a; color: #fff; border-radius: 10px;
                font-size: 16px; font-weight: 700; cursor: pointer;
                font-family: inherit; transition: background 0.2s;
            }
            .login-submit:hover { background: #ff1a33; }
            .login-skip {
                width: 100%; padding: 10px; margin-top: 10px;
                background: none; border: 1px solid rgba(255,255,255,0.15);
                color: #888; border-radius: 10px; cursor: pointer;
                font-size: 13px; font-family: inherit;
                transition: all 0.2s;
            }
            .login-skip:hover { border-color: #e2001a; color: #e2001a; }
        `;
        document.head.appendChild(style);
    }

    _bindEvents() {
        // Tab switching
        this.el.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.mode = tab.dataset.mode;
                this.el.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const nameField = document.getElementById('register-name-field');
                const submitBtn = this.el.querySelector('.login-submit');
                if (this.mode === 'register') {
                    nameField.style.display = '';
                    submitBtn.textContent = 'สมัครสมาชิก';
                } else {
                    nameField.style.display = 'none';
                    submitBtn.textContent = 'เข้าสู่ระบบ';
                }
                this._clearError();
            });
        });

        // Form submit
        this.el.querySelector('#login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this._submit();
        });

        // Skip (guest)
        this.el.querySelector('#login-skip').addEventListener('click', () => {
            this.hide();
            // Show lobby as guest
        });
    }

    async _submit() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const displayName = document.getElementById('login-displayname').value.trim();

        if (!email || !password) {
            this._showError('กรุณากรอกอีเมลและรหัสผ่าน');
            return;
        }

        const endpoint = this.mode === 'register' ? '/api/register' : '/api/login';
        const body = { email, password };
        if (this.mode === 'register' && displayName) body.name = displayName;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) {
                this._showError(data.error || 'เกิดข้อผิดพลาด');
                return;
            }

            // Success — store user data and go to lobby
            this.userData = data;
            this.hide();
            if (this.onLogin) this.onLogin(data);
        } catch (err) {
            this._showError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        }
    }

    _showError(msg) {
        this.el.querySelector('#login-error').textContent = msg;
    }

    _clearError() {
        this.el.querySelector('#login-error').textContent = '';
    }

    hide() {
        this.el.classList.add('hidden');
    }

    show() {
        this.el.classList.remove('hidden');
    }
}
