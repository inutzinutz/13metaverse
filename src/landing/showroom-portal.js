/**
 * Showroom Portal — Mini drone gallery preview
 * 3 procedural drone models floating on glowing podiums
 */
import * as THREE from 'three';

const DRONE_INFO = [
    { name: 'DJI Matrice 350 RTK', type: 'Enterprise', color: 0x42a5f5 },
    { name: 'DJI Mavic 3 Enterprise', type: 'Compact', color: 0x66bb6a },
    { name: 'DJI FlyCart 30', type: 'Delivery', color: 0xffa726 },
];

export class ShowroomPortal {
    constructor(container) {
        this.container = container;
        this.disposed = false;
        this.drones = [];
        this._init();
        this._bind();
        this._animate();
    }

    _init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(0x0a0e1a, 1);
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.04);

        this.camera = new THREE.PerspectiveCamera(50, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        this.camera.position.set(0, 3, 8);
        this.camera.lookAt(0, 0.5, 0);

        // Lighting
        const ambient = new THREE.AmbientLight(0x334466, 0.6);
        this.scene.add(ambient);

        const spot1 = new THREE.SpotLight(0xffffff, 1.5, 20, Math.PI / 6, 0.5);
        spot1.position.set(0, 8, 3);
        this.scene.add(spot1);

        const spot2 = new THREE.SpotLight(0xffa726, 0.5, 15, Math.PI / 4);
        spot2.position.set(-5, 6, -2);
        this.scene.add(spot2);

        // Floor
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshPhongMaterial({
            color: 0x080c18,
            specular: 0x111122,
            shininess: 100,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        this.scene.add(floor);

        // Grid
        const gridGeo = new THREE.PlaneGeometry(30, 30, 40, 40);
        const gridMat = new THREE.MeshBasicMaterial({
            color: 0x1a2040,
            wireframe: true,
            transparent: true,
            opacity: 0.06,
        });
        const grid = new THREE.Mesh(gridGeo, gridMat);
        grid.rotation.x = -Math.PI / 2;
        grid.position.y = 0;
        this.scene.add(grid);

        // Build 3 drones on podiums
        const spacing = 3.5;
        DRONE_INFO.forEach((info, i) => {
            const x = (i - 1) * spacing;
            this._buildPodium(x, info.color);
            const drone = this._buildMiniDrone(info.color);
            drone.position.set(x, 2, 0);
            drone.userData = { baseY: 2, phase: i * 2.1 };
            this.scene.add(drone);
            this.drones.push(drone);
        });
    }

    _buildPodium(x, color) {
        // Base cylinder
        const baseGeo = new THREE.CylinderGeometry(0.8, 0.9, 0.15, 32);
        const baseMat = new THREE.MeshPhongMaterial({
            color: 0x111828,
            specular: 0x223344,
            shininess: 80,
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(x, 0.075, 0);
        this.scene.add(base);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(0.7, 0.85, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.16, 0);
        this.scene.add(ring);

        // Vertical light beam
        const beamGeo = new THREE.CylinderGeometry(0.02, 0.4, 3, 16, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(x, 1.5, 0);
        this.scene.add(beam);

        // Point light
        const light = new THREE.PointLight(color, 0.5, 4);
        light.position.set(x, 0.3, 0);
        this.scene.add(light);
    }

    _buildMiniDrone(accentColor) {
        const group = new THREE.Group();

        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a2e,
            specular: 0x333355,
            shininess: 60,
        });
        const armMat = new THREE.MeshPhongMaterial({
            color: 0x222240,
            specular: 0x222244,
            shininess: 40,
        });
        const accentMat = new THREE.MeshPhongMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 0.3,
            shininess: 80,
        });

        // Body
        const bodyGeo = new THREE.BoxGeometry(0.6, 0.15, 0.4);
        group.add(new THREE.Mesh(bodyGeo, bodyMat));

        // Camera pod
        const podGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const pod = new THREE.Mesh(podGeo, armMat);
        pod.position.set(0.2, -0.1, 0);
        group.add(pod);

        // 4 arms + rotors
        const armPositions = [
            { x: 0.4, z: 0.4 }, { x: -0.4, z: 0.4 },
            { x: 0.4, z: -0.4 }, { x: -0.4, z: -0.4 },
        ];

        armPositions.forEach(pos => {
            // Arm
            const armGeo = new THREE.BoxGeometry(0.08, 0.04, 0.5);
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.set(pos.x * 0.5, 0, pos.z * 0.5);
            arm.rotation.y = Math.atan2(pos.z, pos.x);
            group.add(arm);

            // Motor
            const motorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8);
            const motor = new THREE.Mesh(motorGeo, bodyMat);
            motor.position.set(pos.x, 0.04, pos.z);
            group.add(motor);

            // Rotor disc
            const rotorGeo = new THREE.RingGeometry(0.02, 0.2, 16);
            const rotorMat = new THREE.MeshBasicMaterial({
                color: accentColor,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide,
            });
            const rotor = new THREE.Mesh(rotorGeo, rotorMat);
            rotor.rotation.x = -Math.PI / 2;
            rotor.position.set(pos.x, 0.1, pos.z);
            group.add(rotor);
        });

        // LED strip
        const ledGeo = new THREE.BoxGeometry(0.5, 0.02, 0.02);
        const led = new THREE.Mesh(ledGeo, accentMat);
        led.position.set(0, 0.08, 0.2);
        group.add(led);

        group.scale.set(1.2, 1.2, 1.2);
        return group;
    }

    _bind() {
        window.addEventListener('resize', () => {
            if (this.disposed) return;
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
    }

    _animate() {
        if (this.disposed) return;
        requestAnimationFrame(() => this._animate());

        const t = performance.now() * 0.001;

        this.drones.forEach(d => {
            const phase = d.userData.phase;
            d.position.y = d.userData.baseY + Math.sin(t * 0.8 + phase) * 0.15;
            d.rotation.y += 0.008;

            // Rotor spin
            d.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'RingGeometry') {
                    child.rotation.z += 0.12;
                }
            });
        });

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.disposed = true;
        this.renderer.dispose();
    }
}
