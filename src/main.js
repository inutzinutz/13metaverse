import * as THREE from 'three';
import { WorldBuilder } from './engine/WorldBuilder.js';
import { Avatar } from './engine/Avatar.js';
import { PlayerController } from './engine/PlayerController.js';
import { NetworkManager } from './engine/NetworkManager.js';
import { DroneModels, DRONE_CATALOG } from './engine/DroneModels.js';
import { ChatPanel } from './ui/ChatPanel.js';
import { ProductPopup } from './ui/ProductPopup.js';
import { Lobby } from './ui/Lobby.js';

/**
 * 13Store Metaverse — Main Game
 */
class Game {
    constructor() {
        this.state = 'lobby'; // lobby, connecting, playing
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.world = null;
        this.localAvatar = null;
        this.controller = null;
        this.network = new NetworkManager();
        this.remotePlayers = new Map(); // id -> Avatar
        this.droneModels = null;
        this.productPopup = null;

        // UI
        this.lobby = new Lobby();
        this.chat = null; // init after game container visible

        // HUD elements
        this.playerCountEl = null;
        this.playerListEl = null;
        this.fpsEl = null;
        this.posEl = null;

        // Timing
        this._lastTime = 0;
        this._frameCount = 0;
        this._lastFpsTime = 0;
        this.fps = 0;

        this._bindLobby();
    }

    _bindLobby() {
        this.lobby.onJoin = (name, color) => {
            this._startGame(name, color);
        };
    }

    async _startGame(name, color) {
        this.state = 'connecting';
        this.lobby.joinBtn?.setAttribute('disabled', 'true');

        // Init 3D engine
        this._initEngine();

        // Build world
        this.world = new WorldBuilder(this.scene);

        // Place DJI drone displays
        this.droneModels = new DroneModels(this.scene);
        this.productPopup = new ProductPopup();
        const displayPositions = this.world.getDroneDisplayPositions();
        const droneIds = ['mini4pro', 'mavic3pro', 'avata2', 'air3', 'fpv', 'neo'];
        droneIds.forEach((id, i) => {
            if (displayPositions[i]) {
                const rotY = Math.atan2(
                    -displayPositions[i].x,
                    30 - displayPositions[i].z
                );
                this.droneModels.createDisplay(id, displayPositions[i], rotY);
            }
        });

        // Create local avatar
        this.localAvatar = new Avatar({
            name: name,
            shirtColor: color,
            pantsColor: this._darkenColor(color, 0.6),
            isLocal: true
        });
        this.localAvatar.setPosition(8, 0, 8);
        this.scene.add(this.localAvatar.group);

        // Player controller
        this.controller = new PlayerController(
            this.camera,
            this.localAvatar,
            this.world.getColliders()
        );

        // Show game
        document.getElementById('game-container').classList.remove('hidden');
        this.lobby.hide();

        // Init HUD
        this.playerCountEl = document.getElementById('player-count');
        this.playerListEl = document.getElementById('player-list');
        this.fpsEl = document.getElementById('status-fps');
        this.posEl = document.getElementById('status-pos');
        this.chat = new ChatPanel();

        // Handle window resize
        window.addEventListener('resize', () => this._onResize());
        this._onResize();

        // Start render loop
        this._lastTime = performance.now();
        this._lastFpsTime = performance.now();
        this._animate();

        // Try to connect to multiplayer server
        try {
            this.chat.addSystemMessage('Connecting to server...');
            await this._connectMultiplayer(name, color);
            this.chat.addSystemMessage('Connected! You can chat with Enter.');
        } catch (e) {
            console.warn('[Game] Multiplayer unavailable:', e.message);
            this.chat.addSystemMessage('Playing offline (start multiplayer_server.py for multiplayer)');
        }

        this.state = 'playing';
    }

    _initEngine() {
        const canvas = document.getElementById('three-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xa7d8f0, 0.008);

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 500);
        this.camera.position.set(0, 10, 15);

        // Lighting — realistic outdoor
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c3f, 0.5);
        this.scene.add(hemiLight);

        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
        sun.position.set(50, 80, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 60;
        sun.shadow.camera.bottom = -60;
        sun.shadow.camera.far = 200;
        this.scene.add(sun);

        const fillLight = new THREE.DirectionalLight(0xb3e5fc, 0.3);
        fillLight.position.set(-30, 40, -30);
        this.scene.add(fillLight);
    }

