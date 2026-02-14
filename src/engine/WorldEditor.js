/**
 * WorldEditor — In-game admin tool for placing/editing 3D objects
 * Press P to toggle editor mode (admin only)
 */
import * as THREE from 'three';

const OBJECT_PALETTE = [
    { id: 'cube', name: '📦 กล่อง', geo: () => new THREE.BoxGeometry(1, 1, 1), color: 0xe2001a },
    { id: 'sphere', name: '🔴 ทรงกลม', geo: () => new THREE.SphereGeometry(0.6, 16, 16), color: 0x42a5f5 },
    { id: 'cylinder', name: '🔵 ทรงกระบอก', geo: () => new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16), color: 0x66bb6a },
    { id: 'display', name: '🖥 จอแสดงผล', geo: () => new THREE.BoxGeometry(2, 1.2, 0.08), color: 0x1a1a1a },
    { id: 'table', name: '🪑 โต๊ะ', geo: () => new THREE.BoxGeometry(2, 0.1, 1), color: 0x8d6e63 },
    { id: 'pedestal', name: '🏛 แท่นโชว์', geo: () => new THREE.CylinderGeometry(0.6, 0.7, 0.8, 8), color: 0x424242 },
    { id: 'wall', name: '🧱 กำแพง', geo: () => new THREE.BoxGeometry(4, 3, 0.2), color: 0x90a4ae },
    { id: 'sign', name: '🪧 ป้าย', geo: () => new THREE.BoxGeometry(2, 0.8, 0.05), color: 0xffffff },
    { id: 'cone', name: '🔺 กรวย', geo: () => new THREE.ConeGeometry(0.5, 1.2, 8), color: 0xff9800 },
    { id: 'light', name: '💡 ไฟ', geo: () => new THREE.SphereGeometry(0.3, 12, 12), color: 0xffeb3b, emissive: true },
];

export class WorldEditor {
    constructor(scene, camera, renderer, network) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.network = network;
        this.active = false;
        this.placedObjects = [];
        this.selectedObject = null;
        this.gizmoMode = 'translate'; // translate, rotate, scale
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();
        this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this._dragOffset = new THREE.Vector3();
        this._isDragging = false;

