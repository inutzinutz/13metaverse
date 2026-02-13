import * as THREE from 'three';
import { Avatar } from './Avatar.js';

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
    }

    updateAgent(dt, playerPosition) {
        this.update(dt);

        const dist = this.group.position.distanceTo(playerPosition);

        if (dist < this.proximityRadius) {
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
            // Return to idle rotation if needed
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
        this._lastDialogueIndex = (this._lastDialogueIndex + 1) % this.dialogueLines.length;
        this.say(this.dialogueLines[this._lastDialogueIndex]);
    }
}
