import * as THREE from 'three';

/**
 * DroneModels — Procedural 3D DJI drone models
 * Creates realistic-looking drone meshes for showroom display
 */

const DRONE_CATALOG = [
    {
        id: 'mini4pro',
        name: 'DJI Mini 4 Pro',
        price: '฿27,990',
        specs: 'น้ำหนัก 249g | 4K/60fps HDR | ระยะบิน 20km | บิน 34 นาที',
        url: 'https://www.dji13store.com/product/dji-mini-4-pro-fly-more-combo-plus-dji-rc-2/',
        bodyColor: 0xd0d0d0,
        size: 0.7,
        type: 'mini',
    },
    {
        id: 'mavic3pro',
        name: 'DJI Mavic 3 Pro',
        price: '฿69,990',
        specs: '3 กล้อง Hasselblad | 4/3 CMOS | ระยะบิน 28km | บิน 43 นาที',
        url: 'https://www.dji13store.com/product/dji-mavic-3-pro-dji-rc/',
        bodyColor: 0x505050,
        size: 1.0,
        type: 'mavic',
    },
    {
        id: 'avata2',
        name: 'DJI Avata 2',
        price: '฿28,990',
        specs: 'FPV Drone | 4K/60fps | 1/1.3" CMOS | Goggles 3 | บิน 23 นาที',
        url: 'https://www.dji13store.com/product/dji-avata-2/',
        bodyColor: 0x2d2d2d,
        size: 0.8,
        type: 'fpv',
    },
    {
        id: 'air3',
        name: 'DJI Air 3',
        price: '฿37,990',
        specs: 'Dual Camera | 48MP | 4K/100fps HDR | ระยะบิน 20km | บิน 46 นาที',
        url: 'https://www.dji13store.com/product/dji-air-3/',
        bodyColor: 0x8a8a8a,
        size: 0.85,
        type: 'mavic',
    },
    {
        id: 'fpv',
        name: 'DJI FPV',
        price: '฿39,990',
        specs: 'Racing Drone | 4K/60fps | 140km/h | Goggles V2 | บิน 20 นาที',
        url: 'https://www.dji13store.com/',
        bodyColor: 0x1a1a1a,
        size: 0.9,
        type: 'fpv',
    },
    {
        id: 'neo',
        name: 'DJI Neo',
        price: '฿7,990',
        specs: 'Palm-sized | 4K Stabilized | AI Subject Tracking | 135g',
        url: 'https://www.dji13store.com/',
        bodyColor: 0xc8c8c8,
        size: 0.5,
        type: 'mini',
    },
    {
        id: 'pocket3',
        name: 'Osmo Pocket 3',
        price: '฿17,990',
        specs: '1" CMOS Sensor | 4K/120fps | 3-Axis Stabilization | Vertical Shooting',
        url: 'https://www.dji13store.com/product/dji-osmo-pocket-3/',
        bodyColor: 0x0a0a0a,
        size: 0.4,
        type: 'handheld',
    },
    {
        id: 'action4',
        name: 'Osmo Action 4',
        price: '฿11,500',
        specs: '1/1.3" Sensor | 4K/120fps | Waterproof 18m | Color Temp Sensor',
        url: 'https://www.dji13store.com/product/dji-osmo-action-4-standard-combo/',
        bodyColor: 0x0a0a0a,
        size: 0.35,
        type: 'handheld',
    }
];

export class DroneModels {
    constructor(scene) {
        this.scene = scene;
        this.displays = []; // { mesh, info, position }
        this.animTime = 0;
    }

