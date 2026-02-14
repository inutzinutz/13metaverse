import { Avatar } from './Avatar.js';
import { npcMemory } from './NPCMemorySystem.js';

/**
 * AIAgent — Base class for intelligent NPCs with proximity reactions and dialogue
 */
export class AIAgent extends Avatar {
    constructor(options = {}) {
        super({
            name: options.name || 'AI Assistant',
            shirtColor: options.shirtColor || 0x212121,
            pantsColor: options.pantsColor || 0x111111,
            skinColor: options.skinColor || 0xe0ac69,
            hairStyle: options.hairStyle || 'short',
            hairColor: options.hairColor || 0x111111,
            shirtType: options.shirtType || 'jacket',
            isLocal: false
        });

        this.role = options.role || 'assistant';
        this.dialogueLines = options.dialogueLines || ["Hello! How can I help you today?"];
        this.proximityRadius = options.proximityRadius || 5;
        this.isTalking = false;

        this._lastDialogueIndex = -1;
        this._playerRef = null;
        this._hasGreeted = false;

        // Autonomous Navigation
        this.waypoints = [];
        this.currentWaypointIndex = 0;
        this.isMoving = false;
        this.moveSpeed = 1.5;

        // Mood Icon (Sims-style Plumbob)
        this.moodIcon = null;
        this._createMoodIcon();
    }

    _createMoodIcon() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw a diamond/plumbob shape
        ctx.fillStyle = '#7cfc00'; // Lime green
        ctx.beginPath();
        ctx.moveTo(32, 5);
        ctx.lineTo(55, 32);
        ctx.lineTo(32, 59);
        ctx.lineTo(9, 32);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        this.moodIcon = new THREE.Sprite(mat);
        this.moodIcon.scale.set(0.6, 0.6, 1);
        this.moodIcon.position.y = 2.5;
        this.group.add(this.moodIcon);
    }

    setMoodColor(color) {
        if (this.moodIcon) {
            this.moodIcon.material.color.set(color);
        }
    }

    setWaypoints(points) {
        this.waypoints = points;
        this.currentWaypointIndex = 0;
        this.isMoving = points.length > 0;
    }

    updateAgent(dt, playerPosition) {
        this.update(dt);

        // Animate Mood Icon
        if (this.moodIcon) {
            this.moodIcon.position.y = 2.5 + Math.sin(Date.now() * 0.003) * 0.1;
        }

        const dist = this.group.position.distanceTo(playerPosition);

        if (dist < this.proximityRadius) {
            this.isMoving = false; // Stop to talk
            // Look at player
            const dx = playerPosition.x - this.group.position.x;
            const dz = playerPosition.z - this.group.position.z;
            const angle = Math.atan2(dx, dz);

            // Smoothly rotate to face player
            const currentRot = this.group.rotation.y;
            const targetRot = angle;
            let diff = targetRot - currentRot;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.group.rotation.y += diff * dt * 3;

            if (!this._hasGreeted) {
                this.sayNext();
                this._hasGreeted = true;
            }
        } else {
            this._hasGreeted = false;

            // Autonomous Movement
            if (this.isMoving && this.waypoints.length > 0) {
                const target = this.waypoints[this.currentWaypointIndex];
                const dToTarget = this.group.position.distanceTo(target);

                if (dToTarget < 0.5) {
                    this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
                } else {
                    // Turn towards waypoint
                    const dx = target.x - this.group.position.x;
                    const dz = target.z - this.group.position.z;
                    const angle = Math.atan2(dx, dz);

                    let diff = angle - this.group.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    this.group.rotation.y += diff * dt * 2;

                    // Move forward
                    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
                    this.group.position.add(forward.multiplyScalar(this.moveSpeed * dt));
                    this.animState = 'walk';
                }
            } else {
                this.animState = 'idle';
            }
        }
    }

    say(text) {
        if (this.isTalking) return;
        this.isTalking = true;
        this.showChatBubble(text);

        // Brief talking animation (simple nod/gestures)
        this.animState = 'walk'; // walking speed acts as gesture speed
        setTimeout(() => {
            this.animState = 'idle';
            this.isTalking = false;
        }, 4000);
    }

    sayNext() {
        if (this.dialogueLines.length === 0) return;

        // Realistic Mode Gossip Integration
        if (npcMemory.isRealistic()) {
            const levelLabel = npcMemory.getLevelLabel();
            const topInterest = npcMemory.getTopInterest();
            const recent = npcMemory.getRecentMemories(3);

            if (npcMemory.reputation.score > 200 && Math.random() > 0.5) {
                this.say(`Wow, a ${levelLabel}! It's an honor to see a regular like you again.`);
                return;
            }

            if (topInterest && Math.random() > 0.6) {
                this.say(`I noticed you really like the ${topInterest}. It's one of our most popular choices!`);
                return;
            }

            if (recent.length > 0 && Math.random() > 0.4) {
                const mem = recent[Math.floor(Math.random() * recent.length)];
                const source = this.name === 'Instructor Sarah' ? 'the shop guide' : 'Sarah';

                if (mem.type === 'product_view') {
                    this.say(`I heard from ${source} that you were checking out the ${mem.data.name}. Looking to buy one?`);
                    return;
                }
                if (mem.type === 'location_visit') {
                    this.say(`I saw you heading towards the ${mem.data.name} earlier. It's a nice place, isn't it?`);
                    return;
                }
            }
        }

        this._lastDialogueIndex = (this._lastDialogueIndex + 1) % this.dialogueLines.length;
        this.say(this.dialogueLines[this._lastDialogueIndex]);
    }
}
