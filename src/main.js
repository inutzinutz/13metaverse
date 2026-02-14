import * as THREE from 'three';
import { WorldBuilder } from './engine/WorldBuilder.js';
import { Avatar } from './engine/Avatar.js';
import { PlayerController } from './engine/PlayerController.js';
import { NetworkManager } from './engine/NetworkManager.js';
import { DroneModels, DRONE_CATALOG } from './engine/DroneModels.js';
import { MeetingRoom } from './engine/MeetingRoom.js';
import { DayNightCycle } from './engine/DayNightCycle.js';
import { WeatherSystem } from './engine/WeatherSystem.js';
import { ChatPanel } from './ui/ChatPanel.js';
import { ProductPopup } from './ui/ProductPopup.js';
import { LoginScreen } from './ui/LoginScreen.js';
import { Whiteboard } from './ui/Whiteboard.js';
import { EmoteSystem } from './ui/EmoteSystem.js';
import { MiniMap } from './ui/MiniMap.js';
import { MobileControls } from './ui/MobileControls.js';
import { Lobby } from './ui/Lobby.js';
import { WorldEditor } from './engine/WorldEditor.js';
import { ShoppingCart } from './ui/ShoppingCart.js';
import { NPCGuide } from './engine/NPCGuide.js';
import { VoiceChat } from './engine/VoiceChat.js';
import { ScreenshotSystem } from './ui/ScreenshotSystem.js';
import { AvatarCustomizer } from './ui/AvatarCustomizer.js';
import { DroneSimulator } from './engine/DroneSimulator.js';
import { npcMemory } from './engine/NPCMemorySystem.js';
import { NPCSettingsPanel } from './ui/NPCSettingsPanel.js';

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
        this.meetingRoom = null;
        this.whiteboard = null;
        this.loginScreen = null;
        this.emoteSystem = null;
        this.miniMap = null;
        this.dayNight = null;
        this.weatherSystem = null;
        this.mobileControls = null;
        this.worldEditor = null;
        this.cart = null;
        this.npcGuide = null;
        this.voiceChat = null;
        this.screenshotSystem = null;
        this.customizer = null;
        this.aiAgents = [];
        this.droneSim = null;
        this.npcSettings = null;
        this._inMeetingZone = false;
        this._inEducationZone = false;
        this._inArenaZone = false;

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
        this._initLogin();
    }

    _initLogin() {
        this.loginScreen = new LoginScreen();
        this.loginScreen.onLogin = (userData) => {
            // Pre-fill lobby name if we have display name
            if (userData && userData.name) {
                const nameInput = document.getElementById('lobby-name');
                if (nameInput) nameInput.value = userData.name;
            }
        };

        // Skip button goes directly to lobby
        const skipBtn = document.querySelector('#login-skip');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.loginScreen.hide();
            });
        }
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

        // Place Osmo Handhelds in Ratchaphruek Store
        const handheldPositions = this.world.getHandheldDisplayPositions();
        const handheldIds = ['pocket3', 'action4'];
        handheldIds.forEach((id, i) => {
            if (handheldPositions[i]) {
                // Facing the viewer walking in
                this.droneModels.createDisplay(id, handheldPositions[i], Math.PI);
            }
        });

        // Meeting room & Whiteboard
        this.meetingRoom = new MeetingRoom();
        this.whiteboard = new Whiteboard(this.network);

        // Gameplay systems
        this.emoteSystem = new EmoteSystem(this.network);
        this.miniMap = new MiniMap();
        this.dayNight = new DayNightCycle(this.scene, true); // Real-time sync enabled
        this.weatherSystem = new WeatherSystem(this.scene);
        this.mobileControls = new MobileControls();

        // Phase 6 Systems
        this.cart = new ShoppingCart();
        window.__cart = this.cart; // Global ref for button clicks
        this.productPopup.onAddToCart = (product) => this.cart.addItem(product);

        this.worldEditor = new WorldEditor(this.scene, this.camera, this.renderer, this.network);
        this.worldEditor.loadWorld();

        this.npcGuide = new NPCGuide(this.scene);
        this.voiceChat = new VoiceChat(this.network);
        this.screenshotSystem = new ScreenshotSystem(this.renderer);
        this.npcSettings = new NPCSettingsPanel(npcMemory);

        // Keyboard shortcuts for enterprise features
        window.addEventListener('keydown', (e) => {
            if (this.chat?.isChatActive()) return;
            if (e.key === 'm' || e.key === 'M') {
                if (this._inMeetingZone) {
                    this.meetingRoom.open('DJI 13Store', this.localAvatar?.name || 'Guest');
                } else {
                    this.chat?.addSystemMessage('❌ ห้องประชุมต้องใช้งานในอาคาร Meeting Hall เท่านั้น');
                }
            }
            if (e.key === 'b' || e.key === 'B') {
                if (this._inMeetingZone) {
                    this.whiteboard.toggle();
                } else {
                    this.chat?.addSystemMessage('❌ ไวท์บอร์ดต้องใช้งานในอาคาร Meeting Hall เท่านั้น');
                }
            }
            if (e.key === 'p' || e.key === 'P') {
                this.worldEditor?.toggle();
            }
            if (e.key === 'g' || e.key === 'G') {
                this.npcGuide?.toggle();
            }
            if (e.key === 'n' || e.key === 'N') {
                this.npcSettings?.toggle();
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

        // Init AI Agents
        this._initAIAgents();

        // Init Drone Simulator
        this.droneSim = new DroneSimulator(this.scene, this.camera, this.controller);

        // Customizer integration
        const customizerBtn = document.getElementById('customizer-btn');
        this.customizer = new AvatarCustomizer(this.localAvatar, (appearanceData) => {
            this.network.send({
                type: 'appearance_update',
                data: appearanceData
            });
        });
        if (customizerBtn) customizerBtn.onclick = () => this.customizer.toggle();

        // Product Color Change integration
        if (this.productPopup) {
            this.productPopup.onColorChange = (hex) => {
                const closest = this.droneModels.getClosestDisplay(this.localAvatar.group.position);
                if (closest) {
                    this.droneModels.updateDisplayColor(closest, hex);
                }
            };
        }

        // Drone Mode Button
        const flyBtn = document.createElement('button');
        flyBtn.id = 'fly-drone-btn';
        flyBtn.className = 'hud-maps-btn hidden';
        flyBtn.innerHTML = '🚁 บินโดรน';
        flyBtn.style.background = 'rgba(226,0,26,0.3)';
        flyBtn.style.borderColor = '#e2001a';
        document.querySelector('.hud-top').appendChild(flyBtn);

        flyBtn.onclick = () => {
            if (!this.droneSim.isActive) {
                this.droneSim.activate(this.localAvatar.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
                flyBtn.innerHTML = '🚶 กลับมาเดิน';
                flyBtn.style.background = 'rgba(255,255,255,0.1)';
            } else {
                this.droneSim.deactivate();
                flyBtn.innerHTML = '🚁 บินโดรน';
                flyBtn.style.background = 'rgba(226,0,26,0.3)';
            }
        };
    }

    _initAIAgents() {
        // Topic Agent in Education Room
        const eduAgent = new TopicAgent();
        eduAgent.setPosition(-35, 0, 36); // On the stage
        eduAgent.setWaypoints([
            new THREE.Vector3(-35, 0, 36),
            new THREE.Vector3(-25, 0, 30),
            new THREE.Vector3(-30, 0, 25),
            new THREE.Vector3(-40, 0, 25)
        ]);
        eduAgent.setMoodColor(0x7cfc00); // Sarah is helpful (Green)
        this.scene.add(eduAgent.group);
        this.aiAgents.push(eduAgent);

        // FPV Instructor in Arena
        const fpvAgent = new FPVInstructor();
        fpvAgent.setPosition(0, 0, -50); // Near entrance
        fpvAgent.setWaypoints([
            new THREE.Vector3(0, 0, -50),
            new THREE.Vector3(15, 0, -45),
            new THREE.Vector3(15, 0, -65),
            new THREE.Vector3(-15, 0, -65),
            new THREE.Vector3(-15, 0, -45)
        ]);
        fpvAgent.setMoodColor(0xe2001a); // Captain DJI is branded (Red)
        this.scene.add(fpvAgent.group);
        this.aiAgents.push(fpvAgent);
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

        // Lighting — base (DayNightCycle adds dynamic lights)
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c3f, 0.2);
        this.scene.add(hemiLight);

        const ambient = new THREE.AmbientLight(0xffffff, 0.15);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff5e0, 0.5);
        sun.position.set(50, 80, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 60;
        sun.shadow.camera.bottom = -60;
        sun.shadow.camera.far = 200;
        this.scene.add(sun);

        const fillLight = new THREE.DirectionalLight(0xb3e5fc, 0.15);
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
            this.chat?.addMessage(data.name, data.message, colorHex);

            // Show chat bubble above avatar
            if (data.id === this.network.playerId) {
                this.localAvatar?.showChatBubble(data.message);
            } else {
                const avatar = this.remotePlayers.get(data.id);
                avatar?.showChatBubble(data.message);
            }
        };

        this.network.onWorldEdit = (data) => {
            if (this.worldEditor) {
                this.worldEditor.handleRemoteEdit(data.action, data.data);
            }
        };

        this.network.onVoiceTalking = (data) => {
            if (this.voiceChat) {
                this.voiceChat.handlePeerTalking(data.id, data.talking);
            }
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

        this.network.onWhiteboard = (data) => {
            if (this.whiteboard) {
                this.whiteboard.receiveDrawData(data);
            }
        };

        this.network.onDisconnect = () => {
            this.chat.addSystemMessage('Disconnected from server.');
            this.remotePlayers.forEach(avatar => avatar.dispose());
            this.remotePlayers.clear();
            this._updatePlayerList();
        };

        this.network.onAppearanceUpdate = (id, appearanceData) => {
            const avatar = this.remotePlayers.get(id);
            if (avatar) {
                avatar.updateAppearance(appearanceData);
            }
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
            hairStyle: data.hairStyle || 'short',
            hairColor: data.hairColor || 0x3e2723,
            shirtType: data.shirtType || 'tshirt',
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

            // Update World
            if (this.world) {
                this.world.updateLiveWall(dt);
            }

            // Update AI Agents
            this.aiAgents.forEach(agent => {
                agent.updateAgent(dt, this.localAvatar.group.position);
            });

            // Update Drone Simulator or Player Controller
            if (this.droneSim && this.droneSim.isActive) {
                this.droneSim.update(dt);
            } else if (this.controller) {
                this.controller.update(dt);
            }

            // Check proximity to FPV Arena
            const p = this.localAvatar.group.position;
            const inArena = (p.x > -20 && p.x < 20 && p.z > -75 && p.z < -45);
            if (inArena !== this._inArenaZone) {
                this._inArenaZone = inArena;
                const flyBtn = document.getElementById('fly-drone-btn');
                if (flyBtn) flyBtn.classList.toggle('hidden', !inArena);
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

            // Check if in meeting zone
            if (this.world) {
                const wasIn = this._inMeetingZone;
                this._inMeetingZone = this.world.isInMeetingZone(this.localAvatar.group.position);
                if (this._inMeetingZone && !wasIn && this.chat) {
                    this.chat.addSystemMessage('📹 ห้องประชุม — กด M เพื่อเปิด Meeting · กด B เพื่อเปิด Whiteboard');
                    npcMemory.recordEvent('location_visit', { id: 'meeting_hall', name: 'Meeting Hall' });
                }

                // Track Education Room (Sarah's area)
                const inEdu = (p.x > -50 && p.x < -20 && p.z > 20 && p.z < 50);
                if (inEdu && !this._inEducationZone) {
                    this._inEducationZone = true;
                    npcMemory.recordEvent('location_visit', { id: 'education_room', name: 'Education Room' });
                } else if (!inEdu) {
                    this._inEducationZone = false;
                }
            }
        }

        // Update drone display animations
        if (this.droneModels) {
            this.droneModels.update(dt);
            // Record product view if player stays near a drone
            const closest = this.droneModels.getClosestDisplay(this.localAvatar.group.position);
            if (closest) {
                npcMemory.recordEvent('product_view', { id: closest.info.id, name: closest.info.name });
            }
        }

        // Update remote avatars
        this.remotePlayers.forEach(avatar => {
            avatar.update(dt);
        });

        // Update day/night cycle
        if (this.dayNight) {
            this.dayNight.update(dt);
        }

        // Update weather
        if (this.weatherSystem && this.localAvatar) {
            this.weatherSystem.update(dt, this.localAvatar.group.position);
        }

        // Update NPC Guide
        if (this.npcGuide) {
            this.npcGuide.update(dt, this.localAvatar.group.position);
        }

        // Update AI Agents (Autonomous Routines & Gossip)
        if (this.localAvatar) {
            this.aiAgents.forEach(agent => {
                agent.updateAgent(dt, this.localAvatar.group.position);
            });
        }

        // Update Voice Chat Proximity
        if (this.voiceChat && this.localAvatar) {
            this.voiceChat.updateProximity(this.localAvatar.group.position, this.remotePlayers);
        }

        // Update emote animation
        if (this.emoteSystem && this.localAvatar) {
            this.emoteSystem.applyToAvatar(this.localAvatar, dt);
        }

        // Update mini-map
        if (this.miniMap && this.localAvatar) {
            const pos = this.localAvatar.group.position;
            const remoteData = [];
            this.remotePlayers.forEach(a => {
                remoteData.push({ x: a.group.position.x, z: a.group.position.z });
            });
            this.miniMap.update(
                { x: pos.x, z: pos.z, ry: this.localAvatar.group.rotation.y },
                remoteData
            );
        }

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
