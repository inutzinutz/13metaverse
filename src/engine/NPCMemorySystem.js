/**
 * NPCMemorySystem — Privacy-by-design memory for NPCs
 * Stores ONLY game-related events locally in the browser.
 */
export class NPCMemorySystem {
    constructor() {
        this.memoryKey = 'xshadow_npc_memory';
        this.configKey = 'xshadow_npc_config';

        this.config = this._loadConfig();
        this.memories = this._loadMemories();
        this.reputation = this._loadReputation();

        // Allowed event types to ensure privacy boundary
        this.ALLOWED_TYPES = [
            'product_view',
            'room_entry',
            'npc_chat',
            'achievement',
            'location_visit'
        ];
    }

    _loadConfig() {
        const saved = localStorage.getItem(this.configKey);
        return saved ? JSON.parse(saved) : { mode: 'normal' }; // 'normal' or 'realistic'
    }

    _loadMemories() {
        const saved = localStorage.getItem(this.memoryKey);
        return saved ? JSON.parse(saved) : [];
    }

    _loadReputation() {
        const saved = localStorage.getItem('xshadow_npc_reputation');
        return saved ? JSON.parse(saved) : { score: 0, level: 1, interests: {} };
    }

    save() {
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
        localStorage.setItem(this.memoryKey, JSON.stringify(this.memories));
        localStorage.setItem('xshadow_npc_reputation', JSON.stringify(this.reputation));
    }

    setMode(mode) {
        this.config.mode = mode;
        this.save();
        console.log(`[NPCMemory] Mode set to: ${mode}`);
    }

    isRealistic() {
        return this.config.mode === 'realistic';
    }

    /**
     * Records a game-context event if realistic mode is on.
     * @param {string} type - Event type (must be in ALLOWED_TYPES)
     * @param {object} data - Event details
     */
    recordEvent(type, data) {
        if (!this.isRealistic()) return;
        if (!this.ALLOWED_TYPES.includes(type)) {
            console.warn(`[NPCMemory] Blocked attempt to record non-game event type: ${type}`);
            return;
        }

        const event = {
            type,
            data,
            timestamp: Date.now(),
            expires: Date.now() + (1000 * 60 * 60 * 24 * 7) // 7 day retention
        };

        this.memories.push(event);

        // Keep only the last 50 memories to prevent bloat
        if (this.memories.length > 50) {
            this.memories.shift();
        }

        // Reputation logic
        if (type === 'product_view' || type === 'location_visit') {
            this.reputation.score += 5;
            if (data.id) {
                this.reputation.interests[data.id] = (this.reputation.interests[data.id] || 0) + 1;
            }
        }

        // Level up every 100 points
        this.reputation.level = Math.floor(this.reputation.score / 100) + 1;

        this.save();
    }

    getMemoriesByType(type) {
        return this.memories.filter(m => m.type === type);
    }

    getRecentMemories(limit = 5) {
        return [...this.memories].reverse().slice(0, limit);
    }

    getTopInterest() {
        let max = 0;
        let top = null;
        for (const [id, count] of Object.entries(this.reputation.interests)) {
            if (count > max) {
                max = count;
                top = id;
            }
        }
        return top;
    }

    getLevelLabel() {
        const labels = ['Newcomer', 'Explorer', 'DJI Enthusiast', 'Showroom Pro', 'VVIP Guest'];
        return labels[Math.min(this.reputation.level - 1, labels.length - 1)];
    }

    clearMemory() {
        this.memories = [];
        this.save();
        console.log('[NPCMemory] All memories wiped.');
    }
}

// Singleton instance
export const npcMemory = new NPCMemorySystem();
