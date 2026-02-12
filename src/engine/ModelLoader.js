import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

export class ModelLoader {
    constructor() {
        this.objLoader = new OBJLoader();
        this.mtlLoader = new MTLLoader();
    }

    /**
     * Load an OBJ file from a File object
     * @param {File} objFile - The .obj File object
     * @param {File|null} mtlFile - Optional .mtl File object
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<THREE.Group>}
     */
    async loadFromFile(objFile, mtlFile = null, onProgress = () => { }) {
        onProgress(5);

        let materials = null;

        // Load MTL if provided
        if (mtlFile) {
            try {
                const mtlText = await this._readFileAsText(mtlFile);
                onProgress(20);
                materials = this.mtlLoader.parse(mtlText, '');
                materials.preload();
                this.objLoader.setMaterials(materials);
            } catch (err) {
                console.warn('Failed to load MTL, using default material:', err);
            }
        }

        onProgress(30);

        // Load OBJ
        const objText = await this._readFileAsText(objFile);
        onProgress(60);

        const object = this.objLoader.parse(objText);
        onProgress(80);

        // Apply default material if none loaded
        if (!materials) {
            const defaultMaterial = new THREE.MeshStandardMaterial({
                color: 0x7c8ea6,
                metalness: 0.3,
                roughness: 0.55,
                side: THREE.DoubleSide,
                flatShading: false
            });

            object.traverse((child) => {
                if (child.isMesh) {
                    // Keep existing material colors if they exist, otherwise use default
                    if (!child.material || (child.material.color && child.material.color.getHex() === 0xffffff)) {
                        child.material = defaultMaterial.clone();
                    } else {
                        // Upgrade to MeshStandardMaterial if basic
                        if (child.material.isMeshBasicMaterial || child.material.isMeshPhongMaterial) {
                            const oldMat = child.material;
                            const newMat = new THREE.MeshStandardMaterial({
                                color: oldMat.color || 0x7c8ea6,
                                metalness: 0.3,
                                roughness: 0.55,
                                side: THREE.DoubleSide,
                                map: oldMat.map || null
                            });
                            child.material = newMat;
                            oldMat.dispose();
                        }
                    }
                }
            });
        }

        // Compute normals if missing
        object.traverse((child) => {
            if (child.isMesh && child.geometry) {
                if (!child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals();
                }
            }
        });

        onProgress(100);

        // Reset OBJLoader materials for next load
        this.objLoader = new OBJLoader();

        return object;
    }

    _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
}
