import { TransformControls as ThreeTransformControls } from 'three/addons/controls/TransformControls.js';

export class TransformControlsWrapper {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.controls = new ThreeTransformControls(
            sceneManager.camera,
            sceneManager.renderer.domElement
        );
        this.controls.setSize(0.75);
        this.mode = 'translate';
        this.enabled = false;

        // Prevent orbit controls while transforming
        this.controls.addEventListener('dragging-changed', (event) => {
            sceneManager.controls.enabled = !event.value;
        });

        // Property change callback
        this.controls.addEventListener('objectChange', () => {
            if (this.onObjectChange) {
                this.onObjectChange(this.controls.object);
            }
        });

        sceneManager.scene.add(this.controls);
    }

    attach(object) {
        if (object) {
            this.controls.attach(object);
            this.enabled = true;
        }
    }

    detach() {
        this.controls.detach();
        this.enabled = false;
    }

    setMode(mode) {
        if (['translate', 'rotate', 'scale'].includes(mode)) {
            this.mode = mode;
            this.controls.setMode(mode);
        }
    }

    getMode() {
        return this.mode;
    }

    dispose() {
        this.controls.dispose();
        this.sceneManager.scene.remove(this.controls);
    }
}
