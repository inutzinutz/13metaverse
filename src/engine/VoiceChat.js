/**
 * VoiceChat — WebRTC proximity voice chat
 * Press V for push-to-talk
 * Volume scales with distance (closer = louder)
 */
export class VoiceChat {
    constructor(network) {
        this.network = network;
        this.enabled = false;
        this.isTalking = false;
        this.localStream = null;
        this.peers = new Map(); // peerId -> { pc, audio, gainNode }
        this._audioCtx = null;
        this._maxDistance = 25; // beyond this, volume = 0

        this._createUI();
        this._bindKeys();
        this._setupNetworkHandlers();
    }

    _createUI() {
        const style = document.createElement('style');
        style.textContent = `
            #voice-indicator {
                position: fixed; top: 50%; left: 16px;
                transform: translateY(-50%);
                display: none; flex-direction: column; gap: 6px;
                z-index: 500;
            }
            #voice-indicator.active { display: flex; }
            .voice-status {
                padding: 8px 12px;
                background: rgba(18,18,18,0.85);
                border: 1px solid rgba(226,0,26,0.3);
                border-radius: 8px;
                color: #fff; font-family: 'Inter', sans-serif;
                font-size: 11px;
                backdrop-filter: blur(6px);
            }
            .voice-status.talking {
                border-color: #4caf50;
                box-shadow: 0 0 12px rgba(76,175,80,0.3);
            }
            #voice-toggle {
                position: fixed; top: 50%; left: 16px;
                transform: translateY(calc(-50% + 40px));
                width: 36px; height: 36px;
                border-radius: 50%;
                background: rgba(18,18,18,0.8);
                border: 1px solid rgba(255,255,255,0.15);
                color: #aaa; font-size: 16px;
                cursor: pointer; z-index: 500;
                display: flex; align-items: center; justify-content: center;
            }
            #voice-toggle.on { border-color: #4caf50; color: #4caf50; }
            
            .voice-talk-indicator {
                position: fixed; bottom: 160px; left: 50%;
                transform: translateX(-50%);
                padding: 8px 20px;
                background: rgba(76,175,80,0.9);
                border-radius: 20px;
                color: #fff; font-size: 12px;
                font-family: 'Inter', sans-serif;
                display: none; z-index: 550;
                animation: talkPulse 0.8s infinite alternate;
            }
            @keyframes talkPulse {
                from { box-shadow: 0 0 8px rgba(76,175,80,0.4); }
                to { box-shadow: 0 0 20px rgba(76,175,80,0.8); }
            }
            .voice-talk-indicator.show { display: block; }
        `;
        document.head.appendChild(style);

        // Toggle button
        const toggle = document.createElement('button');
        toggle.id = 'voice-toggle';
        toggle.innerHTML = '🎙';
        toggle.addEventListener('click', () => this.toggleVoice());
        document.body.appendChild(toggle);

        // Talk indicator
        const talkInd = document.createElement('div');
        talkInd.className = 'voice-talk-indicator';
        talkInd.id = 'voice-talk-ind';
        talkInd.textContent = '🎙 กำลังพูด... (ปล่อย V เพื่อหยุด)';
        document.body.appendChild(talkInd);

        // Peer voice indicators
        const voiceInd = document.createElement('div');
        voiceInd.id = 'voice-indicator';
        document.body.appendChild(voiceInd);
    }

    _bindKeys() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'v' || e.key === 'V') {
                if (!e.repeat && this.enabled) {
                    this._startTalking();
                }
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.key === 'v' || e.key === 'V') {
                this._stopTalking();
            }
        });
    }

    async toggleVoice() {
        if (this.enabled) {
            this._disableVoice();
            return;
        }

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = true;

            // Mute by default (push-to-talk)
            this.localStream.getAudioTracks().forEach(t => { t.enabled = false; });

            document.getElementById('voice-toggle').classList.add('on');

            // Announce to other players
            this.network?.send({ type: 'voice_ready' });
        } catch (err) {
            console.warn('[VoiceChat] Microphone access denied:', err);
        }
    }

    _disableVoice() {
        this.enabled = false;
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        this.peers.forEach(peer => {
            if (peer.pc) peer.pc.close();
            if (peer.audio) peer.audio.pause();
        });
        this.peers.clear();
        document.getElementById('voice-toggle').classList.remove('on');
    }

    _startTalking() {
        if (!this.enabled || !this.localStream) return;
        this.isTalking = true;
        this.localStream.getAudioTracks().forEach(t => { t.enabled = true; });
        document.getElementById('voice-talk-ind').classList.add('show');

        if (this.isTalking) {
            this.network?.send({ type: 'voice_talking', talking: true });
        }
    }

    _stopTalking() {
        if (!this.enabled || !this.localStream) return;
        this.isTalking = false;
        this.localStream.getAudioTracks().forEach(t => { t.enabled = false; });
        document.getElementById('voice-talk-ind').classList.remove('show');

        if (this.network) {
            this.network.send({ type: 'voice_talking', talking: false });
        }
    }

    _setupNetworkHandlers() {
        // These will be called from main.js when receiving voice-related messages
    }

    /**
     * Update peer volumes based on distance
     * @param {THREE.Vector3} localPos - local player position
     * @param {Map} remotePlayers - map of id -> Avatar
     */
    updateProximity(localPos, remotePlayers) {
        if (!this.enabled) return;

        const voiceInd = document.getElementById('voice-indicator');
        let html = '';

        remotePlayers.forEach((avatar, id) => {
            const dist = localPos.distanceTo(avatar.group.position);
            const volume = Math.max(0, 1 - dist / this._maxDistance);

            const peer = this.peers.get(id);
            if (peer?.audio) {
                peer.audio.volume = volume;
            }

            if (peer?.talking) {
                const bars = volume > 0.6 ? '🔊' : volume > 0.3 ? '🔉' : volume > 0 ? '🔈' : '🔇';
                html += `<div class="voice-status ${peer.talking ? 'talking' : ''}">${bars} ${avatar.name || id}</div>`;
            }
        });

        if (html) {
            voiceInd.innerHTML = html;
            voiceInd.classList.add('active');
        } else {
            voiceInd.classList.remove('active');
        }
    }

    handlePeerTalking(peerId, talking) {
        let peer = this.peers.get(peerId);
        if (!peer) {
            peer = { pc: null, audio: null, gainNode: null, talking: false };
            this.peers.set(peerId, peer);
        }
        peer.talking = talking;
    }
}
