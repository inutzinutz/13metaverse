/**
 * Hero 3D Scene — Drone VTOL + Particle Starfield
 * Creates an immersive Three.js hero background with a
 * procedural drone model, particle field, and mouse parallax.
 */
import * as THREE from 'three';

export class Hero3D {
    constructor(container) {
        this.container = container;
        this.mouse = { x: 0, y: 0 };
        this.scrollY = 0;
        this.disposed = false;
        this._init();
        this._bind();
        this._animate();
    }

    _init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.012);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 2, 12);
        this.camera.lookAt(0, 0, 0);

        // Lighting
        const ambient = new THREE.AmbientLight(0x334466, 0.6);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        const rimLight = new THREE.DirectionalLight(0xffa726, 0.5);
        rimLight.position.set(-5, 3, -5);
        this.scene.add(rimLight);

        // Build drone
        this.droneGroup = this._buildDrone();
        this.scene.add(this.droneGroup);

        // Particles
        this._buildParticles();

        // Ambient grid
        this._buildGrid();
    }

    _buildDrone() {
        const group = new THREE.Group();

        // Materials
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a2e,
            specular: 0x444466,
            shininess: 80,
            flatShading: false,
        });
        const accentMat = new THREE.MeshPhongMaterial({
            color: 0xffa726,
            emissive: 0xff7043,
            emissiveIntensity: 0.3,
            shininess: 100,
        });
        const darkMat = new THREE.MeshPhongMaterial({
            color: 0x0d0d1a,
            specular: 0x222244,
            shininess: 60,
        });
        const wingMat = new THREE.MeshPhongMaterial({
            color: 0x2a2a40,
            specular: 0x334455,
            shininess: 40,
            side: THREE.DoubleSide,
        });

        // --- Main fuselage (streamlined VTOL body) ---
        const fuselageGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
        fuselage.rotation.z = Math.PI / 2;
        group.add(fuselage);

        // Nose cone
        const noseGeo = new THREE.ConeGeometry(0.3, 1.2, 8);
        const nose = new THREE.Mesh(noseGeo, darkMat);
        nose.rotation.z = -Math.PI / 2;
        nose.position.x = 2.6;
        group.add(nose);

        // Tail section
        const tailGeo = new THREE.ConeGeometry(0.5, 1.5, 6);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.rotation.z = Math.PI / 2;
        tail.position.x = -2.7;
        group.add(tail);

        // Vertical tail fin
        const vTailGeo = new THREE.BoxGeometry(1.2, 1, 0.05);
        const vTail = new THREE.Mesh(vTailGeo, wingMat);
        vTail.position.set(-2.8, 0.5, 0);
        group.add(vTail);

        // --- Wings ---
        const wingGeo = new THREE.BoxGeometry(1.8, 0.06, 5);
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.set(0.3, 0, 2.5);
        group.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.position.set(0.3, 0, -2.5);
        group.add(rightWing);

        // Wing tips (amber accent)
        const tipGeo = new THREE.BoxGeometry(0.3, 0.08, 0.6);
        [2.5, -2.5].forEach(zOff => {
            const zDir = zOff > 0 ? 1 : -1;
            const tip = new THREE.Mesh(tipGeo, accentMat);
            tip.position.set(0.3, 0, zOff + zDir * 2.6);
            group.add(tip);
        });

        // --- Motor nacelles (4) ---
        const nacPositions = [
            { x: 0.8, z: 2.5 }, { x: -0.4, z: 2.5 },
            { x: 0.8, z: -2.5 }, { x: -0.4, z: -2.5 },
        ];
        const nacGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8);

        this.rotors = [];

        nacPositions.forEach(pos => {
            // Nacelle body
            const nac = new THREE.Mesh(nacGeo, darkMat);
            nac.position.set(pos.x, 0.35, pos.z);
            group.add(nac);

            // Rotor disc (spinning)
            const rotorGeo = new THREE.RingGeometry(0.05, 0.55, 24);
            const rotorMat = new THREE.MeshPhongMaterial({
                color: 0xffa726,
                emissive: 0xff7043,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
            });
            const rotor = new THREE.Mesh(rotorGeo, rotorMat);
            rotor.position.set(pos.x, 0.7, pos.z);
            rotor.rotation.x = -Math.PI / 2;
            group.add(rotor);
            this.rotors.push(rotor);

            // Engine glow
            const glow = new THREE.PointLight(0xff7043, 0.6, 3);
            glow.position.set(pos.x, 0.3, pos.z);
            group.add(glow);
        });

        // --- Camera/sensor pod (bottom) ---
        const podGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const pod = new THREE.Mesh(podGeo, darkMat);
        pod.position.set(1.5, -0.45, 0);
        group.add(pod);

        // Accent stripe
        const stripeGeo = new THREE.BoxGeometry(3, 0.04, 0.2);
        const stripe = new THREE.Mesh(stripeGeo, accentMat);
        stripe.position.set(0, 0.32, 0);
        group.add(stripe);

        // Position drone
        group.position.y = 0.5;
        group.rotation.y = -0.3;

        return group;
    }

    _buildParticles() {
        // Layer 1: Foreground/Mid stars
        const count = 2500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const colorA = new THREE.Color(0xffa726);
        const colorB = new THREE.Color(0x42a5f5);
        const colorC = new THREE.Color(0x26c6da);
        const palette = [colorA, colorB, colorC];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 80;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;

            sizes[i] = Math.random() * 2 + 0.5;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            size: 0.12,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);

        // Layer 2: Deep background glow (fewer, larger)
        const count2 = 200;
        const pos2 = new Float32Array(count2 * 3);
        for (let i = 0; i < count2; i++) {
            pos2[i * 3] = (Math.random() - 0.5) * 150;
            pos2[i * 3 + 1] = (Math.random() - 0.5) * 100;
            pos2[i * 3 + 2] = (Math.random() - 0.5) * 150;
        }
        const geo2 = new THREE.BufferGeometry();
        geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
        const mat2 = new THREE.PointsMaterial({
            size: 0.8,
            color: 0x42a5f5,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.particlesBack = new THREE.Points(geo2, mat2);
        this.scene.add(this.particlesBack);
    }

    _buildGrid() {
        const gridGeo = new THREE.PlaneGeometry(100, 100, 60, 60);
        const gridMat = new THREE.MeshBasicMaterial({
            color: 0x1a2040,
            wireframe: true,
            transparent: true,
            opacity: 0.08,
        });
        const grid = new THREE.Mesh(gridGeo, gridMat);
        grid.rotation.x = -Math.PI / 2;
        grid.position.y = -5;
        this.scene.add(grid);
    }

    _bind() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
            this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
        });

        window.addEventListener('scroll', () => {
            this.scrollY = window.scrollY;
        });

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

        // Drone float + rotation
        if (this.droneGroup) {
            this.droneGroup.rotation.y += 0.003;
            this.droneGroup.position.y = 0.5 + Math.sin(t * 0.8) * 0.3;

            // Mouse parallax
            this.droneGroup.rotation.x += (this.mouse.y * 0.15 - this.droneGroup.rotation.x) * 0.03;
            this.droneGroup.rotation.z += (-this.mouse.x * 0.1 - this.droneGroup.rotation.z) * 0.03;
        }

        // Rotor spin
        this.rotors.forEach(r => {
            r.rotation.z += 0.15;
        });

        // Particles slow drift — Layer 1
        if (this.particles) {
            this.particles.rotation.y += 0.0003 + scrollFactor * 0.001;
            this.particles.rotation.x += 0.0001;
        }
        // Particles Layer 2 (Background) - Different speed/parallax
        if (this.particlesBack) {
            this.particlesBack.rotation.y -= 0.0001 + scrollFactor * 0.0005;
            this.particlesBack.position.y = -scrollFactor * 5;
        }

        // Scroll — zoom out camera
        const scrollFactor = Math.min(this.scrollY / 800, 1);
        this.camera.position.z = 12 + scrollFactor * 10;
        this.camera.position.y = 2 - scrollFactor * 4;

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.disposed = true;
        this.renderer.dispose();
    }
}
