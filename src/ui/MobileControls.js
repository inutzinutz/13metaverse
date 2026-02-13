/**
 * MobileControls — Virtual joystick + camera touch for mobile devices
 * Left side: movement joystick
 * Right side: camera pan (touch drag)
 */
export class MobileControls {
    constructor() {
        this.moveX = 0;
        this.moveZ = 0;
        this.cameraRotX = 0;
        this.cameraRotY = 0;
        this.isMobile = this._detectMobile();
        this._joystickActive = false;
        this._cameraTouchId = null;
        this._lastCameraPos = null;
        this._jumpRequested = false;

        if (this.isMobile) {
            this._createUI();
            this._bindTouch();
        }
    }

    _detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
    }

    _createUI() {
        const style = document.createElement('style');
        style.textContent = `
            #mobile-controls { display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 500; pointer-events: none; }
            
            #joystick-zone {
                position: fixed; bottom: 24px; left: 24px;
                width: 140px; height: 140px;
                border-radius: 50%;
                background: rgba(0,0,0,0.3);
                border: 2px solid rgba(226,0,26,0.4);
                pointer-events: auto;
                touch-action: none;
            }
            #joystick-knob {
                position: absolute; top: 50%; left: 50%;
                width: 50px; height: 50px;
                margin: -25px 0 0 -25px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(226,0,26,0.8), rgba(226,0,26,0.4));
                border: 2px solid rgba(255,255,255,0.3);
                transition: none;
            }
            
            #camera-zone {
                position: fixed; bottom: 0; right: 0;
                width: 50vw; height: 100vh;
                pointer-events: auto;
                touch-action: none;
            }
            
            #mobile-jump-btn {
                position: fixed; bottom: 30px; right: 30px;
                width: 60px; height: 60px;
                border-radius: 50%;
                background: rgba(226,0,26,0.5);
                border: 2px solid rgba(255,255,255,0.3);
                color: white; font-size: 20px;
                display: flex; align-items: center; justify-content: center;
                pointer-events: auto;
                touch-action: none;
            }
            
            #mobile-action-bar {
                position: fixed; top: 50%; right: 10px;
                transform: translateY(-50%);
                display: flex; flex-direction: column; gap: 10px;
                z-index: 500; pointer-events: auto;
            }
            .mobile-action-btn {
                width: 44px; height: 44px;
                border-radius: 10px;
                background: rgba(0,0,0,0.5);
                border: 1px solid rgba(226,0,26,0.4);
                color: white; font-size: 18px;
                display: flex; align-items: center; justify-content: center;
                pointer-events: auto;
                touch-action: manipulation;
            }
        `;
        document.head.appendChild(style);

        // Container
        const container = document.createElement('div');
        container.id = 'mobile-controls';
        container.innerHTML = `
            <div id="joystick-zone">
                <div id="joystick-knob"></div>
            </div>
            <div id="camera-zone"></div>
            <div id="mobile-jump-btn">⬆</div>
        `;
        document.body.appendChild(container);

        // Action buttons
        const actions = document.createElement('div');
        actions.id = 'mobile-action-bar';
        actions.innerHTML = `
            <button class="mobile-action-btn" data-action="chat">💬</button>
            <button class="mobile-action-btn" data-action="emote">😀</button>
            <button class="mobile-action-btn" data-action="map">🗺</button>
        `;
        document.body.appendChild(actions);

        this.joystickZone = document.getElementById('joystick-zone');
        this.joystickKnob = document.getElementById('joystick-knob');
        this.cameraZone = document.getElementById('camera-zone');
        this.jumpBtn = document.getElementById('mobile-jump-btn');
    }

    _bindTouch() {
        const jz = this.joystickZone;
        const knob = this.joystickKnob;
        const maxR = 45; // max displacement radius

        let touchId = null;
        let centerX, centerY;

        jz.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            touchId = t.identifier;
            const rect = jz.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
            this._joystickActive = true;
        }, { passive: false });

        jz.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier === touchId) {
                    let dx = t.clientX - centerX;
                    let dy = t.clientY - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > maxR) {
                        dx = dx / dist * maxR;
                        dy = dy / dist * maxR;
                    }
                    knob.style.transform = `translate(${dx}px, ${dy}px)`;
                    this.moveX = dx / maxR;
                    this.moveZ = dy / maxR;
                }
            }
        }, { passive: false });

        const endJoystick = (e) => {
            for (const t of e.changedTouches) {
                if (t.identifier === touchId) {
                    touchId = null;
                    knob.style.transform = 'translate(0, 0)';
                    this.moveX = 0;
                    this.moveZ = 0;
                    this._joystickActive = false;
                }
            }
        };
        jz.addEventListener('touchend', endJoystick);
        jz.addEventListener('touchcancel', endJoystick);

        // Camera pan
        const cz = this.cameraZone;
        cz.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            this._cameraTouchId = t.identifier;
            this._lastCameraPos = { x: t.clientX, y: t.clientY };
        }, { passive: false });

        cz.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const t of e.changedTouches) {
                if (t.identifier === this._cameraTouchId && this._lastCameraPos) {
                    const dx = t.clientX - this._lastCameraPos.x;
                    const dy = t.clientY - this._lastCameraPos.y;
                    this.cameraRotX = -dx * 0.005;
                    this.cameraRotY = -dy * 0.005;
                    this._lastCameraPos = { x: t.clientX, y: t.clientY };
                }
            }
        }, { passive: false });

        const endCamera = () => {
            this._cameraTouchId = null;
            this._lastCameraPos = null;
            this.cameraRotX = 0;
            this.cameraRotY = 0;
        };
        cz.addEventListener('touchend', endCamera);
        cz.addEventListener('touchcancel', endCamera);

        // Jump button
        this.jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this._jumpRequested = true;
        }, { passive: false });
    }

    /**
     * Consume the jump request (call once per frame)
     */
    consumeJump() {
        if (this._jumpRequested) {
            this._jumpRequested = false;
            return true;
        }
        return false;
    }
}
