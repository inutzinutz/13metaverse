/**
 * NPCSettingsPanel — UI for managing NPC Gossip & Privacy
 */
export class NPCSettingsPanel {
    constructor(memorySystem) {
        this.memory = memorySystem;
        this.isVisible = false;
        this.container = null;
        this._init();
    }

    _init() {
        this.container = document.createElement('div');
        this.container.id = 'npc-settings-panel';
        this.container.className = 'npc-settings-modal hidden';

        document.body.appendChild(this.container);
        this._updateContent();

        const style = document.createElement('style');
        style.textContent = `
            .npc-settings-modal {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                background: rgba(18, 18, 18, 0.95);
                border: 1px solid rgba(226, 0, 26, 0.4);
                border-radius: 16px;
                padding: 24px;
                color: white;
                font-family: 'Inter', sans-serif;
                z-index: 1000;
                backdrop-filter: blur(12px);
                box-shadow: 0 20px 50px rgba(0,0,0,0.8);
            }
            .npc-settings-modal.hidden { display: none; }
            .npc-settings-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 20px;
            }
            .npc-settings-header h2 { margin: 0; font-size: 20px; color: #e2001a; }
            .close-btn { cursor: pointer; opacity: 0.7; font-size: 20px; }
            .close-btn:hover { opacity: 1; }
            
            .setting-item {
                margin-bottom: 16px;
                padding: 12px;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
            }
            .setting-label { font-weight: bold; margin-bottom: 4px; display: block; }
            .setting-desc { font-size: 12px; color: #aaa; margin-bottom: 8px; }
            
            .mode-toggle {
                display: flex; gap: 8px;
            }
            .mode-btn {
                flex: 1; padding: 10px; border: 1px solid #444;
                background: transparent; color: white; border-radius: 4px;
                cursor: pointer; font-size: 14px;
            }
            .mode-btn.active {
                background: #e2001a; border-color: #e2001a;
            }
            
            .danger-btn {
                width: 100%; padding: 12px; background: rgba(226,0,26,0.1);
                border: 1px solid transparent; color: #ff4444;
                border-radius: 8px; cursor: pointer; margin-top: 10px;
                transition: all 0.2s;
            }
            .danger-btn:hover { background: rgba(226,0,26,0.2); border-color: #e2001a; }
        `;
        document.head.appendChild(style);
    }

    _updateContent() {
        const mode = this.memory.config.mode;
        this.container.innerHTML = `
            <div class="npc-settings-header">
                <h2>🏙️ กติกาเมือง (City Rules)</h2>
                <div class="close-btn" id="npc-settings-close">✕</div>
            </div>
            
            <div class="setting-item">
                <span class="setting-label">ชื่อเสียงในสาขา (Reputation)</span>
                <p class="setting-desc">ระดับปัจจุบัน: <strong style="color: #e2001a;">${this.memory.getLevelLabel()}</strong></p>
                <div style="background: #333; height: 8px; border-radius: 4px; margin-top: 8px; overflow: hidden;">
                    <div style="background: #e2001a; height: 100%; width: ${this.memory.reputation.score % 100}%"></div>
                </div>
                <p style="font-size: 10px; color: #888; margin-top: 4px;">Score: ${this.memory.reputation.score} / EXP ถึงระดับถัดไป: ${100 - (this.memory.reputation.score % 100)}</p>
            </div>

            <div class="setting-item">
                <span class="setting-label">โหมดการปฏิสัมพันธ์</span>
                <p class="setting-desc">เลือกความฉลาดของ NPC ในการจำข้อมูลในเกมของคุณ</p>
                <div class="mode-toggle">
                    <button class="mode-btn ${mode === 'normal' ? 'active' : ''}" data-mode="normal">ปกติ</button>
                    <button class="mode-btn ${mode === 'realistic' ? 'active' : ''}" data-mode="realistic">สมจริง (Sims-style)</button>
                </div>
            </div>

            <div class="setting-item">
                <span class="setting-label">ความเป็นส่วนตัว</span>
                <p class="setting-desc">NPC จะจำเฉพาะสิ่งที่เกิดขึ้นในโลกเสมือนนี้เท่านั้น (เช่น สินค้าที่ดู)</p>
                <button class="danger-btn" id="npc-clear-memory">ล้างความจำ NPC ทั้งหมด</button>
            </div>
        `;

        this.container.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = () => {
                const newMode = btn.dataset.mode;
                this.memory.setMode(newMode);
                this._updateContent();
            };
        });

        this.container.querySelector('#npc-settings-close').onclick = () => this.hide();
        this.container.querySelector('#npc-clear-memory').onclick = () => {
            if (confirm('ยืนยันที่จะลบความจำทั้งหมดของ NPC? พวกเขาจะจำคุณไม่ได้เลย')) {
                this.memory.clearMemory();
                alert('ความจำถูกลบแล้ว');
                this._updateContent();
            }
        };
    }

    show() {
        this._updateContent();
        this.container.classList.remove('hidden');
        this.isVisible = true;
    }

    hide() {
        this.container.classList.add('hidden');
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }
}