    /**
     * Place drone on a display pedestal at given position
     */
    createDisplay(droneId, position, rotation = 0) {
        const catalog = DRONE_CATALOG.find(d => d.id === droneId);
        if (!catalog) return null;

        const group = new THREE.Group();

        // Display pedestal
        const pedestalMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, roughness: 0.2, metalness: 0.8,
        });
        const pedestalGeo = new THREE.CylinderGeometry(0.6, 0.7, 1.0, 24);
        const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
        pedestal.position.y = 0.5;
        pedestal.castShadow = true;
        pedestal.receiveShadow = true;
        group.add(pedestal);

        // Glass dome top
        const domeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 0.05, metalness: 0.1,
            transparent: true, opacity: 0.15,
        });
        const domeGeo = new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 1.0;
        group.add(dome);

        // LED ring
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xe2001a, emissive: 0xe2001a, emissiveIntensity: 0.6,
            roughness: 0.3, metalness: 0.5,
        });
        const ringGeo = new THREE.TorusGeometry(0.62, 0.03, 8, 32);
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 1.01;
        group.add(ring);

        // Drone model
        const drone = this._buildDrone(catalog);
        drone.position.y = 1.6;
        group.add(drone);

        // Spot light on drone
        const spot = new THREE.SpotLight(0xffffff, 1.5, 5, Math.PI / 6, 0.5);
        spot.position.set(0, 4, 0);
        spot.target = drone;
        group.add(spot);

        // Price tag
        this._createPriceTag(group, catalog);

        group.position.copy(position);
        group.rotation.y = rotation;
        this.scene.add(group);

        this.displays.push({
            group,
            drone,
            info: catalog,
            position: position.clone(),
        });

        return group;
    }

    _buildDrone(catalog) {
        const group = new THREE.Group();
        const s = catalog.size;
        const bodyMat = new THREE.MeshStandardMaterial({
            color: catalog.bodyColor, roughness: 0.3, metalness: 0.6,
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a, roughness: 0.4, metalness: 0.5,
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x1565c0, roughness: 0.05, metalness: 0.8,
            transparent: true, opacity: 0.5,
        });
        const propMat = new THREE.MeshStandardMaterial({
            color: 0x333333, roughness: 0.5, metalness: 0.3,
            transparent: true, opacity: 0.85,
        });

        // Body
        if (catalog.type === 'handheld') {
            if (catalog.id === 'pocket3') {
                // Pocket 3 Handle
                const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.7 * s, 0.12 * s), bodyMat);
                group.add(handle);
                // Gimbal Head
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.15 * s, 0.15 * s), bodyMat);
                head.position.y = 0.4 * s;
                group.add(head);
                // Lens
                const lens = new THREE.Mesh(new THREE.CircleGeometry(0.06 * s, 16), glassMat);
                lens.position.set(0, 0.4 * s, 0.08 * s);
                group.add(lens);
                // Rotating Screen
                const screen = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.12 * s, 0.02 * s), glassMat);
                screen.position.set(0, 0.05 * s, 0.07 * s);
                group.add(screen);
            } else {
                // Action 4 Body
                const actionBody = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.3 * s, 0.2 * s), bodyMat);
                group.add(actionBody);
                // Big Round Lens
                const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.05 * s, 16), glassMat);
                lens.rotation.x = Math.PI / 2;
                lens.position.set(-0.08 * s, 0, 0.12 * s);
                group.add(lens);
                // Front Screen
                const fScreen = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.12 * s, 0.02 * s), glassMat);
                fScreen.position.set(0.1 * s, 0, 0.11 * s);
                group.add(fScreen);
            }
            return group; // Skip arms/props for handheld
        }

        if (catalog.type === 'fpv') {
            // FPV: more aerodynamic body
            const bodyGeo = new THREE.CapsuleGeometry(0.18 * s, 0.4 * s, 8, 12);
            bodyGeo.rotateZ(Math.PI / 2);
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.castShadow = true;
            group.add(body);

            // Canopy
            const canopyGeo = new THREE.SphereGeometry(0.15 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
            const canopy = new THREE.Mesh(canopyGeo, glassMat);
            canopy.position.set(0.2 * s, 0.08 * s, 0);
            group.add(canopy);
        } else {
            // Standard drone body
            const bodyGeo = new THREE.BoxGeometry(0.5 * s, 0.1 * s, 0.35 * s);
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.castShadow = true;
            group.add(body);

            // Camera gimbal
            const gimbalGeo = new THREE.SphereGeometry(0.06 * s, 8, 6);
            const gimbal = new THREE.Mesh(gimbalGeo, darkMat);
            gimbal.position.set(0.2 * s, -0.08 * s, 0);
            group.add(gimbal);

            // Camera lens
            const lensGeo = new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.04 * s, 8);
            const lens = new THREE.Mesh(lensGeo, glassMat);
            lens.rotation.z = Math.PI / 2;
            lens.position.set(0.27 * s, -0.08 * s, 0);
            group.add(lens);
        }

        // Arms and propellers (4)
        const armPositions = [
            [0.3 * s, 0, 0.25 * s],
            [0.3 * s, 0, -0.25 * s],
            [-0.3 * s, 0, 0.25 * s],
            [-0.3 * s, 0, -0.25 * s],
        ];

        armPositions.forEach(([ax, ay, az], i) => {
            // Arm
            const armLen = 0.2 * s;
            const armGeo = new THREE.BoxGeometry(armLen, 0.03 * s, 0.04 * s);
            const arm = new THREE.Mesh(armGeo, bodyMat);
            arm.position.set(ax * 0.5, ay + 0.02 * s, az);
            group.add(arm);

            // Motor housing
            const motorGeo = new THREE.CylinderGeometry(0.04 * s, 0.05 * s, 0.04 * s, 8);
            const motor = new THREE.Mesh(motorGeo, darkMat);
            motor.position.set(ax, ay + 0.04 * s, az);
            group.add(motor);

            // Propeller disc (translucent)
            const propGeo = new THREE.CircleGeometry(0.15 * s, 16);
            const prop = new THREE.Mesh(propGeo, propMat);
            prop.rotation.x = -Math.PI / 2;
            prop.position.set(ax, ay + 0.06 * s, az);
            prop.userData.propIndex = i;
            group.add(prop);
        });

        // Landing gear
        if (catalog.type !== 'fpv') {
            for (const side of [-1, 1]) {
                const legGeo = new THREE.BoxGeometry(0.03 * s, 0.08 * s, 0.25 * s);
                const leg = new THREE.Mesh(legGeo, darkMat);
                leg.position.set(side * 0.12 * s, -0.1 * s, 0);
                group.add(leg);
            }
        }

        return group;
    }

    _createPriceTag(parent, catalog) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = 'rgba(26, 26, 26, 0.9)';
        ctx.beginPath();
        ctx.roundRect(0, 0, 512, 128, 12);
        ctx.fill();

        // Red accent bar
        ctx.fillStyle = '#e2001a';
        ctx.fillRect(0, 0, 8, 128);

        // Name
        ctx.font = 'bold 28px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(catalog.name, 20, 40);

        // Price
        ctx.font = 'bold 32px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#e2001a';
        ctx.fillText(catalog.price, 20, 85);

        // "View" hint
        ctx.font = '18px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('เดินเข้าใกล้เพื่อดูรายละเอียด', 20, 115);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, 2.6, 0);
        sprite.scale.set(3, 0.75, 1);
        parent.add(sprite);
    }

    /**
     * Returns the closest drone display within range of playerPos
     */
    getClosestDisplay(playerPos, maxDistance = 4) {
        let closest = null;
        let closestDist = maxDistance;
        for (const display of this.displays) {
            const dist = playerPos.distanceTo(display.position);
            if (dist < closestDist) {
                closestDist = dist;
                closest = display;
            }
        }
        return closest;
    }

    /**
     * Animate all displayed drones (hover + spin)
     */
    update(dt) {
        this.animTime += dt;
        this.displays.forEach((d, i) => {
            // Gentle hover
            d.drone.position.y = 1.6 + Math.sin(this.animTime * 1.5 + i) * 0.08;
            // Slow rotation
            d.drone.rotation.y += dt * 0.4;
            // Propeller spin
            d.drone.children.forEach(child => {
                if (child.userData.propIndex !== undefined) {
                    child.rotation.z += dt * 15;
                }
            });
        });
    }

    /**
     * Updates the body color of a specific drone display
     */
    updateDisplayColor(display, hex) {
        display.drone.traverse(child => {
            if (child.isMesh && child.material && !child.material.transparent) {
                // We want to update the body and arms (which use the bodyColor)
                // but skip the darkMat and glassMat
                if (child.material.color.getHex() === display.info.bodyColor || child.userData.isBodyPart) {
                    child.material.color.setHex(hex);
                    child.userData.isBodyPart = true; // Mark it so subsequent updates work
                }
            }
        });
        display.info.bodyColor = hex; // Update ref to track current color
    }
}

export { DRONE_CATALOG };
