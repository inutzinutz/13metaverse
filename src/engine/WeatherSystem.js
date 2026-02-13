import * as THREE from 'three';

/**
 * WeatherSystem — Rain and fog particle effects
 */
export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.weather = 'clear'; // clear, rain, fog
        this.rainGroup = null;
        this.rainDrops = [];
        this._lastWeatherChange = 0;
        this._init();
    }

    _init() {
        // Rain particle system
        this.rainGroup = new THREE.Group();
        this.rainGroup.visible = false;
        this.scene.add(this.rainGroup);

        const rainMat = new THREE.MeshBasicMaterial({
            color: 0xaaccee, transparent: true, opacity: 0.5,
        });
        const rainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 3);

        for (let i = 0; i < 500; i++) {
            const drop = new THREE.Mesh(rainGeo, rainMat);
            drop.position.set(
                (Math.random() - 0.5) * 80,
                Math.random() * 30,
                (Math.random() - 0.5) * 80
            );
            this.rainGroup.add(drop);
            this.rainDrops.push(drop);
        }

        // Weather change timer (change weather every 45-90 seconds)
        this._scheduleWeatherChange();
    }

    _scheduleWeatherChange() {
        const delay = 45000 + Math.random() * 45000;
        setTimeout(() => {
            const weathers = ['clear', 'clear', 'clear', 'rain', 'fog'];
            this.setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
            this._scheduleWeatherChange();
        }, delay);
    }

    setWeather(weather) {
        if (this.weather === weather) return;
        this.weather = weather;

        switch (weather) {
            case 'rain':
                this.rainGroup.visible = true;
                if (this.scene.fog) {
                    this.scene.fog.density = Math.max(this.scene.fog.density, 0.006);
                }
                break;
            case 'fog':
                this.rainGroup.visible = false;
                if (this.scene.fog) {
                    this.scene.fog.density = 0.012;
                }
                break;
            case 'clear':
            default:
                this.rainGroup.visible = false;
                break;
        }
    }

    update(dt, playerPos) {
        if (this.weather === 'rain' && this.rainGroup.visible) {
            const px = playerPos?.x || 0;
            const pz = playerPos?.z || 0;

            this.rainDrops.forEach(drop => {
                drop.position.y -= dt * 18;
                if (drop.position.y < -1) {
                    drop.position.y = 25 + Math.random() * 10;
                    drop.position.x = px + (Math.random() - 0.5) * 80;
                    drop.position.z = pz + (Math.random() - 0.5) * 80;
                }
            });
        }
    }

    getWeatherLabel() {
        switch (this.weather) {
            case 'rain': return '🌧 ฝนตก';
            case 'fog': return '🌫 หมอก';
            default: return '☀️';
        }
    }
}
