import * as THREE from 'three';

/**
 * WorldBuilder — DJI 13Store Virtual Showroom World
 * Two store branches, drone display area, FPV arena, DJI branding
 */
export class WorldBuilder {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this._build();
    }

    _build() {
        this._createSky();
        this._createGround();
        this._createSpawnPlaza();
        this._createDJIStores();
        this._createDroneDisplayZone();
        this._createFPVArena();
        this._createEnvironment();
        this._createLamps();
    }

    /* =================== SKY =================== */
    _createSky() {
        const skyGeo = new THREE.SphereGeometry(450, 64, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x1a2a4a) },
                horizonColor: { value: new THREE.Color(0x4a7aaa) },
                sunDir: { value: new THREE.Vector3(0.4, 0.5, -0.3).normalize() },
                sunColor: { value: new THREE.Color(0xffeedd) },
            },
            vertexShader: `
                varying vec3 vWP;
                void main() {
                    vWP = (modelMatrix * vec4(position,1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }`,
            fragmentShader: `
                uniform vec3 topColor, horizonColor, sunDir, sunColor;
                varying vec3 vWP;
                void main() {
                    float h = normalize(vWP).y;
                    vec3 sky = mix(horizonColor, topColor, pow(max(h,0.0),0.5));
                    vec3 vd = normalize(vWP);
                    float sd = max(dot(vd,sunDir),0.0);
                    sky += sunColor * pow(sd,128.0)*2.0 + sunColor * pow(sd,16.0)*0.12;
                    gl_FragColor = vec4(sky,1.0);
                }`,
            side: THREE.BackSide, depthWrite: false,
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));

        // Clouds
        const cMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 1, metalness: 0,
            transparent: true, opacity: 0.8,
        });
        for (let i = 0; i < 15; i++) {
            const g = new THREE.Group();
            for (let j = 0; j < 4 + Math.floor(Math.random() * 3); j++) {
                const s = new THREE.Mesh(
                    new THREE.SphereGeometry(1, 6, 4).scale(3 + Math.random() * 4, 1.5 + Math.random(), 2 + Math.random() * 3),
                    cMat
                );
                s.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 3);
                g.add(s);
            }
            g.position.set((Math.random() - 0.5) * 300, 50 + Math.random() * 25, (Math.random() - 0.5) * 300);
            this.scene.add(g);
        }
    }

    /* =================== GROUND =================== */
    _createGround() {
        // Main ground
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x3d6b35, roughness: 0.9, metalness: 0,
        });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(250, 250, 32, 32), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Paved roads
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x333333, roughness: 0.8, metalness: 0.05,
        });
        const roads = [
            [0, 0.02, 0, 6, 200], // main N-S road
            [0, 0.02, 0, 200, 6], // main E-W road
        ];
        roads.forEach(([x, y, z, w, h]) => {
            const r = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
            r.rotation.x = -Math.PI / 2;
            r.position.set(x, y, z);
            r.receiveShadow = true;
            this.scene.add(r);
        });

        // Road lines
        const lineMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
        for (let i = -90; i <= 90; i += 8) {
            const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3), lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(0, 0.03, i);
            this.scene.add(line);
            const line2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.2), lineMat);
            line2.rotation.x = -Math.PI / 2;
            line2.position.set(i, 0.03, 0);
            this.scene.add(line2);
        }

        // Boundaries
        [[0, 5, -125, 250, 10, 1], [0, 5, 125, 250, 10, 1],
        [-125, 5, 0, 1, 10, 250], [125, 5, 0, 1, 10, 250]].forEach(([x, y, z, w, h, d]) => {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(x - w / 2, 0, z - d / 2),
                new THREE.Vector3(x + w / 2, h, z + d / 2)
            ));
        });
    }

    /* =================== SPAWN PLAZA =================== */
    _createSpawnPlaza() {
        // DJI branded plaza
        const plazaMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, roughness: 0.3, metalness: 0.4,
        });
        const plaza = new THREE.Mesh(new THREE.CircleGeometry(14, 48), plazaMat);
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.y = 0.03;
        plaza.receiveShadow = true;
        this.scene.add(plaza);

        // DJI red ring
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xe2001a, emissive: 0xe2001a, emissiveIntensity: 0.3,
            roughness: 0.3, metalness: 0.5,
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(12.5, 14, 48), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        this.scene.add(ring);

        // Inner circle pattern
        const innerMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a, roughness: 0.4, metalness: 0.3,
        });
        const inner = new THREE.Mesh(new THREE.CircleGeometry(6, 32), innerMat);
        inner.rotation.x = -Math.PI / 2;
        inner.position.y = 0.04;
        this.scene.add(inner);

        // Welcome arch — DJI branded
        this._createDJIArch(0, 0, -16);

        // DJI logo pillar
        this._createLogoPillar(0, 0, 0);
    }

    _createLogoPillar(x, y, z) {
        const group = new THREE.Group();
        const blackMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, roughness: 0.2, metalness: 0.7,
        });

        // Pillar
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 16), blackMat);
        pillar.position.y = 1.5;
        pillar.castShadow = true;
        group.add(pillar);

        // DJI text plate
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 256, 256);
        ctx.font = 'bold 72px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DJI', 128, 100);
        ctx.font = 'bold 28px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#e2001a';
        ctx.fillText('13STORE', 128, 145);
        ctx.font = '18px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('VIRTUAL', 128, 185);
        ctx.fillText('SHOWROOM', 128, 210);

        const texture = new THREE.CanvasTexture(canvas);
        const plateMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.3, metalness: 0.5 });

        // Four-sided display
        for (let i = 0; i < 4; i++) {
            const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), plateMat);
            plate.position.y = 3.5;
            plate.position.x = Math.sin(i * Math.PI / 2) * 0.46;
            plate.position.z = Math.cos(i * Math.PI / 2) * 0.46;
            plate.rotation.y = i * Math.PI / 2;
            group.add(plate);
        }

        // Top cap
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.3, 16), blackMat);
        cap.position.y = 3.15;
        group.add(cap);

        // Red LED light
        const led = new THREE.PointLight(0xe2001a, 0.8, 10);
        led.position.y = 4;
        group.add(led);

        group.position.set(x, y, z);
        this.scene.add(group);
        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(x - 0.6, 0, z - 0.6),
            new THREE.Vector3(x + 0.6, 4.5, z + 0.6)
        ));
    }

    _createDJIArch(x, y, z) {
        const group = new THREE.Group();
        const blackMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, roughness: 0.2, metalness: 0.6,
        });
        const redMat = new THREE.MeshStandardMaterial({
            color: 0xe2001a, emissive: 0xe2001a, emissiveIntensity: 0.4,
            roughness: 0.3, metalness: 0.5,
        });

        // Pillars
        for (const side of [-1, 1]) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7, 0.6), blackMat);
            p.position.set(side * 4, 3.5, 0);
            p.castShadow = true;
            group.add(p);
        }

        // Top beam
        const beam = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1, 0.8), blackMat);
        beam.position.y = 7.3;
        beam.castShadow = true;
        group.add(beam);

        // Red accent strip
        const strip = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.1, 0.85), redMat);
        strip.position.y = 6.75;
        group.add(strip);

        // Sign text
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 512, 128);
        ctx.font = 'bold 48px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DJI 13STORE', 256, 55);
        ctx.font = '24px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#e2001a';
        ctx.fillText('VIRTUAL SHOWROOM', 256, 95);

        const tex = new THREE.CanvasTexture(canvas);
        const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.5), signMat);
        sign.position.set(0, 7.3, 0.45);
        group.add(sign);
        const signBack = sign.clone();
        signBack.position.z = -0.45;
        signBack.rotation.y = Math.PI;
        group.add(signBack);

        group.position.set(x, y, z);
        this.scene.add(group);

        // Colliders for pillars
        for (const side of [-1, 1]) {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(x + side * 4 - 0.4, 0, z - 0.4),
                new THREE.Vector3(x + side * 4 + 0.4, 8, z + 0.4)
            ));
        }
    }

    /* =================== DJI STORES =================== */
    _createDJIStores() {
        this._createStore('ลาดปลาเค้า', -30, 0, -25, 0);
        this._createStore('ราชพฤกษ์', 30, 0, -25, Math.PI);
    }

    _createStore(branchName, x, y, z, ry) {
        const group = new THREE.Group();
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.6 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5, metalness: 0.1 });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x88ccff, roughness: 0.05, metalness: 0.9,
            transparent: true, opacity: 0.35,
        });
        const redMat = new THREE.MeshStandardMaterial({
            color: 0xe2001a, emissive: 0xe2001a, emissiveIntensity: 0.3,
            roughness: 0.3, metalness: 0.5,
        });

        // Main building
        const bodyGeo = new THREE.BoxGeometry(16, 10, 12);
        const body = new THREE.Mesh(bodyGeo, whiteMat);
        body.position.y = 5;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Black facade
        const facade = new THREE.Mesh(new THREE.BoxGeometry(16.1, 10, 0.3), blackMat);
        facade.position.set(0, 5, 6.1);
        group.add(facade);

        // Glass storefront
        const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), glassMat);
        glassPane.position.set(0, 4.5, 6.25);
        group.add(glassPane);

        // Red accent line on facade
        const accent = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.15, 0.35), redMat);
        accent.position.set(0, 8.5, 6.1);
        group.add(accent);
        const accent2 = accent.clone();
        accent2.position.y = 1;
        group.add(accent2);

        // Roof overhang
        const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.3, 3), blackMat);
        roof.position.set(0, 10.15, 7);
        roof.castShadow = true;
        group.add(roof);

        // Store sign
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, 512, 128);
        ctx.font = 'bold 52px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DJI 13STORE', 256, 55);
        ctx.font = '28px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#e2001a';
        ctx.fillText(`สาขา${branchName}`, 256, 95);

        const signTex = new THREE.CanvasTexture(canvas);
        const signMat = new THREE.MeshStandardMaterial({
            map: signTex, transparent: true, roughness: 0.3,
        });
        const storeSign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), signMat);
        storeSign.position.set(0, 9, 6.3);
        group.add(storeSign);

        // Interior floor
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.4 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(15, 11), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.05;
        floor.receiveShadow = true;
        group.add(floor);

        // Interior lighting
        const interiorLight = new THREE.PointLight(0xffffff, 1.2, 20);
        interiorLight.position.set(0, 9, 0);
        group.add(interiorLight);

        // Side walls (only left/right, front is glass)
        for (const side of [-1, 1]) {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10, 12), whiteMat);
            wall.position.set(side * 8, 5, 0);
            group.add(wall);
        }

        group.position.set(x, y, z);
        group.rotation.y = ry;
        this.scene.add(group);

        // Collider
        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(x - 8.5, 0, z - 6.5),
            new THREE.Vector3(x + 8.5, 11, z + 6.5)
        ));
    }

    /* =================== DRONE OUTDOOR DISPLAY =================== */
    _createDroneDisplayZone() {
        // Circular display platform
        const platMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a, roughness: 0.3, metalness: 0.4,
        });
        const platform = new THREE.Mesh(new THREE.CylinderGeometry(18, 19, 0.4, 48), platMat);
        platform.position.set(0, 0.2, 30);
        platform.receiveShadow = true;
        this.scene.add(platform);

        // "DRONE GALLERY" label
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 36px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e2001a';
        ctx.fillText('✦ DRONE GALLERY ✦', 256, 42);
        const tex = new THREE.CanvasTexture(canvas);
        const labelMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const label = new THREE.Sprite(labelMat);
        label.position.set(0, 4, 18);
        label.scale.set(6, 0.75, 1);
        this.scene.add(label);
    }

    /* =================== FPV ARENA =================== */
    _createFPVArena() {
        const group = new THREE.Group();
        const gateMat = new THREE.MeshStandardMaterial({
            color: 0xe2001a, emissive: 0xe2001a, emissiveIntensity: 0.3,
            roughness: 0.4, metalness: 0.3,
        });
        const fenceMat = new THREE.MeshStandardMaterial({
            color: 0x444444, roughness: 0.5, metalness: 0.6,
        });

        // Arena floor
        const arenaFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 30),
            new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.6, metalness: 0.2 })
        );
        arenaFloor.rotation.x = -Math.PI / 2;
        arenaFloor.position.y = 0.03;
        arenaFloor.receiveShadow = true;
        group.add(arenaFloor);

        // Race gates (hoops)
        const gatePositions = [
            [0, 3, -5], [-8, 4, 0], [8, 3, 5],
            [0, 5, 10], [-10, 3, -8], [10, 4, -3],
        ];
        gatePositions.forEach(([gx, gy, gz]) => {
            const gate = new THREE.Mesh(new THREE.TorusGeometry(2, 0.15, 8, 16), gateMat);
            gate.position.set(gx, gy, gz);
            gate.rotation.y = Math.random() * 0.5;
            group.add(gate);
        });

        // Ramps
        const rampMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.3 });
        const rampGeo = new THREE.BoxGeometry(4, 0.3, 6);
        [[-12, 0.5, -5, 0.15], [12, 0.5, 5, -0.15]].forEach(([rx, ry, rz, rot]) => {
            const ramp = new THREE.Mesh(rampGeo, rampMat);
            ramp.position.set(rx, ry, rz);
            ramp.rotation.x = rot;
            ramp.castShadow = true;
            group.add(ramp);
        });

        // Fence posts
        for (let i = -20; i <= 20; i += 4) {
            for (const [fx, fz] of [[i, -15], [i, 15]]) {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), fenceMat);
                post.position.set(fx, 1.5, fz);
                group.add(post);
            }
            for (const [fx, fz] of [[-20, i * 15 / 20], [20, i * 15 / 20]]) {
                if (Math.abs(i * 15 / 20) <= 15) {
                    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), fenceMat);
                    post.position.set(fx, 1.5, fz);
                    group.add(post);
                }
            }
        }

        // Fence wires
        for (let h = 0.5; h <= 2.5; h += 1) {
            for (const fz of [-15, 15]) {
                const wire = new THREE.Mesh(new THREE.BoxGeometry(40, 0.03, 0.03), fenceMat);
                wire.position.set(0, h, fz);
                group.add(wire);
            }
            for (const fx of [-20, 20]) {
                const wire = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 30), fenceMat);
                wire.position.set(fx, h, 0);
                group.add(wire);
            }
        }

        // Arena sign
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 512;
        signCanvas.height = 128;
        const sctx = signCanvas.getContext('2d');
        sctx.fillStyle = '#1a1a1a';
        sctx.fillRect(0, 0, 512, 128);
        sctx.font = 'bold 44px Inter, system-ui, sans-serif';
        sctx.textAlign = 'center';
        sctx.fillStyle = '#e2001a';
        sctx.fillText('🏁 FPV RACING ARENA', 256, 55);
        sctx.font = '22px Inter, system-ui, sans-serif';
        sctx.fillStyle = '#ffffff';
        sctx.fillText('DJI FPV & Avata Experience Zone', 256, 95);

        const signTex = new THREE.CanvasTexture(signCanvas);
        const signBoard = new THREE.Mesh(
            new THREE.PlaneGeometry(6, 1.5),
            new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.3 })
        );
        signBoard.position.set(0, 4, -15.2);
        group.add(signBoard);

        group.position.set(0, 0, -60);
        this.scene.add(group);
    }

    /* =================== ENVIRONMENT =================== */
    _createEnvironment() {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9, metalness: 0 });

        // Trees around the world
        const treePos = [
            [-15, 15], [15, 15], [-15, -15], [15, -15],
            [-50, -50], [50, 50], [-50, 50], [50, -50],
            [-40, 10], [40, 10], [-10, 50], [10, 50],
            [-60, 30], [60, -30], [-30, 60], [30, -60],
            [-70, -10], [70, 10], [-10, -45], [10, -45],
            [-80, 40], [80, -40], [-40, 80], [40, -80],
        ];
        treePos.forEach(([x, z]) => {
            this._createTree(x + (Math.random() - 0.5) * 3, z + (Math.random() - 0.5) * 3, trunkMat);
        });

        // Benches near plaza
        [[-8, -8, 0.7], [8, -8, -0.7], [-8, 8, 2.4], [8, 8, -2.4]].forEach(([x, z, ry]) => {
            this._createBench(x, z, ry);
        });

        // Decorative rocks
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 200;
            const z = (Math.random() - 0.5) * 200;
            if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
            const scale = 0.3 + Math.random() * 0.7;
            const geo = new THREE.DodecahedronGeometry(scale, 1);
            const p = geo.attributes.position;
            for (let j = 0; j < p.count; j++) {
                p.setY(j, p.getY(j) * (0.5 + Math.random() * 0.3));
            }
            geo.computeVertexNormals();
            const rock = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0, 0, 0.35 + Math.random() * 0.15),
                roughness: 0.9, flatShading: true,
            }));
            rock.position.set(x, scale * 0.3, z);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.castShadow = true;
            this.scene.add(rock);
        }

        // Parking lot
        this._createParkingLot(60, 0, 30);
    }

    _createTree(x, z, trunkMat) {
        const g = new THREE.Group();
        const h = 3 + Math.random() * 2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, h, 6), trunkMat);
        trunk.position.y = h / 2;
        trunk.castShadow = true;
        g.add(trunk);

        const leafMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.28 + Math.random() * 0.05, 0.5, 0.3 + Math.random() * 0.1),
            roughness: 0.85, metalness: 0,
        });
        for (let i = 0; i < 4; i++) {
            const r = 1.2 + Math.random() * 1.2;
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), leafMat);
            leaf.position.set((Math.random() - 0.5) * 1.5, h + Math.random() * 1.5, (Math.random() - 0.5) * 1.5);
            leaf.castShadow = true;
            g.add(leaf);
        }
        g.position.set(x, 0, z);
        this.scene.add(g);
        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(x - 0.4, 0, z - 0.4),
            new THREE.Vector3(x + 0.4, h + 2, z + 0.4)
        ));
    }

    _createBench(x, z, ry) {
        const g = new THREE.Group();
        const wood = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });
        const metal = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 });
        for (let i = 0; i < 3; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(2, 0.07, 0.18), wood);
            p.position.set(0, 0.6, (i - 1) * 0.2);
            g.add(p);
        }
        for (const lx of [-0.7, 0.7]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.45), metal);
            leg.position.set(lx, 0.3, 0);
            g.add(leg);
        }
        g.position.set(x, 0, z);
        g.rotation.y = ry;
        this.scene.add(g);
    }

    _createParkingLot(x, y, z) {
        const lotMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7, metalness: 0.1 });
        const lot = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), lotMat);
        lot.rotation.x = -Math.PI / 2;
        lot.position.set(x, 0.02, z);
        lot.receiveShadow = true;
        this.scene.add(lot);

        // Parking lines
        const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        for (let i = 0; i < 5; i++) {
            const line = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 4), lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(x - 8 + i * 4, 0.03, z);
            this.scene.add(line);
        }
    }

    /* =================== LAMPS =================== */
    _createLamps() {
        const positions = [
            [-10, -18], [10, -18], [-18, -10], [18, -10],
            [-18, 10], [18, 10], [-10, 18], [10, 18],
            [-35, -30], [35, -30], [-35, 30], [35, 30],
            [-55, -55], [55, 55], [-55, 55], [55, -55],
        ];
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.8 });
        positions.forEach(([x, z]) => {
            const g = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 6), metalMat);
            pole.position.y = 2.5;
            pole.castShadow = true;
            g.add(pole);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.06), metalMat);
            arm.position.set(0.6, 5, 0);
            g.add(arm);
            const headMat = new THREE.MeshStandardMaterial({
                color: 0xfff8e1, emissive: 0xfff176, emissiveIntensity: 0.4, roughness: 0.3,
            });
            const head = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.3, 8), headMat);
            head.position.set(1.2, 4.9, 0);
            g.add(head);
            const pl = new THREE.PointLight(0xfff4d4, 0.5, 15);
            pl.position.set(1.2, 4.7, 0);
            g.add(pl);
            g.position.set(x, 0, z);
            this.scene.add(g);
        });
    }

    getColliders() {
        return this.colliders;
    }

    /**
     * Returns drone display pedestal positions for DroneModels to place drones on
     */
    getDroneDisplayPositions() {
        const center = new THREE.Vector3(0, 0, 30);
        const radius = 12;
        const count = 6;
        const positions = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            positions.push(new THREE.Vector3(
                center.x + Math.cos(angle) * radius,
                0.4,
                center.z + Math.sin(angle) * radius
            ));
        }
        return positions;
    }
}
