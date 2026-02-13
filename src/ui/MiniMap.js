/**
 * MiniMap — Top-right radar overlay showing player positions
 * Shows buildings, zones, and player dots on a mini canvas
 */
export class MiniMap {
    constructor() {
        this.size = 160;
        this.mapScale = 0.5; // world units per pixel
        this._createDOM();
        this.playerPositions = [];
        this.localPos = { x: 0, z: 0, ry: 0 };
    }

    _createDOM() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'minimap';
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');

        const style = document.createElement('style');
        style.textContent = `
            #minimap {
                position: fixed; top: 60px; right: 16px;
                width: 160px; height: 160px;
                border-radius: 50%; border: 3px solid rgba(226,0,26,0.5);
                background: rgba(0,0,0,0.6);
                z-index: 100;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.3);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Update with current player positions
     */
    update(localPos, remotePlayers) {
        this.localPos = localPos;
        const ctx = this.ctx;
        const s = this.size;
        const cx = s / 2, cy = s / 2;
        const scale = this.mapScale;

        // Clear
        ctx.clearRect(0, 0, s, s);

        // Clip to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, s / 2 - 2, 0, Math.PI * 2);
        ctx.clip();

        // Background
        ctx.fillStyle = 'rgba(15, 25, 15, 0.9)';
        ctx.fillRect(0, 0, s, s);

        // Grid lines
        ctx.strokeStyle = 'rgba(100, 200, 100, 0.15)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < s; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0); ctx.lineTo(i, s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i); ctx.lineTo(s, i);
            ctx.stroke();
        }

        // Roads (centered on player)
        const px = localPos.x || 0;
        const pz = localPos.z || 0;

        ctx.fillStyle = 'rgba(80, 80, 80, 0.6)';
        // Main N-S road
        const rx = cx + (-px) * scale;
        ctx.fillRect(rx - 3 * scale, 0, 6 * scale, s);
        // Main E-W road
        const rz = cy + (-pz) * scale;
        ctx.fillRect(0, rz - 3 * scale, s, 6 * scale);

        // Buildings
        const buildings = [
            { x: -30, z: -25, w: 16, h: 12, label: 'S1', color: 'rgba(100,150,255,0.4)' },
            { x: 30, z: -25, w: 16, h: 12, label: 'S2', color: 'rgba(100,150,255,0.4)' },
            { x: -55, z: 25, w: 14, h: 10, label: 'M', color: 'rgba(226,0,26,0.4)' },
        ];
        buildings.forEach(b => {
            const bx = cx + (b.x - px) * scale;
            const bz = cy + (b.z - pz) * scale;
            ctx.fillStyle = b.color;
            ctx.fillRect(bx - b.w * scale / 2, bz - b.h * scale / 2, b.w * scale, b.h * scale);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '8px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.label, bx, bz + 3);
        });

        // Drone gallery circle
        const dgx = cx + (0 - px) * scale;
        const dgz = cy + (30 - pz) * scale;
        ctx.strokeStyle = 'rgba(226, 0, 26, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(dgx, dgz, 18 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // FPV arena
        const fx = cx + (0 - px) * scale;
        const fz = cy + (-60 - pz) * scale;
        ctx.strokeStyle = 'rgba(226, 0, 26, 0.3)';
        ctx.strokeRect(fx - 20 * scale, fz - 15 * scale, 40 * scale, 30 * scale);

        // Remote players (green dots)
        if (remotePlayers) {
            remotePlayers.forEach(rp => {
                const rpx = cx + ((rp.x || 0) - px) * scale;
                const rpz = cy + ((rp.z || 0) - pz) * scale;
                ctx.fillStyle = '#66ff66';
                ctx.beginPath();
                ctx.arc(rpx, rpz, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Local player (always center, with direction arrow)
        ctx.fillStyle = '#e2001a';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        const ry = localPos.ry || 0;
        ctx.strokeStyle = '#e2001a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(ry) * 10, cy - Math.cos(ry) * 10);
        ctx.stroke();

        ctx.restore();

        // Border ring
        ctx.strokeStyle = 'rgba(226, 0, 26, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, s / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}
