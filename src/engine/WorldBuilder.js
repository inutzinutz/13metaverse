import * as THREE from 'three';

/**
 * WorldBuilder — Realistic PBR environment
 * Natural materials, proper lighting, detailed geometry
 */
export class WorldBuilder {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this._textureLoader = new THREE.TextureLoader();
        this._build();
    }

    _build() {
        this._createSky();
        this._createGround();
        this._createSpawnPlaza();
        this._createBuildings();
        this._createTrees();
        this._createPaths();
        this._createLamps();
        this._createDecorations();
        this._createWater();
    }

    /* =================== SKY =================== */
    _createSky() {
        const skyGeo = new THREE.SphereGeometry(450, 64, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x3a8fd8) },
                horizonColor: { value: new THREE.Color(0xa7d8f0) },
                bottomColor: { value: new THREE.Color(0xdceaf5) },
                sunDirection: { value: new THREE.Vector3(0.4, 0.6, -0.3).normalize() },
                sunColor: { value: new THREE.Color(0xfff4e0) },
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 horizonColor;
                uniform vec3 bottomColor;
                uniform vec3 sunDirection;
                uniform vec3 sunColor;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition).y;
                    vec3 sky;
                    if (h > 0.0) {
                        sky = mix(horizonColor, topColor, pow(h, 0.5));
                    } else {
                        sky = mix(horizonColor, bottomColor, pow(-h, 0.3));
                    }
                    // Sun glow
                    vec3 viewDir = normalize(vWorldPosition);
                    float sunDot = max(dot(viewDir, sunDirection), 0.0);
                    sky += sunColor * pow(sunDot, 128.0) * 2.0;
                    sky += sunColor * pow(sunDot, 16.0) * 0.15;
                    gl_FragColor = vec4(sky, 1.0);
                }
            `,
            side: THREE.BackSide,
            depthWrite: false,
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));

        // Volumetric clouds
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 1, metalness: 0,
            transparent: true, opacity: 0.85,
        });
        for (let i = 0; i < 20; i++) {
            this._createCloud(
                (Math.random() - 0.5) * 350,
                55 + Math.random() * 30,
                (Math.random() - 0.5) * 350,
                cloudMat
            );
        }
    }

    _createCloud(x, y, z, mat) {
        const group = new THREE.Group();
        const count = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const w = 3 + Math.random() * 5;
            const h = 1.5 + Math.random() * 2;
            const d = 2 + Math.random() * 4;
            const geo = new THREE.SphereGeometry(1, 8, 6);
            geo.scale(w, h, d);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 4
            );
            group.add(mesh);
        }
        group.position.set(x, y, z);
        group.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(group);
    }

    /* =================== GROUND =================== */
    _createGround() {
        // Grass
        const grassGeo = new THREE.PlaneGeometry(200, 200, 64, 64);
        // Add slight terrain variation
        const posAttr = grassGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            // Keep center flat for spawn, add gentle hills at edges
            const dist = Math.sqrt(x * x + y * y);
            if (dist > 20) {
                const height = Math.sin(x * 0.05) * Math.cos(y * 0.07) * 1.5
                    + Math.sin(x * 0.12 + y * 0.08) * 0.5;
                posAttr.setZ(i, height * Math.min(1, (dist - 20) / 30));
            }
        }
        grassGeo.computeVertexNormals();

        const grassMat = new THREE.MeshStandardMaterial({
            color: 0x4a7c3f,
            roughness: 0.9,
            metalness: 0.0,
            flatShading: false,
        });
        const ground = new THREE.Mesh(grassGeo, grassMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Boundary walls (invisible)
        const bounds = [
            [0, 5, -100, 200, 10, 1],
            [0, 5, 100, 200, 10, 1],
            [-100, 5, 0, 1, 10, 200],
            [100, 5, 0, 1, 10, 200],
        ];
        bounds.forEach(([x, y, z, w, h, d]) => {
            this.colliders.push(new THREE.Box3(
                new THREE.Vector3(x - w / 2, 0, z - d / 2),
                new THREE.Vector3(x + w / 2, h, z + d / 2)
            ));
        });
    }

    /* =================== SPAWN PLAZA =================== */
    _createSpawnPlaza() {
        // Stone plaza
        const plazaMat = new THREE.MeshStandardMaterial({
            color: 0x9e9e9e, roughness: 0.7, metalness: 0.05,
        });
        const plazaGeo = new THREE.CircleGeometry(12, 48);
        const plaza = new THREE.Mesh(plazaGeo, plazaMat);
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.y = 0.03;
        plaza.receiveShadow = true;
        this.scene.add(plaza);

        // Decorative ring
        const ringGeo = new THREE.RingGeometry(11, 12, 48);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x607d8b, roughness: 0.4, metalness: 0.3,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.04;
        this.scene.add(ring);

        // Central fountain
        this._createFountain(0, 0, 0);

        // Welcome arch
        this._createArch(0, 0, -14);
    }

    _createFountain(x, y, z) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({
            color: 0x78909c, roughness: 0.5, metalness: 0.1,
        });

        // Base pool
        const poolGeo = new THREE.CylinderGeometry(3, 3.3, 0.8, 24);
        const pool = new THREE.Mesh(poolGeo, stoneMat);
        pool.position.y = 0.4;
        pool.castShadow = true;
        pool.receiveShadow = true;
        group.add(pool);

        // Water surface
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x4fc3f7, roughness: 0.1, metalness: 0.3,
            transparent: true, opacity: 0.7,
        });
        const waterGeo = new THREE.CircleGeometry(2.7, 24);
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = 0.75;
        group.add(water);

        // Pillar
        const pillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.5, 12);
        const pillar = new THREE.Mesh(pillarGeo, stoneMat);
        pillar.position.y = 1.8;
        pillar.castShadow = true;
        group.add(pillar);

        // Top bowl
        const bowlGeo = new THREE.CylinderGeometry(1, 0.5, 0.5, 16);
        const bowl = new THREE.Mesh(bowlGeo, stoneMat);
        bowl.position.y = 3.1;
        bowl.castShadow = true;
        group.add(bowl);

        group.position.set(x, y, z);
        this.scene.add(group);

        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(x - 3.5, 0, z - 3.5),
            new THREE.Vector3(x + 3.5, 4, z + 3.5)
        ));
    }

    _createArch(x, y, z) {
        const group = new THREE.Group();
        const stoneMat = new THREE.MeshStandardMaterial({
            color: 0xbcaaa4, roughness: 0.6, metalness: 0.05,
        });

        // Left pillar
        const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 6, 12);
        const left = new THREE.Mesh(pillarGeo, stoneMat);
        left.position.set(-3, 3, 0);
        left.castShadow = true;
        group.add(left);

        // Right pillar
        const right = left.clone();
        right.position.x = 3;
        group.add(right);

        // Arch top
        const archGeo = new THREE.BoxGeometry(7, 0.8, 1.2);
        const arch = new THREE.Mesh(archGeo, stoneMat);
        arch.position.y = 6.2;
        arch.castShadow = true;
        group.add(arch);

        // Sign plate
        const plateMat = new THREE.MeshStandardMaterial({
            color: 0x1565c0, roughness: 0.3, metalness: 0.4,
        });
        const plateGeo = new THREE.BoxGeometry(5, 1, 0.15);
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.set(0, 5, 0.6);
        group.add(plate);

        group.position.set(x, y, z);
        this.scene.add(group);

        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(x - 3.7, 0, z - 0.8),
            new THREE.Vector3(x - 2.3, 7, z + 0.8)
        ));
        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(x + 2.3, 0, z - 0.8),
            new THREE.Vector3(x + 3.7, 7, z + 0.8)
        ));
    }

    /* =================== BUILDINGS =================== */
    _createBuildings() {
        const configs = [
            // Modern office buildings
            { pos: [-22, 0, -22], size: [10, 16, 10], color: 0xeceff1, accent: 0x37474f, style: 'modern' },
            { pos: [22, 0, -22], size: [12, 22, 10], color: 0xcfd8dc, accent: 0x263238, style: 'modern' },
            { pos: [-22, 0, 24], size: [10, 12, 12], color: 0xfafafa, accent: 0x455a64, style: 'modern' },
            { pos: [24, 0, 22], size: [14, 18, 10], color: 0xe8eaf6, accent: 0x1a237e, style: 'modern' },
            // Residential
            { pos: [-45, 0, -38], size: [10, 10, 8], color: 0xd7ccc8, accent: 0x5d4037, style: 'residential' },
            { pos: [45, 0, -35], size: [12, 8, 10], color: 0xfbe9e7, accent: 0xbf360c, style: 'residential' },
            { pos: [-42, 0, 42], size: [9, 11, 9], color: 0xe8f5e9, accent: 0x2e7d32, style: 'residential' },
            { pos: [42, 0, 45], size: [11, 9, 10], color: 0xfff3e0, accent: 0xe65100, style: 'residential' },
            // Tall skyscrapers
            { pos: [-60, 0, 5], size: [10, 30, 10], color: 0xb0bec5, accent: 0x546e7a, style: 'skyscraper' },
            { pos: [62, 0, -5], size: [12, 35, 12], color: 0x90a4ae, accent: 0x37474f, style: 'skyscraper' },
            { pos: [5, 0, -55], size: [14, 25, 10], color: 0xc5cae9, accent: 0x283593, style: 'modern' },
            { pos: [-5, 0, 58], size: [10, 20, 12], color: 0xb2dfdb, accent: 0x00695c, style: 'modern' },
        ];

        configs.forEach(cfg => this._createBuilding(cfg));
    }

    _createBuilding(cfg) {
        const { pos, size, color, accent, style } = cfg;
        const group = new THREE.Group();

        const wallMat = new THREE.MeshStandardMaterial({
            color, roughness: 0.7, metalness: 0.05,
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: accent, roughness: 0.4, metalness: 0.2,
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x90caf9, roughness: 0.1, metalness: 0.8,
            transparent: true, opacity: 0.6,
            envMapIntensity: 1.5,
        });

        // Main body
        const bodyGeo = new THREE.BoxGeometry(size[0], size[1], size[2]);
        const body = new THREE.Mesh(bodyGeo, wallMat);
        body.position.y = size[1] / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        if (style === 'skyscraper') {
            // Glass curtain wall facade
            const windowRows = Math.floor(size[1] / 2.5);
            const windowCols = Math.floor(size[0] / 2);
            for (let r = 0; r < windowRows; r++) {
                for (let c = 0; c < windowCols; c++) {
                    const winGeo = new THREE.PlaneGeometry(1.5, 2);
                    const win = new THREE.Mesh(winGeo, glassMat);
                    win.position.set(
                        (c - (windowCols - 1) / 2) * 2,
                        1.5 + r * 2.5,
                        size[2] / 2 + 0.05
                    );
                    group.add(win);
                }
            }
            // Roof antenna
            const antennaGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 6);
            const antenna = new THREE.Mesh(antennaGeo, accentMat);
            antenna.position.y = size[1] + 2;
            antenna.castShadow = true;
            group.add(antenna);
        } else if (style === 'modern') {
            // Horizontal strip windows
            const floors = Math.floor(size[1] / 3);
            for (let f = 0; f < floors; f++) {
                const stripGeo = new THREE.BoxGeometry(size[0] - 1, 1.2, 0.1);
                const strip = new THREE.Mesh(stripGeo, glassMat);
                strip.position.set(0, 2 + f * 3, size[2] / 2 + 0.05);
                group.add(strip);
                const stripBack = strip.clone();
                stripBack.position.z = -size[2] / 2 - 0.05;
                group.add(stripBack);
            }
            // Roof ledge
            const ledgeGeo = new THREE.BoxGeometry(size[0] + 0.5, 0.4, size[2] + 0.5);
            const ledge = new THREE.Mesh(ledgeGeo, accentMat);
            ledge.position.y = size[1] + 0.2;
            group.add(ledge);
        } else {
            // Residential: individual windows
            const floors = Math.floor(size[1] / 3);
            for (let f = 0; f < floors; f++) {
                for (let w = 0; w < 2; w++) {
                    const winGeo = new THREE.BoxGeometry(1.2, 1.4, 0.1);
                    const win = new THREE.Mesh(winGeo, glassMat);
                    win.position.set((w - 0.5) * 2.5, 2 + f * 3, size[2] / 2 + 0.05);
                    group.add(win);
                }
            }
            // Pitched roof
            const roofShape = new THREE.Shape();
            roofShape.moveTo(-size[0] / 2 - 0.5, 0);
            roofShape.lineTo(0, 3);
            roofShape.lineTo(size[0] / 2 + 0.5, 0);
            const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
                depth: size[2] + 0.5, bevelEnabled: false
            });
            const roofMat = new THREE.MeshStandardMaterial({
                color: 0x795548, roughness: 0.8, metalness: 0.05,
            });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.set(0, size[1], -size[2] / 2 - 0.25);
            roof.castShadow = true;
            group.add(roof);
        }

        // Door
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x4e342e, roughness: 0.6, metalness: 0.1,
        });
        const doorGeo = new THREE.BoxGeometry(1.8, 2.8, 0.15);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.4, size[2] / 2 + 0.08);
        group.add(door);

        group.position.set(pos[0], pos[1], pos[2]);
        this.scene.add(group);

        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(pos[0] - size[0] / 2 - 0.5, 0, pos[2] - size[2] / 2 - 0.5),
            new THREE.Vector3(pos[0] + size[0] / 2 + 0.5, size[1] + 3, pos[2] + size[2] / 2 + 0.5)
        ));
    }

    /* =================== TREES =================== */
    _createTrees() {
        const positions = [
            [-10, -12], [10, -12], [-12, 10], [12, 10],
            [-30, -5], [30, 5], [-5, -30], [5, 30],
            [-50, -50], [50, 50], [-50, 50], [50, -50],
            [-35, 20], [35, -20], [15, -45], [-15, 45],
            [-70, -20], [70, 20], [-20, -70], [20, 70],
            [-55, 30], [55, -30], [30, -60], [-30, 60],
            [-80, 10], [80, -10], [10, 80], [-10, -80],
        ];
        positions.forEach(([x, z]) => {
            const type = Math.random() > 0.4 ? 'deciduous' : 'conifer';
            this._createTree(x + (Math.random() - 0.5) * 3, z + (Math.random() - 0.5) * 3, type);
        });
    }

    _createTree(x, z, type) {
        const group = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({
            color: 0x5d4037, roughness: 0.9, metalness: 0,
        });

        if (type === 'deciduous') {
            const trunkH = 3 + Math.random() * 2;
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, trunkH, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = trunkH / 2;
            trunk.castShadow = true;
            group.add(trunk);

            // Lush foliage spheres
            const leafMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.5 + Math.random() * 0.2, 0.35 + Math.random() * 0.1),
                roughness: 0.85, metalness: 0,
            });
            const foliageCount = 4 + Math.floor(Math.random() * 3);
            for (let i = 0; i < foliageCount; i++) {
                const r = 1.5 + Math.random() * 1.5;
                const geo = new THREE.SphereGeometry(r, 8, 6);
                const leaf = new THREE.Mesh(geo, leafMat);
                leaf.position.set(
                    (Math.random() - 0.5) * 2,
                    trunkH + Math.random() * 2,
                    (Math.random() - 0.5) * 2
                );
                leaf.castShadow = true;
                group.add(leaf);
            }
        } else {
            // Conifer / pine
            const trunkH = 1.5 + Math.random() * 1;
            const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, trunkH, 6);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = trunkH / 2;
            trunk.castShadow = true;
            group.add(trunk);

            const pineMat = new THREE.MeshStandardMaterial({
                color: 0x2e7d32, roughness: 0.8, metalness: 0,
            });
            const tiers = 3 + Math.floor(Math.random() * 2);
            for (let t = 0; t < tiers; t++) {
                const radius = 2.5 - t * 0.5;
                const h = 2;
                const coneGeo = new THREE.ConeGeometry(radius, h, 8);
                const cone = new THREE.Mesh(coneGeo, pineMat);
                cone.position.y = trunkH + t * 1.5 + 1;
                cone.castShadow = true;
                group.add(cone);
            }
        }

        group.position.set(x, 0, z);
        this.scene.add(group);

        this.colliders.push(new THREE.Box3(
            new THREE.Vector3(x - 0.5, 0, z - 0.5),
            new THREE.Vector3(x + 0.5, 6, z + 0.5)
        ));
    }

    /* =================== PATHS =================== */
    _createPaths() {
        const pathMat = new THREE.MeshStandardMaterial({
            color: 0x8d8d8d, roughness: 0.8, metalness: 0.02,
        });

        // Cross paths
        const paths = [
            [0, 0.02, -40, 4, 55], [0, 0.02, 40, 4, 55],
            [-40, 0.02, 0, 55, 4], [40, 0.02, 0, 55, 4],
        ];
        paths.forEach(([x, y, z, w, h]) => {
            const geo = new THREE.PlaneGeometry(w, h);
            const mesh = new THREE.Mesh(geo, pathMat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(x, y, z);
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        });

        // Path edges (curbs)
        const curbMat = new THREE.MeshStandardMaterial({
            color: 0x757575, roughness: 0.6, metalness: 0.05,
        });
        paths.forEach(([x, y, z, w, h]) => {
            const isHorizontal = w > h;
            for (let side = -1; side <= 1; side += 2) {
                const curbGeo = new THREE.BoxGeometry(
                    isHorizontal ? h : 0.15,
                    0.1,
                    isHorizontal ? 0.15 : w
                );
                const curb = new THREE.Mesh(curbGeo, curbMat);
                if (isHorizontal) {
                    curb.position.set(x, 0.07, z + side * (h / 2 + 0.07));
                } else {
                    curb.position.set(x + side * (w / 2 + 0.07), 0.07, z);
                }
                this.scene.add(curb);
            }
        });
    }

    /* =================== LAMPS =================== */
    _createLamps() {
        const positions = [
            [-8, -15], [8, -15], [-8, 15], [8, 15],
            [-15, -8], [15, -8], [-15, 8], [15, 8],
            [-30, -30], [30, -30], [-30, 30], [30, 30],
        ];
        positions.forEach(([x, z]) => this._createLamp(x, z));
    }

    _createLamp(x, z) {
        const group = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x424242, roughness: 0.3, metalness: 0.8,
        });

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 5, 8);
        const pole = new THREE.Mesh(poleGeo, metalMat);
        pole.position.y = 2.5;
        pole.castShadow = true;
        group.add(pole);

        // Arm
        const armGeo = new THREE.BoxGeometry(1.5, 0.08, 0.08);
        const arm = new THREE.Mesh(armGeo, metalMat);
        arm.position.set(0.75, 5, 0);
        group.add(arm);

        // Lamp head
        const headMat = new THREE.MeshStandardMaterial({
            color: 0xfff8e1, roughness: 0.3, metalness: 0.2,
            emissive: 0xfff176, emissiveIntensity: 0.4,
        });
        const headGeo = new THREE.CylinderGeometry(0.5, 0.3, 0.4, 8);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(1.5, 4.9, 0);
        group.add(head);

        // Point light
        const pl = new THREE.PointLight(0xfff4d4, 0.6, 18);
        pl.position.set(1.5, 4.7, 0);
        pl.castShadow = false;
        group.add(pl);

        group.position.set(x, 0, z);
        this.scene.add(group);
    }

    /* =================== DECORATIONS =================== */
    _createDecorations() {
        // Benches
        const benchPositions = [
            [-6, -7, 0], [6, -7, Math.PI], [-7, 6, -Math.PI / 2], [7, 6, Math.PI / 2],
        ];
        benchPositions.forEach(([x, z, ry]) => this._createBench(x, z, ry));

        // Rocks
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 160;
            const z = (Math.random() - 0.5) * 160;
            if (Math.abs(x) < 16 && Math.abs(z) < 16) continue;
            this._createRock(x, z);
        }

        // Grass patches
        for (let i = 0; i < 40; i++) {
            const x = (Math.random() - 0.5) * 180;
            const z = (Math.random() - 0.5) * 180;
            if (Math.abs(x) < 16 && Math.abs(z) < 16) continue;
            this._createGrassPatch(x, z);
        }
    }

    _createBench(x, z, ry) {
        const group = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x6d4c41, roughness: 0.75, metalness: 0.05,
        });
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0x424242, roughness: 0.3, metalness: 0.8,
        });

        // Seat planks
        for (let i = 0; i < 3; i++) {
            const plankGeo = new THREE.BoxGeometry(2.2, 0.08, 0.2);
            const plank = new THREE.Mesh(plankGeo, woodMat);
            plank.position.set(0, 0.65, (i - 1) * 0.22);
            plank.castShadow = true;
            group.add(plank);
        }

        // Metal legs
        for (let lx = -0.8; lx <= 0.8; lx += 1.6) {
            const legGeo = new THREE.BoxGeometry(0.06, 0.65, 0.5);
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(lx, 0.32, 0);
            group.add(leg);
        }

        // Back rest
        for (let i = 0; i < 2; i++) {
            const backGeo = new THREE.BoxGeometry(2.2, 0.08, 0.15);
            const back = new THREE.Mesh(backGeo, woodMat);
            back.position.set(0, 0.9 + i * 0.2, -0.32);
            group.add(back);
        }

        group.position.set(x, 0, z);
        group.rotation.y = ry;
        this.scene.add(group);
    }

    _createRock(x, z) {
        const scale = 0.3 + Math.random() * 0.8;
        const geo = new THREE.DodecahedronGeometry(scale, 1);
        // Deform for natural look
        const posAttr = geo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            posAttr.setX(i, posAttr.getX(i) * (0.8 + Math.random() * 0.4));
            posAttr.setY(i, posAttr.getY(i) * (0.6 + Math.random() * 0.3));
            posAttr.setZ(i, posAttr.getZ(i) * (0.8 + Math.random() * 0.4));
        }
        geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0, 0, 0.4 + Math.random() * 0.15),
            roughness: 0.9, metalness: 0.05, flatShading: true,
        });
        const rock = new THREE.Mesh(geo, mat);
        rock.position.set(x, scale * 0.3, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        this.scene.add(rock);
    }

    _createGrassPatch(x, z) {
        const count = 3 + Math.floor(Math.random() * 5);
        const grassMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.28, 0.6, 0.3 + Math.random() * 0.15),
            roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
        });
        for (let i = 0; i < count; i++) {
            const h = 0.3 + Math.random() * 0.4;
            const bladeGeo = new THREE.PlaneGeometry(0.08, h);
            const blade = new THREE.Mesh(bladeGeo, grassMat);
            blade.position.set(
                x + (Math.random() - 0.5) * 1,
                h / 2,
                z + (Math.random() - 0.5) * 1
            );
            blade.rotation.y = Math.random() * Math.PI;
            this.scene.add(blade);
        }
    }

    /* =================== WATER =================== */
    _createWater() {
        // Small pond
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x1e88e5, roughness: 0.05, metalness: 0.6,
            transparent: true, opacity: 0.5,
        });
        const pondGeo = new THREE.CircleGeometry(5, 32);
        const pond = new THREE.Mesh(pondGeo, waterMat);
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(35, 0.05, 35);
        this.scene.add(pond);

        // Pond edge rocks
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const r = 5 + Math.random() * 0.5;
            this._createRock(35 + Math.cos(angle) * r, 35 + Math.sin(angle) * r);
        }
    }

    getColliders() {
        return this.colliders;
    }
}
