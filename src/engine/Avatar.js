import * as THREE from 'three';

/**
 * Avatar — Realistic humanoid character
 * Smooth geometry: capsule body, sphere head, cylinder limbs
 */
export class Avatar {
    constructor(options = {}) {
        this.name = options.name || 'Player';
        this.shirtColor = options.shirtColor || 0x42a5f5;
        this.pantsColor = options.pantsColor || 0x1565c0;
        this.skinColor = options.skinColor || 0xdeb887;
        this.shoeColor = options.shoeColor || 0x3e2723;
        this.hairColor = options.hairColor || 0x3e2723;
        this.hairStyle = options.hairStyle || 'short';
        this.shirtType = options.shirtType || 'tshirt';
        this.isLocal = options.isLocal || false;

        this.group = new THREE.Group();
        this.animState = 'idle';
        this.animTime = 0;

        this._targetPos = new THREE.Vector3();
        this._targetRot = 0;

        this._build();
        this._createNameplate();
        this._createChatBubble();
    }

    _createChatBubble() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        this._bubbleCtx = ctx;
        this._bubbleCanvas = canvas;

        const texture = new THREE.CanvasTexture(canvas);
        this._bubbleTexture = texture;

        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        this.chatBubble = new THREE.Sprite(spriteMat);
        this.chatBubble.position.y = 5.0; // Above nameplate
        this.chatBubble.scale.set(4, 1, 1);
        this.chatBubble.visible = false;
        this.group.add(this.chatBubble);

