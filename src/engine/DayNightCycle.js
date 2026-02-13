import * as THREE from 'three';

/**
 * DayNightCycle — Animated sky colors, lighting, and fog shifts
 * 5-minute full cycle: dawn → day → dusk → night → dawn
 */
export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.time = 0.25; // Start at morning (0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk)
        this.speed = 1 / 300; // Full cycle = 300 seconds (5 min)
        this.sunLight = null;
        this.ambientLight = null;
        this._init();
    }

    _init() {
        // Sun directional light
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
        this.sunLight.position.set(30, 50, -20);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.sunLight.shadow.camera.near = 1;
        this.sunLight.shadow.camera.far = 150;
        this.sunLight.shadow.camera.left = -60;
        this.sunLight.shadow.camera.right = 60;
        this.sunLight.shadow.camera.top = 60;
        this.sunLight.shadow.camera.bottom = -60;
        this.scene.add(this.sunLight);

        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
        this.scene.add(this.ambientLight);

        // Hemisphere light for sky contribution
        this.hemiLight = new THREE.HemisphereLight(0x8888cc, 0x444422, 0.3);
        this.scene.add(this.hemiLight);

        // Fog
        this.scene.fog = new THREE.FogExp2(0x88aacc, 0.004);
    }

    update(dt) {
        this.time += this.speed * dt;
        if (this.time > 1) this.time -= 1;

        const t = this.time;
        // Sun angle (0=below, 0.5=zenith)
        const sunAngle = Math.sin(t * Math.PI * 2) * Math.PI * 0.5;
        const sunY = Math.sin(sunAngle);
        const sunX = Math.cos(sunAngle) * 0.7;

        this.sunLight.position.set(sunX * 80, Math.max(sunY * 80, 5), -30);

        // Daylight factor (0 = night, 1 = noon)
        const dayFactor = Math.max(0, sunY);

        // Sun color (warm at dawn/dusk, white at noon)
        const warmth = 1 - Math.abs(t - 0.5) * 4;
        const sunColor = new THREE.Color().setHSL(
            0.1 * Math.max(0, 1 - warmth * 0.5),
            0.3 + warmth * 0.3,
            0.5 + dayFactor * 0.5
        );
        this.sunLight.color.copy(sunColor);
        this.sunLight.intensity = 0.3 + dayFactor * 1.5;

        // Ambient
        this.ambientLight.intensity = 0.15 + dayFactor * 0.4;
        const ambColor = new THREE.Color().lerpColors(
            new THREE.Color(0x101030), // night
            new THREE.Color(0x606080), // day
            dayFactor
        );
        this.ambientLight.color.copy(ambColor);

        // Hemisphere
        this.hemiLight.intensity = 0.1 + dayFactor * 0.4;

        // Fog color follows sky
        const fogColor = new THREE.Color().lerpColors(
            new THREE.Color(0x0a0a1a), // night fog
            new THREE.Color(0x88aacc), // day fog
            dayFactor
        );
        if (this.scene.fog) {
            this.scene.fog.color.copy(fogColor);
            this.scene.fog.density = 0.003 + (1 - dayFactor) * 0.002;
        }

        // Update sky sphere if exists
        this._updateSky(dayFactor, t);
    }

    _updateSky(dayFactor, t) {
        // Find sky sphere (the large BackSide sphere)
        const skyMesh = this.scene.children.find(c =>
            c.isMesh && c.geometry?.parameters?.radius > 400
        );
        if (skyMesh && skyMesh.material.uniforms) {
            const topColor = new THREE.Color().lerpColors(
                new THREE.Color(0x050510),
                new THREE.Color(0x1a2a4a),
                dayFactor
            );
            const horizonColor = new THREE.Color().lerpColors(
                new THREE.Color(0x1a1020),
                new THREE.Color(0x4a7aaa),
                dayFactor
            );
            skyMesh.material.uniforms.topColor.value.copy(topColor);
            skyMesh.material.uniforms.horizonColor.value.copy(horizonColor);
        }
    }

    /**
     * Get current time label
     */
    getTimeLabel() {
        const hour = Math.floor(this.time * 24);
        const min = Math.floor((this.time * 24 - hour) * 60);
        return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    }

    /**
     * Get if it's nighttime
     */
    isNight() {
        return this.time < 0.2 || this.time > 0.8;
    }
}
