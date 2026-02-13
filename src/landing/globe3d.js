/**
 * Globe 3D Command Center —
 * Interactive earth with Thailand highlight, flight paths, and hotspots.
 */
import * as THREE from 'three';

const HOTSPOTS = [
    { lat: 13.75, lon: 100.5, label: 'กรุงเทพมหานคร', desc: 'ศูนย์บัญชาการกลาง — ตรวจสอบโครงสร้างพื้นฐานและความปลอดภัยเมือง', color: 0xffa726 },
    { lat: 18.79, lon: 98.98, label: 'เชียงใหม่', desc: 'สำรวจพื้นที่เกษตรและป่าไม้ด้วยโดรน VTOL ระยะไกล', color: 0x66bb6a },
    { lat: 7.88, lon: 98.39, label: 'ภูเก็ต', desc: 'ตรวจสอบชายฝั่งและระบบนิเวศทางทะเล', color: 0x42a5f5 },
    { lat: 14.88, lon: 105.0, label: 'อีสาน', desc: 'ลาดตระเวนชายแดนและพื้นที่ห่างไกล', color: 0xef5350 },
    { lat: 9.14, lon: 99.33, label: 'สุราษฎร์ธานี', desc: 'ค้นหาและกู้ภัยในพื้นที่ภัยพิบัติ', color: 0x26c6da },
    { lat: 12.57, lon: 99.96, label: 'หัวหิน/ประจวบฯ', desc: 'ตรวจโรงงานอุตสาหกรรมและท่อส่ง', color: 0xab47bc },
];

// International connection origins
const ORIGINS = [
    { lat: 22.3, lon: 114.17 },  // Hong Kong (DJI HQ region)
    { lat: 35.68, lon: 139.69 }, // Tokyo
    { lat: 1.35, lon: 103.82 },  // Singapore
    { lat: 37.56, lon: 126.97 }, // Seoul
];

export class Globe3D {
    constructor(container) {
        this.container = container;
        this.isDragging = false;
        this.prevMouse = { x: 0, y: 0 };
        this.rotVelocity = { x: 0, y: 0 };
        this.disposed = false;
        this.hotspotMeshes = [];
        this.onHotspotHover = null;
        this._init();
        this._bind();
        this._animate();
    }