        this._bubbleTimeout = null;
    }

    showChatBubble(text) {
        const ctx = this._bubbleCtx;
        const canvas = this._bubbleCanvas;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw bubble background (rounded rect with arrow)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        const w = canvas.width, h = canvas.height;
        const padding = 10;

        // Bubble body
        ctx.beginPath();
        const rectW = w - 40;
        const rectH = h - 40;
        const startX = 20;
        const startY = 10;
        ctx.roundRect ? ctx.roundRect(startX, startY, rectW, rectH, 15) : ctx.rect(startX, startY, rectW, rectH);
        ctx.fill();

        // Arrow pointing down
        ctx.beginPath();
        ctx.moveTo(w / 2 - 15, startY + rectH);
        ctx.lineTo(w / 2 + 15, startY + rectH);
        ctx.lineTo(w / 2, startY + rectH + 15);
        ctx.closePath();
        ctx.fill();

        // Text
        ctx.font = 'bold 28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a1a1a';

        // Handle long text (simple truncation for now)
        let displayMsg = text;
        if (displayMsg.length > 35) displayMsg = displayMsg.substring(0, 32) + '...';
        ctx.fillText(displayMsg, w / 2, startY + rectH / 2);

        this._bubbleTexture.needsUpdate = true;
        this.chatBubble.visible = true;

        if (this._bubbleTimeout) clearTimeout(this._bubbleTimeout);
        this._bubbleTimeout = setTimeout(() => {
            this.chatBubble.visible = false;
        }, 5000);
    }

    _build() {
        const skinMat = new THREE.MeshStandardMaterial({
            color: this.skinColor, roughness: 0.7, metalness: 0.05,
        });
        const shirtMat = new THREE.MeshStandardMaterial({
            color: this.shirtColor, roughness: 0.65, metalness: 0.05,
        });
        const pantsMat = new THREE.MeshStandardMaterial({
            color: this.pantsColor, roughness: 0.7, metalness: 0.05,
        });
        const shoeMat = new THREE.MeshStandardMaterial({
            color: this.shoeColor, roughness: 0.5, metalness: 0.1,
        });
        const hairMat = new THREE.MeshStandardMaterial({
            color: this.hairColor, roughness: 0.8, metalness: 0.1,
        });

        /* === HEAD === */
        const headGeo = new THREE.SphereGeometry(0.45, 16, 12);
        this.head = new THREE.Mesh(headGeo, skinMat);
        this.head.position.y = 3.15;
        this.head.castShadow = true;
        this.group.add(this.head);

        // Hair Styles
        this._buildHair(hairMat);

        // Eyes
        const eyeWhiteGeo = new THREE.SphereGeometry(0.08, 8, 6);
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
        const eyePupilGeo = new THREE.SphereGeometry(0.04, 8, 6);
        const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.2 });

        for (const side of [-1, 1]) {
            const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
            eyeWhite.position.set(side * 0.15, 3.2, 0.38);
            this.group.add(eyeWhite);
            const eyePupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
            eyePupil.position.set(side * 0.15, 3.2, 0.42);
            this.group.add(eyePupil);
        }

        /* === NECK === */
        const neckGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.25, 8);
        const neck = new THREE.Mesh(neckGeo, skinMat);
        neck.position.y = 2.82;
        this.group.add(neck);

        /* === TORSO === */
        this._buildTorso(shirtMat);

        // Lower torso / belt
        const beltGeo = new THREE.CylinderGeometry(0.38, 0.36, 0.15, 12);
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.5, metalness: 0.2 });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.y = 1.55;
        this.group.add(belt);

        /* === ARMS === */
        // Upper arm
        const upperArmGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.6, 8);
        // Lower arm (skin showing)
        const lowerArmGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.55, 8);
        // Hand
        const handGeo = new THREE.SphereGeometry(0.1, 8, 6);

        this.leftArm = new THREE.Group();
        const lUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
        lUpperArm.position.y = -0.3;
        lUpperArm.castShadow = true;
        this.leftArm.add(lUpperArm);
        const lLowerArm = new THREE.Mesh(lowerArmGeo, skinMat);
        lLowerArm.position.y = -0.85;
        this.leftArm.add(lLowerArm);
        const lHand = new THREE.Mesh(handGeo, skinMat);
        lHand.position.y = -1.15;
        this.leftArm.add(lHand);
        this.leftArm.position.set(-0.58, 2.65, 0);
        this.group.add(this.leftArm);

        this.rightArm = new THREE.Group();
        const rUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
        rUpperArm.position.y = -0.3;
        rUpperArm.castShadow = true;
        this.rightArm.add(rUpperArm);
        const rLowerArm = new THREE.Mesh(lowerArmGeo, skinMat);
        rLowerArm.position.y = -0.85;
        this.rightArm.add(rLowerArm);
        const rHand = new THREE.Mesh(handGeo, skinMat);
        rHand.position.y = -1.15;
        this.rightArm.add(rHand);
        this.rightArm.position.set(0.58, 2.65, 0);
        this.group.add(this.rightArm);

        /* === LEGS === */
        const upperLegGeo = new THREE.CylinderGeometry(0.16, 0.13, 0.6, 8);
        const lowerLegGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.55, 8);
        const shoeGeo = new THREE.BoxGeometry(0.22, 0.15, 0.3);

        this.leftLeg = new THREE.Group();
        const lUpperLeg = new THREE.Mesh(upperLegGeo, pantsMat);
        lUpperLeg.position.y = -0.3;
        lUpperLeg.castShadow = true;
        this.leftLeg.add(lUpperLeg);
        const lLowerLeg = new THREE.Mesh(lowerLegGeo, pantsMat);
        lLowerLeg.position.y = -0.85;
        this.leftLeg.add(lLowerLeg);
        const lShoe = new THREE.Mesh(shoeGeo, shoeMat);
        lShoe.position.set(0, -1.15, 0.05);
        this.leftLeg.add(lShoe);
        this.leftLeg.position.set(-0.2, 1.45, 0);
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        const rUpperLeg = new THREE.Mesh(upperLegGeo, pantsMat);
        rUpperLeg.position.y = -0.3;
        rUpperLeg.castShadow = true;
        this.rightLeg.add(rUpperLeg);
        const rLowerLeg = new THREE.Mesh(lowerLegGeo, pantsMat);
        rLowerLeg.position.y = -0.85;
        this.rightLeg.add(rLowerLeg);
        const rShoe = new THREE.Mesh(shoeGeo, shoeMat);
        rShoe.position.set(0, -1.15, 0.05);
        this.rightLeg.add(rShoe);
        this.rightLeg.position.set(0.2, 1.45, 0);
        this.group.add(this.rightLeg);
    }

    _buildHair(mat) {
        if (this.hairStyle === 'bald') return;

        if (this.hairStyle === 'short') {
            const hairGeo = new THREE.SphereGeometry(0.47, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
            const hair = new THREE.Mesh(hairGeo, mat);
            hair.position.y = 3.18;
            this.group.add(hair);
        } else if (this.hairStyle === 'long') {
            const capGeo = new THREE.SphereGeometry(0.47, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
            const cap = new THREE.Mesh(capGeo, mat);
            cap.position.y = 3.18;
            this.group.add(cap);

            const backGeo = new THREE.CylinderGeometry(0.45, 0.4, 0.8, 12, 1, true, 0, Math.PI);
            const back = new THREE.Mesh(backGeo, mat);
            back.position.set(0, 2.7, -0.05);
            back.rotation.y = Math.PI / 2;
            this.group.add(back);
        } else if (this.hairStyle === 'mohawk') {
            const geo = new THREE.BoxGeometry(0.12, 0.3, 0.8);
            const hair = new THREE.Mesh(geo, mat);
            hair.position.set(0, 3.65, 0);
            this.group.add(hair);

            const baseGeo = new THREE.SphereGeometry(0.47, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.3);
            const base = new THREE.Mesh(baseGeo, mat);
            base.position.y = 3.18;
            this.group.add(base);
        }
    }

    _buildTorso(mat) {
        if (this.shirtType === 'tshirt') {
            const torsoGeo = new THREE.CylinderGeometry(0.45, 0.4, 1.1, 12);
            this.torso = new THREE.Mesh(torsoGeo, mat);
        } else if (this.shirtType === 'jacket') {
            this.torso = new THREE.Group();
            const bodyGeo = new THREE.CylinderGeometry(0.48, 0.42, 1.1, 12);
            const body = new THREE.Mesh(bodyGeo, mat);
            this.torso.add(body);

            // Open front zipper detail
            const zipMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const zip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 0.1), zipMat);
            zip.position.set(0, 0, 0.45);
            this.torso.add(zip);
        }

        this.torso.position.y = 2.15;
        this.torso.castShadow = true;
        this.group.add(this.torso);
    }

    updateAppearance(options) {
        if (options.shirtColor !== undefined) this.shirtColor = options.shirtColor;
        if (options.pantsColor !== undefined) this.pantsColor = options.pantsColor;
        if (options.skinColor !== undefined) this.skinColor = options.skinColor;
        if (options.shoeColor !== undefined) this.shoeColor = options.shoeColor;
        if (options.hairColor !== undefined) this.hairColor = options.hairColor;
        if (options.hairStyle !== undefined) this.hairStyle = options.hairStyle;
        if (options.shirtType !== undefined) this.shirtType = options.shirtType;

        // Rebuild visual representation
        const nameData = this.name;

        // Clear previous meshes
        while (this.group.children.length > 0) {
            const child = this.group.children[0];
            this.group.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        }

        this._build();
        this._createNameplate();
        this._createChatBubble();
        this.updateNameplate(nameData);
    }

    _createNameplate() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        this._nameplateCtx = ctx;
        this._nameplateCanvas = canvas;

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        this._nameplateTexture = texture;

        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
        this.nameplate = new THREE.Sprite(spriteMat);
        this.nameplate.position.y = 4.0;
        this.nameplate.scale.set(2.5, 0.625, 1);
        this.group.add(this.nameplate);

        this.updateNameplate(this.name);
    }

    updateNameplate(name) {
        this.name = name;
        const ctx = this._nameplateCtx;
        const canvas = this._nameplateCanvas;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background pill
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const w = canvas.width, h = canvas.height;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(16, 10, w - 32, h - 20, 20) : ctx.rect(16, 10, w - 32, h - 20);
        ctx.fill();

        // Text
        ctx.font = 'bold 22px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(name, w / 2, h / 2);
        ctx.shadowBlur = 0;

        this._nameplateTexture.needsUpdate = true;
    }

    setPosition(x, y, z) { this.group.position.set(x, y, z); }
    setRotation(ry) { this.group.rotation.y = ry; }

    setTargetPosition(x, y, z) { this._targetPos.set(x, y, z); }
    setTargetRotation(ry) { this._targetRot = ry; }

    update(dt) {
        // Interpolate remote players
        if (!this.isLocal) {
            this.group.position.lerp(this._targetPos, 0.15);
            let diff = this._targetRot - this.group.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.group.rotation.y += diff * 0.15;
        }

        this.animTime += dt;
        const t = this.animTime;

        if (this.animState === 'walk') {
            const speed = 5;
            const amp = 0.45;
            const phase = t * speed;
            this.leftArm.rotation.x = Math.sin(phase) * amp;
            this.rightArm.rotation.x = -Math.sin(phase) * amp;
            this.leftLeg.rotation.x = -Math.sin(phase) * amp * 0.85;
            this.rightLeg.rotation.x = Math.sin(phase) * amp * 0.85;
            // Subtle torso sway
            this.torso.rotation.z = Math.sin(phase) * 0.02;
            this.head.position.y = 3.15 + Math.abs(Math.sin(phase * 2)) * 0.03;
        } else if (this.animState === 'run') {
            const speed = 8;
            const amp = 0.65;
            const phase = t * speed;
            this.leftArm.rotation.x = Math.sin(phase) * amp;
            this.rightArm.rotation.x = -Math.sin(phase) * amp;
            this.leftLeg.rotation.x = -Math.sin(phase) * amp;
            this.rightLeg.rotation.x = Math.sin(phase) * amp;
            this.torso.rotation.z = Math.sin(phase) * 0.03;
            this.torso.position.y = 2.15 + Math.abs(Math.sin(phase * 2)) * 0.04;
            this.head.position.y = 3.15 + Math.abs(Math.sin(phase * 2)) * 0.06;
        } else {
            // Idle — natural breathing
            const breathe = Math.sin(t * 1.5);
            this.leftArm.rotation.x *= 0.9;
            this.rightArm.rotation.x *= 0.9;
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
            this.torso.rotation.z *= 0.9;
            this.torso.position.y = 2.15 + breathe * 0.015;
            this.head.position.y = 3.15 + breathe * 0.015;
            // Subtle arm idle sway
            this.leftArm.rotation.z = -0.05 + breathe * 0.01;
            this.rightArm.rotation.z = 0.05 - breathe * 0.01;
        }
    }

    setAnimState(state) {
        if (this.animState !== state) this.animState = state;
    }

    dispose() {
        this.group.parent?.remove(this.group);
        this._nameplateTexture.dispose();
    }
}
