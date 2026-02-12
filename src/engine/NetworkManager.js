/**
 * NetworkManager — WebSocket multiplayer client
 */
export class NetworkManager {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.isConnected = false;

        // Callbacks
        this.onConnect = null;
        this.onDisconnect = null;
        this.onPlayerJoin = null;
        this.onPlayerLeave = null;
        this.onPlayerUpdate = null;
        this.onChatMessage = null;
        this.onPlayerList = null;
        this.onWhiteboard = null;

        this._sendInterval = null;
    }

    connect(serverUrl, playerInfo) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);

                this.ws.onopen = () => {
                    console.log('[Network] Connected to server');
                    this.isConnected = true;
                    // Send join message
                    this._send({
                        type: 'join',
                        name: playerInfo.name,
                        color: playerInfo.color
                    });
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this._handleMessage(data);
                        if (data.type === 'welcome') {
                            this.playerId = data.id;
                            resolve(data.id);
                        }
                    } catch (e) {
                        console.warn('[Network] Bad message:', e);
                    }
                };

                this.ws.onclose = () => {
                    console.log('[Network] Disconnected');
                    this.isConnected = false;
                    this._stopSendLoop();
                    if (this.onDisconnect) this.onDisconnect();
                };

                this.ws.onerror = (err) => {
                    console.error('[Network] Error:', err);
                    reject(err);
                };

                // Timeout
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);

            } catch (e) {
                reject(e);
            }
        });
    }

    _handleMessage(data) {
        switch (data.type) {
            case 'welcome':
                if (this.onConnect) this.onConnect(data);
                break;
            case 'player_join':
                if (this.onPlayerJoin) this.onPlayerJoin(data);
                break;
            case 'player_leave':
                if (this.onPlayerLeave) this.onPlayerLeave(data.id);
                break;
            case 'state':
                if (this.onPlayerUpdate) this.onPlayerUpdate(data.players);
                break;
            case 'chat':
                if (this.onChatMessage) this.onChatMessage(data);
                break;
            case 'player_list':
                if (this.onPlayerList) this.onPlayerList(data.players);
                break;
            case 'whiteboard':
                if (this.onWhiteboard) this.onWhiteboard(data.data);
                break;
        }
    }

    startSendLoop(getStateFn, fps = 20) {
        this._stopSendLoop();
        this._sendInterval = setInterval(() => {
            if (this.isConnected) {
                const state = getStateFn();
                this._send({
                    type: 'move',
                    ...state
                });
            }
        }, 1000 / fps);
    }

    _stopSendLoop() {
        if (this._sendInterval) {
            clearInterval(this._sendInterval);
            this._sendInterval = null;
        }
    }

    sendChat(message) {
        if (this.isConnected) {
            this._send({ type: 'chat', message });
        }
    }

    _send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    disconnect() {
        this._stopSendLoop();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}
