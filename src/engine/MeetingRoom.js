/**
 * MeetingRoom — Virtual meeting room with Jitsi Meet
 * Opens when player enters a meeting building zone
 */
export class MeetingRoom {
    constructor() {
        this._createDOM();
        this.isOpen = false;
        this.currentRoom = null;
    }

    _createDOM() {
        this.el = document.createElement('div');
        this.el.id = 'meeting-room';
        this.el.className = 'meeting-overlay hidden';
        this.el.innerHTML = `
            <div class="meeting-container">
                <div class="meeting-header">
                    <div class="meeting-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e2001a" stroke-width="2">
                            <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4z"/>
                            <rect x="1" y="6" width="14" height="12" rx="2" ry="2"/>
                        </svg>
                        <span id="meeting-room-name">ห้องประชุม</span>
                    </div>
                    <div class="meeting-actions">
                        <button id="meeting-close" class="meeting-btn-close">✕ ออกจากห้อง</button>
                    </div>
                </div>
                <div class="meeting-body">
                    <iframe id="meeting-iframe" allow="camera;microphone;display-capture;autoplay" 
                        allowfullscreen></iframe>
                </div>
            </div>
        `;
        document.body.appendChild(this.el);
        this._injectStyles();

        document.getElementById('meeting-close').addEventListener('click', () => this.close());

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    }

    _injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .meeting-overlay {
                position: fixed; inset: 0; z-index: 500;
                background: rgba(0,0,0,0.85);
                display: flex; align-items: center; justify-content: center;
                animation: meetFadeIn 0.3s ease;
            }
            .meeting-overlay.hidden { display: none; }
            @keyframes meetFadeIn { from { opacity:0; } to { opacity:1; } }
            .meeting-container {
                width: 90vw; height: 85vh;
                background: #1a1a1a;
                border-radius: 16px;
                border: 1px solid rgba(226,0,26,0.3);
                overflow: hidden;
                display: flex; flex-direction: column;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }
            .meeting-header {
                display: flex; justify-content: space-between;
                align-items: center; padding: 12px 20px;
                background: #111; border-bottom: 1px solid #333;
            }
            .meeting-title {
                display: flex; align-items: center; gap: 8px;
                font-weight: 700; font-size: 15px; color: #fff;
            }
            .meeting-btn-close {
                padding: 8px 16px; background: #e2001a;
                border: none; border-radius: 8px;
                color: #fff; font-weight: 600; font-size: 13px;
                cursor: pointer; font-family: inherit;
                transition: background 0.2s;
            }
            .meeting-btn-close:hover { background: #ff1a33; }
            .meeting-body {
                flex: 1; position: relative;
            }
            #meeting-iframe {
                width: 100%; height: 100%;
                border: none;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Open a meeting room with a given name
     */
    open(roomName, displayName = 'Guest') {
        if (this.isOpen) return;
        this.isOpen = true;
        this.currentRoom = roomName;

        const safeName = roomName.replace(/[^a-zA-Z0-9]/g, '-');
        document.getElementById('meeting-room-name').textContent = `ห้องประชุม: ${roomName}`;

        // Use Jitsi Meet (free, no account needed)
        const jitsiUrl = `https://meet.jit.si/dji13store-${safeName}#config.startWithAudioMuted=true&config.prejoinPageEnabled=false&config.disableDeepLinking=true&userInfo.displayName=${encodeURIComponent(displayName)}`;
        document.getElementById('meeting-iframe').src = jitsiUrl;

        this.el.classList.remove('hidden');
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.currentRoom = null;
        document.getElementById('meeting-iframe').src = '';
        this.el.classList.add('hidden');
    }
}