        this._createUI();
        this._bindEvents();
    }

    _createUI() {
        // Editor panel
        const panel = document.createElement('div');
        panel.id = 'world-editor-panel';
        panel.innerHTML = `
            <div class="we-header">
                <span>🏗️ World Editor</span>
                <button id="we-close">✕</button>
            </div>
            <div class="we-gizmo-bar">
                <button class="we-gizmo-btn active" data-mode="translate">↔ ย้าย</button>
                <button class="we-gizmo-btn" data-mode="rotate">↻ หมุน</button>
                <button class="we-gizmo-btn" data-mode="scale">⤢ ขนาด</button>
            </div>
            <div class="we-palette" id="we-palette"></div>
            <div class="we-actions">
                <button id="we-delete" class="we-action-btn we-danger">🗑 ลบ</button>
                <button id="we-duplicate" class="we-action-btn">📋 คัดลอก</button>
                <button id="we-save" class="we-action-btn we-primary">💾 บันทึก</button>
            </div>
            <div class="we-info" id="we-info">เลือกวัตถุจากรายการแล้วคลิกในโลก</div>
        `;
        document.body.appendChild(panel);

        // Add palette items
        const palette = document.getElementById('we-palette');
        OBJECT_PALETTE.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'we-palette-item';
            btn.dataset.id = item.id;
            btn.innerHTML = `<span>${item.name}</span>`;
            btn.addEventListener('click', () => this._spawnObject(item));
            palette.appendChild(btn);
        });

        // Styles
        const style = document.createElement('style');
        style.textContent = `
            #world-editor-panel {
                display: none;
                position: fixed; top: 80px; left: 16px;
                width: 220px; max-height: 80vh;
                background: rgba(20,20,20,0.92);
                border: 1px solid rgba(226,0,26,0.5);
                border-radius: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                z-index: 600;
                overflow-y: auto;
                backdrop-filter: blur(8px);
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            }
            #world-editor-panel.open { display: block; }
            .we-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 14px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                font-weight: 600; font-size: 14px;
            }
            .we-header button { background: none; border: none; color: #aaa; cursor: pointer; font-size: 16px; }
            .we-gizmo-bar {
                display: flex; gap: 4px; padding: 8px 10px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .we-gizmo-btn {
                flex: 1; padding: 5px 4px; font-size: 11px;
                background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px; color: #ccc; cursor: pointer;
            }
            .we-gizmo-btn.active { background: rgba(226,0,26,0.3); border-color: #e2001a; color: #fff; }
            .we-palette { padding: 8px 10px; display: flex; flex-wrap: wrap; gap: 4px; }
            .we-palette-item {
                width: calc(50% - 2px); padding: 6px 4px; font-size: 11px;
                background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px; color: #ddd; cursor: pointer; text-align: center;
            }
            .we-palette-item:hover { background: rgba(226,0,26,0.2); border-color: rgba(226,0,26,0.4); }
            .we-actions {
                display: flex; gap: 4px; padding: 8px 10px;
                border-top: 1px solid rgba(255,255,255,0.05);
            }
            .we-action-btn {
                flex: 1; padding: 6px 4px; font-size: 11px;
                background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px; color: #ccc; cursor: pointer;
            }
            .we-danger { color: #ef5350; border-color: rgba(239,83,80,0.3); }
            .we-primary { color: #4fc3f7; border-color: rgba(79,195,247,0.3); }
            .we-action-btn:hover { background: rgba(255,255,255,0.12); }
            .we-info { padding: 6px 14px 10px; font-size: 10px; color: #888; }

            .we-selection-ring {
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
        this.panel = panel;
    }

    _bindEvents() {
        document.getElementById('we-close').addEventListener('click', () => this.toggle(false));
        document.getElementById('we-delete').addEventListener('click', () => this._deleteSelected());
        document.getElementById('we-duplicate').addEventListener('click', () => this._duplicateSelected());
        document.getElementById('we-save').addEventListener('click', () => this._saveWorld());

        // Gizmo mode buttons
        document.querySelectorAll('.we-gizmo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.gizmoMode = btn.dataset.mode;
                document.querySelectorAll('.we-gizmo-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Click to select/place in world
        this.renderer.domElement.addEventListener('click', (e) => {
            if (!this.active) return;
            this._onWorldClick(e);
        });

        // Drag to move objects
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (!this.active || this.gizmoMode !== 'translate') return;
            this._onDragStart(e);
        });
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (!this._isDragging) return;
            this._onDragMove(e);
        });
        this.renderer.domElement.addEventListener('mouseup', () => {
            this._isDragging = false;
        });

        // Keyboard shortcuts in editor
        window.addEventListener('keydown', (e) => {
            if (!this.active) return;
            if (e.key === 'Delete' || e.key === 'Backspace') this._deleteSelected();
            if (e.key === 'g') this.gizmoMode = 'translate';
            if (e.key === 'r') this.gizmoMode = 'rotate';
            if (e.key === 's' && !e.ctrlKey) this.gizmoMode = 'scale';
        });
    }

    toggle(forceState) {
        this.active = forceState !== undefined ? forceState : !this.active;
        this.panel.classList.toggle('open', this.active);
        if (!this.active) this._deselectAll();
    }

    _spawnObject(item) {
        const geo = item.geo();
        const mat = new THREE.MeshStandardMaterial({
            color: item.color,
            metalness: 0.2,
            roughness: 0.6
        });
        if (item.emissive) {
            mat.emissive = new THREE.Color(item.color);
            mat.emissiveIntensity = 0.8;
        }
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(
            (Math.random() - 0.5) * 10,
            geo.parameters?.height ? geo.parameters.height / 2 : 0.5,
            (Math.random() - 0.5) * 10
        );
        mesh.userData.editorObject = true;
        mesh.userData.objectType = item.id;
        mesh.userData.objectName = item.name;

        this.scene.add(mesh);
        this.placedObjects.push(mesh);
        this._selectObject(mesh);

        // Broadcast spawn
        this._broadcastObjectAction('spawn', this._serializeObject(mesh));

        this._updateInfo(`✅ วาง ${item.name} แล้ว`);
    }

    _onWorldClick(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this._raycaster.setFromCamera(this._mouse, this.camera);

        const editorMeshes = this.placedObjects.filter(o => o.userData.editorObject);
        const hits = this._raycaster.intersectObjects(editorMeshes, false);
        if (hits.length > 0) {
            this._selectObject(hits[0].object);
        } else {
            this._deselectAll();
        }
    }

    _onDragStart(e) {
        if (!this.selectedObject) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this._raycaster.setFromCamera(this._mouse, this.camera);

        const hits = this._raycaster.intersectObjects([this.selectedObject], false);
        if (hits.length > 0) {
            this._isDragging = true;
            const intersection = new THREE.Vector3();
            this._raycaster.ray.intersectPlane(this._groundPlane, intersection);
            this._dragOffset.copy(this.selectedObject.position).sub(intersection);
        }
    }

    _onDragMove(e) {
        if (!this._isDragging || !this.selectedObject) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this._raycaster.setFromCamera(this._mouse, this.camera);

        const intersection = new THREE.Vector3();
        if (this._raycaster.ray.intersectPlane(this._groundPlane, intersection)) {
            this.selectedObject.position.x = intersection.x + this._dragOffset.x;
            this.selectedObject.position.z = intersection.z + this._dragOffset.z;
        }
    }

    _selectObject(obj) {
        this._deselectAll();
        this.selectedObject = obj;

        // Selection highlight
        const edges = new THREE.EdgesGeometry(obj.geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xe2001a, linewidth: 2 }));
        line.userData.selectionHelper = true;
        obj.add(line);

        this._updateInfo(`📌 เลือก: ${obj.userData.objectName || obj.userData.objectType}`);
    }

    _deselectAll() {
        if (this.selectedObject) {
            const toRemove = [];
            this.selectedObject.traverse(c => {
                if (c.userData.selectionHelper) toRemove.push(c);
            });
            toRemove.forEach(c => {
                c.parent.remove(c);
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        }
        this.selectedObject = null;
    }

    _deleteSelected() {
        if (!this.selectedObject) return;
        const obj = this.selectedObject;
        const id = this.placedObjects.indexOf(obj);
        this._deselectAll();
        this.scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
        this.placedObjects.splice(id, 1);
        this._broadcastObjectAction('delete', { index: id });
        this._updateInfo('🗑 ลบวัตถุแล้ว');
    }

    _duplicateSelected() {
        if (!this.selectedObject) return;
        const src = this.selectedObject;
        const clone = src.clone();
        clone.position.x += 2;
        clone.userData = { ...src.userData };
        this.scene.add(clone);
        this.placedObjects.push(clone);
        this._selectObject(clone);
        this._broadcastObjectAction('spawn', this._serializeObject(clone));
        this._updateInfo('📋 คัดลอกวัตถุแล้ว');
    }

    _serializeObject(obj) {
        return {
            type: obj.userData.objectType,
            pos: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rot: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
            scl: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
        };
    }

    _broadcastObjectAction(action, data) {
        this.network?.send({ type: 'world_edit', action, data });
    }

    async _saveWorld() {
        const worldData = this.placedObjects.map(o => this._serializeObject(o));
        try {
            const resp = await fetch('/api/world', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ objects: worldData }),
            });
            if (resp.ok) {
                this._updateInfo('💾 บันทึกโลกสำเร็จ!');
            } else {
                this._updateInfo('❌ บันทึกล้มเหลว');
            }
        } catch {
            this._updateInfo('❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
        }
    }

    async loadWorld() {
        try {
            // Using a local file instead of an API to prevent 404 on simple development server
            const resp = await fetch('./world_data.json');
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.objects) {
                data.objects.forEach(obj => {
                    const item = OBJECT_PALETTE.find(p => p.id === obj.type);
                    if (!item) return;
                    const geo = item.geo();
                    const mat = new THREE.MeshStandardMaterial({ color: item.color, metalness: 0.2, roughness: 0.6 });
                    if (item.emissive) { mat.emissive = new THREE.Color(item.color); mat.emissiveIntensity = 0.8; }
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.position.set(obj.pos.x, obj.pos.y, obj.pos.z);
                    mesh.rotation.set(obj.rot.x, obj.rot.y, obj.rot.z);
                    mesh.scale.set(obj.scl.x, obj.scl.y, obj.scl.z);
                    mesh.userData.editorObject = true;
                    mesh.userData.objectType = item.id;
                    mesh.userData.objectName = item.name;
                    this.scene.add(mesh);
                    this.placedObjects.push(mesh);
                });
            }
        } catch { /* first time, no saved world */ }
    }

    handleRemoteEdit(action, data) {
        if (action === 'spawn' && data.type) {
            const item = OBJECT_PALETTE.find(p => p.id === data.type);
            if (!item) return;
            const geo = item.geo();
            const mat = new THREE.MeshStandardMaterial({ color: item.color, metalness: 0.2, roughness: 0.6 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
            mesh.userData.editorObject = true;
            mesh.userData.objectType = item.id;
            this.scene.add(mesh);
            this.placedObjects.push(mesh);
        } else if (action === 'delete' && data.index !== undefined) {
            const obj = this.placedObjects[data.index];
            if (obj) {
                this.scene.remove(obj);
                this.placedObjects.splice(data.index, 1);
            }
        }
    }

    _updateInfo(text) {
        const info = document.getElementById('we-info');
        if (info) info.textContent = text;
    }
}