    _init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 1.5, 6);
        this.camera.lookAt(0, 0, 0);

        // Lighting
        const ambient = new THREE.AmbientLight(0x223355, 0.8);
        this.scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 1);
        dir.position.set(5, 5, 5);
        this.scene.add(dir);
        const backLight = new THREE.DirectionalLight(0xffa726, 0.3);
        backLight.position.set(-5, -2, -5);
        this.scene.add(backLight);

        this.globeGroup = new THREE.Group();
        this.scene.add(this.globeGroup);

        this._buildGlobe();
        this._buildHotspots();
        this._buildFlightPaths();
        this._buildAtmosphere();

        // Rotation offset to center Thailand
        this.globeGroup.rotation.y = -Math.PI * 0.55;
        this.globeGroup.rotation.x = -0.15;

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouseNDC = new THREE.Vector2();
    }

    _buildGlobe() {
        const R = 2;
        this.RADIUS = R;

        // Solid dark sphere
        const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
        const sphereMat = new THREE.MeshPhongMaterial({
            color: 0x0a1628,
            specular: 0x112244,
            shininess: 20,
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        this.globeGroup.add(sphere);

        // Wireframe overlay
        const wireGeo = new THREE.SphereGeometry(R + 0.005, 36, 36);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x1a3050,
            wireframe: true,
            transparent: true,
            opacity: 0.15,
        });
        this.globeGroup.add(new THREE.Mesh(wireGeo, wireMat));

        // Latitude / longitude lines (styled)
        const linesMat = new THREE.LineBasicMaterial({ color: 0x1a3050, transparent: true, opacity: 0.25 });
        // Latitude lines
        for (let lat = -80; lat <= 80; lat += 20) {
            const phi = (90 - lat) * Math.PI / 180;
            const points = [];
            for (let lon = 0; lon <= 360; lon += 5) {
                const theta = lon * Math.PI / 180;
                points.push(new THREE.Vector3(
                    -(R + 0.01) * Math.sin(phi) * Math.cos(theta),
                    (R + 0.01) * Math.cos(phi),
                    (R + 0.01) * Math.sin(phi) * Math.sin(theta),
                ));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            this.globeGroup.add(new THREE.Line(geo, linesMat));
        }

        // Thailand region highlight (approximate bounding box)
        this._highlightRegion(5, 21, 97, 106, 0xffa726);
    }

    _highlightRegion(latMin, latMax, lonMin, lonMax, color) {
        const R = this.RADIUS + 0.02;
        const points = [];
        const step = 1;

        // Top edge
        for (let lon = lonMin; lon <= lonMax; lon += step) {
            points.push(this._latLonToVec3(latMax, lon, R));
        }
        // Right edge
        for (let lat = latMax; lat >= latMin; lat -= step) {
            points.push(this._latLonToVec3(lat, lonMax, R));
        }
        // Bottom edge
        for (let lon = lonMax; lon >= lonMin; lon -= step) {
            points.push(this._latLonToVec3(latMin, lon, R));
        }
        // Left edge
        for (let lat = latMin; lat <= latMax; lat += step) {
            points.push(this._latLonToVec3(lat, lonMin, R));
        }

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, linewidth: 2 });
        this.globeGroup.add(new THREE.LineLoop(geo, mat));

        // Fill — approximate with a small rectangle mesh
        const fillGeo = new THREE.PlaneGeometry(0.35, 0.6);
        const fillMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
        });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        const center = this._latLonToVec3((latMin + latMax) / 2, (lonMin + lonMax) / 2, R + 0.01);
        fill.position.copy(center);
        fill.lookAt(0, 0, 0);
        this.globeGroup.add(fill);
    }

    _buildHotspots() {
        const R = this.RADIUS;
        HOTSPOTS.forEach((hs, i) => {
            const pos = this._latLonToVec3(hs.lat, hs.lon, R + 0.05);

            // Outer glow ring
            const ringGeo = new THREE.RingGeometry(0.04, 0.08, 16);
            const ringMat = new THREE.MeshBasicMaterial({
                color: hs.color,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(pos);
            ring.lookAt(0, 0, 0);
            ring.userData = { hotspotIndex: i, type: 'hotspot' };
            this.globeGroup.add(ring);

            // Core dot
            const dotGeo = new THREE.SphereGeometry(0.035, 8, 8);
            const dotMat = new THREE.MeshBasicMaterial({ color: hs.color });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.copy(pos);
            dot.userData = { hotspotIndex: i, type: 'hotspot' };
            this.globeGroup.add(dot);

            // Pulse
            const pulseGeo = new THREE.RingGeometry(0.05, 0.12, 16);
            const pulseMat = new THREE.MeshBasicMaterial({
                color: hs.color,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
            });
            const pulse = new THREE.Mesh(pulseGeo, pulseMat);
            pulse.position.copy(pos);
            pulse.lookAt(0, 0, 0);
            pulse.userData = { pulsePhase: i * 0.8 };
            this.globeGroup.add(pulse);

            this.hotspotMeshes.push({ ring, dot, pulse, data: hs });
        });
    }

    _buildFlightPaths() {
        const bangkok = this._latLonToVec3(13.75, 100.5, this.RADIUS);

        ORIGINS.forEach(origin => {
            const start = this._latLonToVec3(origin.lat, origin.lon, this.RADIUS);
            const mid = new THREE.Vector3().addVectors(start, bangkok).multiplyScalar(0.5);
            mid.normalize().multiplyScalar(this.RADIUS + 0.8 + Math.random() * 0.4);

            const curve = new THREE.QuadraticBezierCurve3(start, mid, bangkok);
            const points = curve.getPoints(50);
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({
                color: 0xffa726,
                transparent: true,
                opacity: 0.2,
            });
            this.globeGroup.add(new THREE.Line(geo, mat));

            // multiple animated pulses along paths
            for (let i = 0; i < 3; i++) {
                const dotGeo = new THREE.SphereGeometry(0.025, 6, 6);
                const dotMat = new THREE.MeshBasicMaterial({ color: 0xffcc02, transparent: true, opacity: 0.8 });
                const dot = new THREE.Mesh(dotGeo, dotMat);
                dot.userData = { curve, phase: Math.random(), speed: 0.1 + Math.random() * 0.1 };
                this.globeGroup.add(dot);
            }
        });
    }

    _buildAtmosphere() {
        const R = this.RADIUS;
        // Outer glow sphere
        const atmoGeo = new THREE.SphereGeometry(R + 0.15, 64, 64);
        const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x42a5f5,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide,
        });
        this.globeGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

        // Command Center Holographic Ring (Horizontal)
        const ringGeo = new THREE.RingGeometry(R + 0.6, R + 0.62, 128);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffa726,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const uiRing = new THREE.Mesh(ringGeo, ringMat);
        uiRing.rotation.x = Math.PI / 2;
        this.globeGroup.add(uiRing);

        // Dashed holographic ring (Vertical)
        const vRingGeo = new THREE.RingGeometry(R + 0.8, R + 0.81, 64);
        const vRingMat = new THREE.MeshBasicMaterial({
            color: 0x42a5f5,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide,
            wireframe: true
        });
        const vRing = new THREE.Mesh(vRingGeo, vRingMat);
        vRing.rotation.y = Math.PI / 2;
        this.globeGroup.add(vRing);
    }

    _latLonToVec3(lat, lon, radius) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lon + 180) * Math.PI / 180;
        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta),
        );
    }

    _bind() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('pointerdown', (e) => {
            this.isDragging = true;
            this.prevMouse.x = e.clientX;
            this.prevMouse.y = e.clientY;
        });

        window.addEventListener('pointerup', () => { this.isDragging = false; });

        window.addEventListener('pointermove', (e) => {
            // NDC for raycasting
            const rect = canvas.getBoundingClientRect();
            this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            if (!this.isDragging) return;
            const dx = e.clientX - this.prevMouse.x;
            const dy = e.clientY - this.prevMouse.y;
            this.rotVelocity.y += dx * 0.003;
            this.rotVelocity.x += dy * 0.003;
            this.prevMouse.x = e.clientX;
            this.prevMouse.y = e.clientY;
        });

        canvas.addEventListener('click', () => {
            this._checkHotspotClick();
        });

        window.addEventListener('resize', () => {
            if (this.disposed) return;
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
    }

    _checkHotspotClick() {
        this.raycaster.setFromCamera(this.mouseNDC, this.camera);
        const meshes = this.hotspotMeshes.flatMap(h => [h.ring, h.dot]);
        const intersects = this.raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            const idx = intersects[0].object.userData.hotspotIndex;
            if (idx !== undefined && this.onHotspotHover) {
                const hs = HOTSPOTS[idx];
                // Project to screen
                const pos = this.hotspotMeshes[idx].dot.getWorldPosition(new THREE.Vector3());
                pos.project(this.camera);
                const rect = this.container.getBoundingClientRect();
                const sx = (pos.x * 0.5 + 0.5) * rect.width;
                const sy = (-pos.y * 0.5 + 0.5) * rect.height;
                this.onHotspotHover({ ...hs, screenX: sx, screenY: sy });
            }
        }
    }

    _animate() {
        if (this.disposed) return;
        requestAnimationFrame(() => this._animate());

        const t = performance.now() * 0.001;

        // Auto-rotate (slow)
        if (!this.isDragging) {
            this.globeGroup.rotation.y += 0.001;
        }

        // Apply drag velocity
        this.globeGroup.rotation.y += this.rotVelocity.y;
        this.globeGroup.rotation.x += this.rotVelocity.x;
        this.globeGroup.rotation.x = Math.max(-1, Math.min(1, this.globeGroup.rotation.x));

        // Dampen
        this.rotVelocity.x *= 0.92;
        this.rotVelocity.y *= 0.92;

        // Pulse animation on hotspots
        this.hotspotMeshes.forEach(h => {
            const phase = h.pulse.userData.pulsePhase || 0;
            const s = 1 + Math.sin(t * 2 + phase) * 0.4;
            h.pulse.scale.set(s, s, s);
            h.pulse.material.opacity = 0.3 - Math.sin(t * 2 + phase) * 0.15;
        });

        // Animated flight path dots
        this.globeGroup.children.forEach(child => {
            if (child.userData.curve) {
                const speed = child.userData.speed || 0.15;
                const p = (t * speed + child.userData.phase) % 1;
                const pos = child.userData.curve.getPoint(p);
                child.position.copy(pos);
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.disposed = true;
        this.renderer.dispose();
    }
}
