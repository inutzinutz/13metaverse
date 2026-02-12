import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.models = [];
        this.selectedObject = null;
        this.gridVisible = true;
        this.wireframeMode = false;
        this.fps = 0;
        this._frameCount = 0;
        this._lastFpsTime = performance.now();
        this.onFpsUpdate = null;

        this._initRenderer();
        this._initCamera();
        this._initControls();
        this._initLights();
        this._initGrid();
        this._initEnvironment();
        this._onResize = this._onResize.bind(this);
        window.addEventListener('resize', this._onResize);
        this._onResize();
        this._animate = this._animate.bind(this);
        requestAnimationFrame(this._animate);
    }

    _initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearColor(0x0a0e1a, 1);
    }

    _initCamera() {
        const container = this.canvas.parentElement;
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
        this.camera.position.set(5, 4, 8);
        this.camera.lookAt(0, 0, 0);
    }

    _initControls() {
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI * 0.95;
        this.controls.target.set(0, 0, 0);
    }

    _initLights() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambient);

        // Hemisphere
        const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1e, 0.5);
        this.scene.add(hemi);

        // Main directional
        const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
        dirLight.position.set(8, 12, 6);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x8ec8f4, 0.4);
        fillLight.position.set(-6, 4, -4);
        this.scene.add(fillLight);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.3);
        rimLight.position.set(0, 2, -10);
        this.scene.add(rimLight);
    }

    _initGrid() {
        // Custom grid
        this.gridHelper = new THREE.GridHelper(30, 30, 0x1e3a5f, 0x0f1a2e);
        this.gridHelper.material.opacity = 0.6;
        this.gridHelper.material.transparent = true;
        this.scene.add(this.gridHelper);

        // Ground plane for shadow
        const groundGeo = new THREE.PlaneGeometry(30, 30);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
    }

    _initEnvironment() {
        // Subtle fog for depth
        this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.015);
    }

    _onResize() {
        const container = this.canvas.parentElement;
        const w = container.clientWidth;
        const h = container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    _animate() {
        requestAnimationFrame(this._animate);

        // FPS counter
        this._frameCount++;
        const now = performance.now();
        const elapsed = now - this._lastFpsTime;
        if (elapsed >= 500) {
            this.fps = Math.round((this._frameCount * 1000) / elapsed);
            this._frameCount = 0;
            this._lastFpsTime = now;
            if (this.onFpsUpdate) this.onFpsUpdate(this.fps);
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    addModel(object, name) {
        // Auto-center and scale
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 5 / maxDim : 1;

        object.position.sub(center);
        object.position.multiplyScalar(scale);
        object.scale.multiplyScalar(scale);

        // Enable shadows
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => { m.side = THREE.DoubleSide; });
                    } else {
                        child.material.side = THREE.DoubleSide;
                    }
                }
            }
        });

        object.userData.displayName = name;
        this.scene.add(object);
        this.models.push(object);

        // Focus camera
        this._focusOn(object);

        return object;
    }

    removeModel(object) {
        this.scene.remove(object);
        this.models = this.models.filter(m => m !== object);
        object.traverse((child) => {
            if (child.isMesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material?.dispose();
                }
            }
        });
        if (this.selectedObject === object) {
            this.selectedObject = null;
        }
    }

    selectObject(object) {
        // Remove previous selection highlight
        if (this.selectedObject) {
            this.selectedObject.traverse((child) => {
                if (child.isMesh && child.userData._originalEmissive !== undefined) {
                    child.material.emissive?.setHex(child.userData._originalEmissive);
                }
            });
        }

        this.selectedObject = object;

        if (object) {
            object.traverse((child) => {
                if (child.isMesh && child.material?.emissive) {
                    child.userData._originalEmissive = child.material.emissive.getHex();
                    child.material.emissive.setHex(0x1a3a5f);
                }
            });
        }
    }

    _focusOn(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;

        this.controls.target.copy(center);
        this.camera.position.set(
            center.x + distance * 0.7,
            center.y + distance * 0.5,
            center.z + distance * 0.7
        );
        this.camera.lookAt(center);
    }

    toggleGrid() {
        this.gridVisible = !this.gridVisible;
        this.gridHelper.visible = this.gridVisible;
        return this.gridVisible;
    }

    toggleWireframe() {
        this.wireframeMode = !this.wireframeMode;
        this.models.forEach((model) => {
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => { m.wireframe = this.wireframeMode; });
                    } else {
                        child.material.wireframe = this.wireframeMode;
                    }
                }
            });
        });
        return this.wireframeMode;
    }

    getVertexCount() {
        let count = 0;
        this.models.forEach(model => {
            model.traverse(child => {
                if (child.isMesh && child.geometry) {
                    count += child.geometry.attributes.position?.count || 0;
                }
            });
        });
        return count;
    }

    getObjectCount() {
        return this.models.length;
    }
}
