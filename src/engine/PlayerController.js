import * as THREE from 'three';

/**
 * PlayerController — Third-person WASD controls
 */
export class PlayerController {
    constructor(camera, avatar, colliders = []) {
        this.camera = camera;
        this.avatar = avatar;
        this.colliders = colliders;

        this.moveSpeed = 8;
        this.sprintSpeed = 14;
        this.turnSpeed = 3;
        this.jumpForce = 12;
        this.gravity = -30;

        this.velocity = new THREE.Vector3();
        this.isOnGround = true;

        // Camera offset from player
        this.cameraDistance = 10;
        this.cameraHeight = 6;
        this.cameraAngle = 0;
        this.cameraPitch = 0.3;

        // Input state
        this.keys = {};
        this.isPointerLocked = false;

        this._bindInput();
    }

    _bindInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse for camera rotation
        const canvas = document.getElementById('three-canvas');
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                // Right-click to rotate camera
                this.isPointerLocked = true;
                canvas.requestPointerLock?.();
            }
        });
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.isPointerLocked = false;
                document.exitPointerLock?.();
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked || document.pointerLockElement) {
                this.cameraAngle -= e.movementX * 0.003;
                this.cameraPitch = Math.max(0.1, Math.min(1.2,
                    this.cameraPitch + e.movementY * 0.003));
            }
        });

        // Scroll to zoom
        canvas.addEventListener('wheel', (e) => {
            this.cameraDistance = Math.max(5, Math.min(20,
                this.cameraDistance + e.deltaY * 0.01));
        });

        // Prevent right-click context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    update(dt) {
        const avatar = this.avatar;
        const pos = avatar.group.position;

        // --- Movement direction based on camera ---
        const moveDir = new THREE.Vector3();
        const forward = new THREE.Vector3(
            -Math.sin(this.cameraAngle), 0, -Math.cos(this.cameraAngle)
        );
        const right = new THREE.Vector3(
            -Math.cos(this.cameraAngle), 0, Math.sin(this.cameraAngle)
        );

        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);

        const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
        const speed = isSprinting ? this.sprintSpeed : this.moveSpeed;
        const isMoving = moveDir.lengthSq() > 0;

        if (isMoving) {
            moveDir.normalize();
            // Face movement direction
            const targetAngle = Math.atan2(moveDir.x, moveDir.z);
            let angleDiff = targetAngle - avatar.group.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            avatar.group.rotation.y += angleDiff * Math.min(1, dt * 10);

            avatar.setAnimState(isSprinting ? 'run' : 'walk');
        } else {
            avatar.setAnimState('idle');
        }

        // Apply movement
        const newPos = pos.clone();
        if (isMoving) {
            newPos.x += moveDir.x * speed * dt;
            newPos.z += moveDir.z * speed * dt;
        }

        // Jump
        if ((this.keys['Space']) && this.isOnGround) {
            this.velocity.y = this.jumpForce;
            this.isOnGround = false;
        }

        // Gravity
        this.velocity.y += this.gravity * dt;
        newPos.y += this.velocity.y * dt;

        // Ground check
        if (newPos.y <= 0) {
            newPos.y = 0;
            this.velocity.y = 0;
            this.isOnGround = true;
        }

        // Collision check
        const playerBox = new THREE.Box3(
            new THREE.Vector3(newPos.x - 0.5, newPos.y, newPos.z - 0.5),
            new THREE.Vector3(newPos.x + 0.5, newPos.y + 3.5, newPos.z + 0.5)
        );

        let collision = false;
        for (const collider of this.colliders) {
            if (playerBox.intersectsBox(collider)) {
                collision = true;
                break;
            }
        }

        if (!collision) {
            pos.copy(newPos);
        } else {
            // Try X only
            const xOnly = pos.clone();
            xOnly.x = newPos.x;
            xOnly.y = newPos.y;
            const xBox = new THREE.Box3(
                new THREE.Vector3(xOnly.x - 0.5, xOnly.y, xOnly.z - 0.5),
                new THREE.Vector3(xOnly.x + 0.5, xOnly.y + 3.5, xOnly.z + 0.5)
            );
            let xCollision = false;
            for (const c of this.colliders) {
                if (xBox.intersectsBox(c)) { xCollision = true; break; }
            }
            if (!xCollision) { pos.copy(xOnly); }
            else {
                // Try Z only
                const zOnly = pos.clone();
                zOnly.z = newPos.z;
                zOnly.y = newPos.y;
                const zBox = new THREE.Box3(
                    new THREE.Vector3(zOnly.x - 0.5, zOnly.y, zOnly.z - 0.5),
                    new THREE.Vector3(zOnly.x + 0.5, zOnly.y + 3.5, zOnly.z + 0.5)
                );
                let zCollision = false;
                for (const c of this.colliders) {
                    if (zBox.intersectsBox(c)) { zCollision = true; break; }
                }
                if (!zCollision) { pos.copy(zOnly); }
                else {
                    // Only Y
                    pos.y = newPos.y;
                }
            }
        }

        // World bounds
        pos.x = Math.max(-95, Math.min(95, pos.x));
        pos.z = Math.max(-95, Math.min(95, pos.z));

        // --- Update camera ---
        const camX = pos.x + Math.sin(this.cameraAngle) * this.cameraDistance;
        const camZ = pos.z + Math.cos(this.cameraAngle) * this.cameraDistance;
        const camY = pos.y + this.cameraHeight + this.cameraPitch * this.cameraDistance * 0.5;

        this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.1);
        this.camera.lookAt(pos.x, pos.y + 2.5, pos.z);
    }

    getState() {
        const p = this.avatar.group.position;
        return {
            x: Math.round(p.x * 100) / 100,
            y: Math.round(p.y * 100) / 100,
            z: Math.round(p.z * 100) / 100,
            ry: Math.round(this.avatar.group.rotation.y * 100) / 100,
            anim: this.avatar.animState
        };
    }
}