    async _connectMultiplayer(name, color) {
        this.network = new NetworkManager();

        // Network callbacks
        this.network.onPlayerJoin = (data) => {
            if (data.id === this.network.playerId) return;
            this._spawnRemotePlayer(data);
            this.chat.addSystemMessage(`${data.name} joined the world!`);
            this._updatePlayerList();
        };

        this.network.onPlayerLeave = (id) => {
            const avatar = this.remotePlayers.get(id);
            if (avatar) {
                this.chat.addSystemMessage(`${avatar.name} left the world.`);
                avatar.dispose();
                this.remotePlayers.delete(id);
                this._updatePlayerList();
            }
        };

        this.network.onPlayerUpdate = (players) => {
            players.forEach(p => {
                if (p.id === this.network.playerId) return;
                let avatar = this.remotePlayers.get(p.id);
                if (!avatar) {
                    // Spawn new remote player
                    this._spawnRemotePlayer(p);
                    avatar = this.remotePlayers.get(p.id);
                }
                if (avatar) {
                    avatar.setTargetPosition(p.x, p.y, p.z);
                    avatar.setTargetRotation(p.ry);
                    avatar.setAnimState(p.anim || 'idle');
                }
            });
            this._updatePlayerCount();
        };

        this.network.onChatMessage = (data) => {
            const colorHex = '#' + (data.color || 0xffffff).toString(16).padStart(6, '0');
            this.chat.addMessage(data.name, data.message, colorHex);
        };

        this.network.onPlayerList = (players) => {
            players.forEach(p => {
                if (p.id === this.network.playerId) return;
                if (!this.remotePlayers.has(p.id)) {
                    this._spawnRemotePlayer(p);
                }
            });
            this._updatePlayerList();
        };

        this.network.onDisconnect = () => {
            this.chat.addSystemMessage('Disconnected from server.');
            this.remotePlayers.forEach(avatar => avatar.dispose());
            this.remotePlayers.clear();
            this._updatePlayerList();
        };

        // Chat send
        this.chat.onSend = (text) => {
            this.network.sendChat(text);
        };

        // Auto-detect WebSocket URL from current page
        const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${location.host}`;

        // Connect
        await this.network.connect(wsUrl, { name, color });

        // Start position broadcasting
        this.network.startSendLoop(() => this.controller.getState(), 20);
    }

    _spawnRemotePlayer(data) {
        const avatar = new Avatar({
            name: data.name || `Player ${data.id}`,
            shirtColor: data.color || 0x42a5f5,
            pantsColor: this._darkenColor(data.color || 0x42a5f5, 0.6),
            isLocal: false
        });
        avatar.setPosition(data.x || 0, data.y || 0, data.z || 0);
        avatar.setTargetPosition(data.x || 0, data.y || 0, data.z || 0);
        this.scene.add(avatar.group);
        this.remotePlayers.set(data.id, avatar);
    }

    _updatePlayerCount() {
        const count = this.remotePlayers.size + 1;
        if (this.playerCountEl) {
            this.playerCountEl.textContent = `${count} Online`;
        }
    }

    _updatePlayerList() {
        if (!this.playerListEl) return;
        this.playerListEl.innerHTML = '';

        // Local player
        const localChip = document.createElement('div');
        localChip.className = 'player-chip';
        const localColor = this.localAvatar.shirtColor;
        localChip.innerHTML = `<span class="dot" style="background:#${localColor.toString(16).padStart(6, '0')}"></span>${this.localAvatar.name} (You)`;
        this.playerListEl.appendChild(localChip);

        // Remote players
        this.remotePlayers.forEach(avatar => {
            const chip = document.createElement('div');
            chip.className = 'player-chip';
            const color = avatar.shirtColor;
            chip.innerHTML = `<span class="dot" style="background:#${color.toString(16).padStart(6, '0')}"></span>${avatar.name}`;
            this.playerListEl.appendChild(chip);
        });

        this._updatePlayerCount();
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        const now = performance.now();
        const dt = Math.min((now - this._lastTime) / 1000, 0.1);
        this._lastTime = now;

        // FPS counter
        this._frameCount++;
        if (now - this._lastFpsTime >= 500) {
            this.fps = Math.round((this._frameCount * 1000) / (now - this._lastFpsTime));
            this._frameCount = 0;
            this._lastFpsTime = now;
            if (this.fpsEl) this.fpsEl.textContent = `FPS: ${this.fps}`;
        }

        // Don't process game if chat is active (allow typing without movement)
        const chatActive = this.chat?.isChatActive();

        // Update controller (skip movement if chat is active)
        if (this.controller && !chatActive) {
            this.controller.update(dt);
        }

        // Update local avatar animation
        if (this.localAvatar) {
            this.localAvatar.update(dt);

            // Update position display
            if (this.posEl) {
                const p = this.localAvatar.group.position;
                this.posEl.textContent = `${Math.round(p.x)}, ${Math.round(p.z)}`;
            }

            // Check proximity to drone displays
            if (this.droneModels && this.productPopup) {
                const closest = this.droneModels.getClosestDisplay(this.localAvatar.group.position);
                if (closest) {
                    this.productPopup.show(closest.info);
                } else {
                    this.productPopup.hide();
                }
            }
        }

        // Update drone display animations
        if (this.droneModels) {
            this.droneModels.update(dt);
        }

        // Update remote avatars
        this.remotePlayers.forEach(avatar => {
            avatar.update(dt);
        });

        // Render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    _onResize() {
        if (!this.renderer || !this.camera) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    _darkenColor(color, factor) {
        const r = ((color >> 16) & 0xff) * factor;
        const g = ((color >> 8) & 0xff) * factor;
        const b = (color & 0xff) * factor;
        return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
    }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
    window.__game = new Game();
});
