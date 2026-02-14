/**
 * NPCGuide — Robot tour guide that walks players through the showroom
 * Press G to start/stop guided tour
 */
import * as THREE from 'three';

const TOUR_WAYPOINTS = [
    { pos: [0, 0, 0], label: '🏠 ยินดีต้อนรับสู่ DJI 13Store สาขาราชพฤกษ์!\nยินดีต้อนรับเข้าสู้ Digital Twin ของ Super Store ครับ', duration: 4000 },
    { pos: [-30, 0, -25], label: '🏪 โซนร้านสาขาลาดปลาเค้า\nรวบรวมอุปกรณ์ DJI ครบครันสำหรับมือโปร', duration: 5000 },
    { pos: [30, 0, -25], label: '🏪 DJI Super Store @ Central Ratchaphruek\nสัมผัส Mavic 3 Pro และ Mini 4 Pro ได้ที่นี่ครับ!', duration: 5000 },
    { pos: [-15, 0, -40], label: '🏟️ FPV Racing Arena\nมาลองบิน Avata 2 ในสนามจำลองกันเถอะ!', duration: 4000 },
    { pos: [-55, 0, 25], label: '🏢 Meeting Room\nชั้น 4 ของเรามีนวัตกรรมล้ำสมัยให้ชมมากมายครับ', duration: 5000 },
    { pos: [0, 0, 0], label: '🎉 จบทัวร์ Ratchaphruek แล้ว!\nเชิญเดินชมสินค้าหรือทดสอบบินได้ตามสบายครับ', duration: 3000 },
];

export class NPCGuide {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.currentWaypoint = 0;
        this._group = null;
        this._speechBubble = null;
        this._walkSpeed = 8;
        this._timer = null;
        this._legPhase = 0;

