import * as THREE from 'three';

/**
 * DroneSimulator — Basic flight physics and controls for FPV mode
 */
export class DroneSimulator {
    constructor(scene, camera, controls) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls; // Ref to PlayerController to disable it

        this.isActive = false;
        this.model = null;
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

        // Physics constants
        this.thrust = 15;
        this.drag = 0.96;
        this.gravity = 9.8;
        this.rotateSpeed = 2.5;

        this._keys = {};
        this._initModel();
        this._bindEvents();
    }

    _initModel() {
        // Simple DJI Avata 2 style drone model
        this.model = new THREE.Group();

        const bodyGeo = new THREE.BoxGeometry(0.4, 0.1, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x212121, metalness: 0.8, roughness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.model.add(body);

        // DJI Red accents
        const accentGeo = new THREE.BoxGeometry(0.05, 0.12, 0.42);
        const accentMat = new THREE.MeshStandardMaterial({ color: 0xe2001a });
        const accentL = new THREE.Mesh(accentGeo, accentMat);
        accentL.position.x = -0.2;
        this.model.add(accentL);
        const accentR = accentL.clone();
        accentR.position.x = 0.2;
        this.model.add(accentR);

        // Propellers (Simplified)
        const propGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 8);
        const propMat = new THREE.MeshStandardMaterial({ color: 0x444444, transparent: true, opacity: 0.6 });
        const props = [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]];
        props.forEach(([px, pz]) => {
            const prop = new THREE.Mesh(propGeo, propMat);
            prop.position.set(px, 0.05, pz);
            this.model.add(prop);
        });

        this.model.visible = false;
        this.scene.add(this.model);
    }

    _bindEvents() {
        window.addEventListener('keydown', (e) => this._keys[e.code] = true);
        window.addEventListener('keyup', (e) => this._keys[e.code] = false);
    }

    activate(startPos) {
        this.isActive = true;
        this.model.visible = true;
        this.model.position.copy(startPos);
        this.velocity.set(0, 0, 0);
        this.rotation.set(0, 0, 0);

        // Switch camera to FPV
        this.camera.position.set(0, 0.1, 0); // camera inside drone
        this.model.add(this.camera);
    }

    deactivate() {
        this.isActive = false;
        this.model.visible = false;
        this.scene.remove(this.camera); // detach from drone
    }

    update(dt) {
        if (!this.isActive) return;

        // Controls: WASD for pitch/roll, Shift/Space for throttle, Q/E for yaw
        let inputThrust = 0;
        if (this._keys['Space']) inputThrust += this.thrust;
        if (this._keys['ShiftLeft']) inputThrust -= this.thrust * 0.5;

        // Rotation (Yaw)
        if (this._keys['KeyQ']) this.rotation.y += this.rotateSpeed * dt;
        if (this._keys['KeyE']) this.rotation.y -= this.rotateSpeed * dt;

        // Pitch / Roll (Tilt)
        let targetPitch = 0;
        let targetRoll = 0;
        if (this._keys['KeyW']) targetPitch = -0.4;
        if (this._keys['KeyS']) targetPitch = 0.4;
        if (this._keys['KeyA']) targetRoll = 0.4;
        if (this._keys['KeyD']) targetRoll = -0.4;

        this.rotation.x = THREE.MathUtils.lerp(this.rotation.x, targetPitch, dt * 5);
        this.rotation.z = THREE.MathUtils.lerp(this.rotation.z, targetRoll, dt * 5);

        // Apply rotation
        this.model.quaternion.setFromEuler(this.rotation);

        // Apply Thrust in local "Up" direction
        const worldUp = new THREE.Vector3(0, 1, 0);
        const localUp = worldUp.applyQuaternion(this.model.quaternion);
        this.velocity.addScaledVector(localUp, inputThrust * dt);

        // Gravity
        this.velocity.y -= this.gravity * dt;

        // Drag
        this.velocity.multiplyScalar(this.drag);

        // Apply Velocity
        this.model.position.addScaledVector(this.velocity, dt);

        // Ground collision (simple)
        if (this.model.position.y < 0.2) {
            this.model.position.y = 0.2;
            this.velocity.y = 0;
        }
    }
}
