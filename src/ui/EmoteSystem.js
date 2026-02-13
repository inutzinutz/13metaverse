/**
 * EmoteSystem — Character emotes/gestures
 * Keys 1-9 trigger different emotes, visible to other players via network
 */
export class EmoteSystem {
    constructor(networkManager) {
        this.network = networkManager;
        this.activeEmote = null;
        this.emoteTimer = 0;
        this._createUI();
        this._bindKeys();
    }

    static EMOTES = {
        1: { name: '👋 สวัสดี', id: 'wave', duration: 2.5 },
        2: { name: '💃 เต้น', id: 'dance', duration: 4 },
        3: { name: '🪑 นั่ง', id: 'sit', duration: 0 }, // persistent until cancelled
        4: { name: '👏 ปรบมือ', id: 'clap', duration: 2 },
        5: { name: '🤝 ไหว้', id: 'wai', duration: 2 },
        6: { name: '🎉 ดีใจ', id: 'celebrate', duration: 3 },
        7: { name: '🤔 คิด', id: 'think', duration: 2.5 },
        8: { name: '👍 OK', id: 'thumbsup', duration: 2 },
        9: { name: '😴 หลับ', id: 'sleep', duration: 0 },
    };

    _createUI() {
        this.el = document.createElement('div');
        this.el.id = 'emote-bar';
        this.el.innerHTML = `
            <div class="emote-hints">
                ${Object.entries(EmoteSystem.EMOTES).map(([k, v]) =>
            `<span class="emote-key" data-key="${k}"><kbd>${k}</kbd>${v.name}</span>`
        ).join('')}
            </div>
        `;
        document.body.appendChild(this.el);

        this.bubble = document.createElement('div');
        this.bubble.id = 'emote-bubble';
        this.bubble.className = 'hidden';
        document.body.appendChild(this.bubble);

        const style = document.createElement('style');
        style.textContent = `
            #emote-bar {
                position: fixed; bottom: 80px; left: 50%;
                transform: translateX(-50%); z-index: 200;
                opacity: 0; transition: opacity 0.3s;
                pointer-events: none;
            }
            #emote-bar.visible { opacity: 1; pointer-events: auto; }
            .emote-hints {
                display: flex; gap: 6px; padding: 10px 16px;
                background: rgba(0,0,0,0.8); border-radius: 12px;
                border: 1px solid rgba(226,0,26,0.3);
            }
            .emote-key {
                font-size: 12px; color: #ccc;
                display: flex; align-items: center; gap: 4px;
                cursor: pointer; padding: 4px 6px; border-radius: 6px;
                transition: background 0.2s;
            }
            .emote-key:hover { background: rgba(226,0,26,0.2); }
            .emote-key kbd {
                display: inline-block; padding: 2px 6px;
                background: #333; border-radius: 4px;
                font-family: monospace; font-size: 11px; color: #e2001a;
                border: 1px solid #555;
            }
            #emote-bubble {
                position: fixed; top: 40%; left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px; z-index: 300;
                animation: emoteFloat 0.5s ease;
                pointer-events: none;
            }
            #emote-bubble.hidden { display: none; }
            @keyframes emoteFloat {
                from { transform: translate(-50%, -30%) scale(0.5); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    _bindKeys() {
        window.addEventListener('keydown', (e) => {
            const key = parseInt(e.key);
            if (key >= 1 && key <= 9 && EmoteSystem.EMOTES[key]) {
                this.trigger(key);
            }
            // Toggle emote bar on Tab
            if (e.key === 'Tab') {
                e.preventDefault();
                this.el.classList.toggle('visible');
            }
        });

        // Click emote keys
        this.el.querySelectorAll('.emote-key').forEach(el => {
            el.addEventListener('click', () => this.trigger(parseInt(el.dataset.key)));
        });
    }

    trigger(key) {
        const emote = EmoteSystem.EMOTES[key];
        if (!emote) return;

        this.activeEmote = emote;
        this.emoteTimer = emote.duration || 999;

        // Show bubble
        const emoji = emote.name.split(' ')[0];
        this.bubble.textContent = emoji;
        this.bubble.classList.remove('hidden');

        if (emote.duration > 0) {
            setTimeout(() => {
                this.bubble.classList.add('hidden');
                if (this.activeEmote === emote) {
                    this.activeEmote = null;
                }
            }, emote.duration * 1000);
        }

        // Broadcast to network
        if (this.network && this.network.ws && this.network.ws.readyState === 1) {
            this.network.ws.send(JSON.stringify({
                type: 'emote', emoteId: emote.id,
            }));
        }
    }

    cancelEmote() {
        this.activeEmote = null;
        this.emoteTimer = 0;
        this.bubble.classList.add('hidden');
    }

    /**
     * Apply emote animation to avatar
     */
    applyToAvatar(avatar, dt) {
        if (!this.activeEmote || !avatar) return;
        const t = performance.now() * 0.003;

        switch (this.activeEmote.id) {
            case 'wave':
                if (avatar.rightArm) {
                    avatar.rightArm.rotation.z = -Math.PI * 0.7 + Math.sin(t * 6) * 0.3;
                    avatar.rightArm.rotation.x = Math.sin(t * 4) * 0.15;
                }
                break;
            case 'dance':
                if (avatar.group) {
                    avatar.group.rotation.y += dt * 3;
                }
                if (avatar.leftArm) avatar.leftArm.rotation.z = Math.sin(t * 5) * 0.5;
                if (avatar.rightArm) avatar.rightArm.rotation.z = -Math.sin(t * 5) * 0.5;
                if (avatar.leftLeg) avatar.leftLeg.rotation.x = Math.sin(t * 5) * 0.3;
                if (avatar.rightLeg) avatar.rightLeg.rotation.x = -Math.sin(t * 5) * 0.3;
                break;
            case 'sit':
                if (avatar.leftLeg) avatar.leftLeg.rotation.x = -Math.PI / 2;
                if (avatar.rightLeg) avatar.rightLeg.rotation.x = -Math.PI / 2;
                break;
            case 'clap':
                if (avatar.leftArm) {
                    avatar.leftArm.rotation.z = 0.4 + Math.abs(Math.sin(t * 8)) * 0.3;
                    avatar.leftArm.rotation.x = -0.8;
                }
                if (avatar.rightArm) {
                    avatar.rightArm.rotation.z = -0.4 - Math.abs(Math.sin(t * 8)) * 0.3;
                    avatar.rightArm.rotation.x = -0.8;
                }
                break;
            case 'wai': // Thai greeting
                if (avatar.leftArm) {
                    avatar.leftArm.rotation.z = 0.3;
                    avatar.leftArm.rotation.x = -1.2;
                }
                if (avatar.rightArm) {
                    avatar.rightArm.rotation.z = -0.3;
                    avatar.rightArm.rotation.x = -1.2;
                }
                break;
            case 'celebrate':
                if (avatar.leftArm) avatar.leftArm.rotation.z = Math.PI * 0.7 + Math.sin(t * 6) * 0.2;
                if (avatar.rightArm) avatar.rightArm.rotation.z = -Math.PI * 0.7 - Math.sin(t * 6) * 0.2;
                break;
            case 'thumbsup':
                if (avatar.rightArm) {
                    avatar.rightArm.rotation.z = -Math.PI * 0.4;
                    avatar.rightArm.rotation.x = -0.3;
                }
                break;
            case 'sleep':
                if (avatar.head) {
                    avatar.head.rotation.x = 0.4;
                }
                break;
        }
    }
}