        this._createNPC();
        this._createSpeechBubbleDOM();
    }

    _createNPC() {
        this._group = new THREE.Group();

        // Robot body — silver metallic
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.7, roughness: 0.3 });

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.5), bodyMat);
        torso.position.y = 1.5;
        torso.castShadow = true;
        this._group.add(torso);

        // Head
        const headMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.5, roughness: 0.3 });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), headMat);
        head.position.y = 2.35;
        head.castShadow = true;
        this._group.add(head);

        // Eyes — glowing red (DJI)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xe2001a, emissive: 0xe2001a, emissiveIntensity: 0.8 });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
        eyeL.position.set(-0.12, 2.4, 0.3);
        this._group.add(eyeL);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.12;
        this._group.add(eyeR);

        // Antenna
        const antennaMat = new THREE.MeshStandardMaterial({ color: 0xe2001a, metalness: 0.8 });
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), antennaMat);
        antenna.position.set(0, 2.7, 0);
        this._group.add(antenna);
        const antennaBall = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
        antennaBall.position.set(0, 2.93, 0);
        this._group.add(antennaBall);

        // Arms
        const armMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6 });
        this._leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), armMat);
        this._leftArm.position.set(-0.58, 1.4, 0);
        this._group.add(this._leftArm);
        this._rightArm = this._leftArm.clone();
        this._rightArm.position.x = 0.58;
        this._group.add(this._rightArm);

        // Legs
        this._leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), armMat);
        this._leftLeg.position.set(-0.2, 0.5, 0);
        this._group.add(this._leftLeg);
        this._rightLeg = this._leftLeg.clone();
        this._rightLeg.position.x = 0.2;
        this._group.add(this._rightLeg);

        // Name tag
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.roundRect ? ctx.roundRect(0, 0, 256, 64, 12) : ctx.rect(0, 0, 256, 64);
        ctx.fill();
        ctx.fillStyle = '#e2001a';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🤖 ไกด์ DJI', 128, 42);
        const tex = new THREE.CanvasTexture(canvas);
        const tagMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const tag = new THREE.Sprite(tagMat);
        tag.position.y = 3.2;
        tag.scale.set(2, 0.5, 1);
        this._group.add(tag);

        this._group.visible = false;
        this.scene.add(this._group);
    }

    _createSpeechBubbleDOM() {
        const bubble = document.createElement('div');
        bubble.id = 'npc-speech-bubble';
        bubble.innerHTML = `<span id="npc-speech-text"></span>`;
        const style = document.createElement('style');
        style.textContent = `
            #npc-speech-bubble {
                display: none;
                position: fixed; bottom: 120px; left: 50%;
                transform: translateX(-50%);
                max-width: 420px; padding: 16px 24px;
                background: rgba(18,18,18,0.92);
                border: 1px solid rgba(226,0,26,0.4);
                border-radius: 12px;
                color: #fff; font-family: 'Inter', sans-serif;
                font-size: 14px; line-height: 1.5;
                z-index: 550; text-align: center;
                backdrop-filter: blur(8px);
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                white-space: pre-line;
                animation: speech-pop 0.3s ease;
            }
            @keyframes speech-pop {
                from { transform: translateX(-50%) scale(0.8); opacity: 0; }
                to { transform: translateX(-50%) scale(1); opacity: 1; }
            }
            #npc-speech-bubble.show { display: block; }
        `;
        document.head.appendChild(style);
        document.body.appendChild(bubble);
        this._speechBubble = bubble;
    }

    startTour() {
        this.isActive = true;
        this.currentWaypoint = 0;
        this._group.visible = true;
        const wp = TOUR_WAYPOINTS[0];
        this._group.position.set(wp.pos[0], wp.pos[1], wp.pos[2]);
        this._showSpeech(wp.label);
        this._scheduleNext(wp.duration);
    }

    stopTour() {
        this.isActive = false;
        this._group.visible = false;
        this._speechBubble.classList.remove('show');
        if (this._timer) clearTimeout(this._timer);
        this._timer = null;
    }

    toggle() {
        if (this.isActive) this.stopTour();
        else this.startTour();
    }

    _scheduleNext(duration) {
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            this.currentWaypoint++;
            if (this.currentWaypoint >= TOUR_WAYPOINTS.length) {
                this.stopTour();
                return;
            }
            this._targetPos = new THREE.Vector3(...TOUR_WAYPOINTS[this.currentWaypoint].pos);
            this._isWalking = true;
        }, duration);
    }

    _showSpeech(text) {
        const el = document.getElementById('npc-speech-text');
        el.textContent = text;
        this._speechBubble.classList.remove('show');
        void this._speechBubble.offsetWidth; // force reflow
        this._speechBubble.classList.add('show');
    }

    update(dt) {
        if (!this.isActive) return;

        // Walk animation
        this._legPhase += dt * 8;
        if (this._isWalking) {
            this._leftLeg.rotation.x = Math.sin(this._legPhase) * 0.5;
            this._rightLeg.rotation.x = -Math.sin(this._legPhase) * 0.5;
            this._leftArm.rotation.x = -Math.sin(this._legPhase) * 0.3;
            this._rightArm.rotation.x = Math.sin(this._legPhase) * 0.3;
        } else {
            // Idle bob
            this._group.position.y = Math.sin(this._legPhase * 0.5) * 0.05;
            this._leftLeg.rotation.x = 0;
            this._rightLeg.rotation.x = 0;
            this._leftArm.rotation.x = Math.sin(this._legPhase * 0.4) * 0.1;
            this._rightArm.rotation.x = -Math.sin(this._legPhase * 0.4) * 0.1;
        }

        // Move toward target
        if (this._isWalking && this._targetPos) {
            const dir = this._targetPos.clone().sub(this._group.position);
            const dist = dir.length();
            if (dist < 0.5) {
                this._isWalking = false;
                const wp = TOUR_WAYPOINTS[this.currentWaypoint];
                this._showSpeech(wp.label);
                this._scheduleNext(wp.duration);
            } else {
                dir.normalize();
                this._group.position.addScaledVector(dir, this._walkSpeed * dt);
                // Face walk direction
                this._group.rotation.y = Math.atan2(dir.x, dir.z);
            }
        }
    }
}
