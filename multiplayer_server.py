#!/usr/bin/env python3
"""
13Store Metaverse — Multiplayer WebSocket Server
Handles player connections, position sync, and chat
"""
import asyncio
import json
import time
import random


class GameServer:
    def __init__(self):
        self.players = {}  # id -> player state
        self.next_id = 1
        self.connections = {}  # id -> websocket

        # Avatar colors pool
        self.colors = [
            0x42a5f5, 0xef5350, 0x66bb6a, 0xffee58,
            0xab47bc, 0xff7043, 0x26c6da, 0xec407a,
            0x5c6bc0, 0x8d6e63, 0xffa726, 0x78909c
        ]

    def get_id(self):
        pid = self.next_id
        self.next_id += 1
        return str(pid)

    async def handle_client(self, websocket):
        player_id = None
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                except json.JSONDecodeError:
                    continue

                msg_type = data.get('type')

                if msg_type == 'join':
                    player_id = self.get_id()
                    self.connections[player_id] = websocket
                    player_color = data.get('color', random.choice(self.colors))
                    self.players[player_id] = {
                        'id': player_id,
                        'name': data.get('name', f'Player {player_id}'),
                        'color': player_color,
                        'x': random.uniform(6, 10),
                        'y': 0,
                        'z': random.uniform(6, 10),
                        'ry': 0,
                        'anim': 'idle'
                    }

                    # Send welcome with assigned ID
                    await websocket.send(json.dumps({
                        'type': 'welcome',
                        'id': player_id,
                        'you': self.players[player_id]
                    }))

                    # Send existing players list
                    await websocket.send(json.dumps({
                        'type': 'player_list',
                        'players': list(self.players.values())
                    }))

                    # Notify others
                    await self.broadcast({
                        'type': 'player_join',
                        'id': player_id,
                        'name': self.players[player_id]['name'],
                        'color': player_color,
                        'x': self.players[player_id]['x'],
                        'y': 0,
                        'z': self.players[player_id]['z'],
                    }, exclude=player_id)

                    player_count = len(self.players)
                    print(f"[+] {self.players[player_id]['name']} joined (ID: {player_id}) — {player_count} online")

                elif msg_type == 'move' and player_id:
                    if player_id in self.players:
                        p = self.players[player_id]
                        p['x'] = data.get('x', p['x'])
                        p['y'] = data.get('y', p['y'])
                        p['z'] = data.get('z', p['z'])
                        p['ry'] = data.get('ry', p['ry'])
                        p['anim'] = data.get('anim', p['anim'])

                elif msg_type == 'chat' and player_id:
                    msg_text = data.get('message', '')[:200]  # limit length
                    if msg_text.strip():
                        await self.broadcast({
                            'type': 'chat',
                            'id': player_id,
                            'name': self.players[player_id]['name'],
                            'message': msg_text,
                            'color': self.players[player_id].get('color', 0xffffff)
                        })
                        print(f"[Chat] {self.players[player_id]['name']}: {msg_text}")

        except Exception as e:
            print(f"[!] Connection error: {e}")
        finally:
            if player_id:
                name = self.players.get(player_id, {}).get('name', 'Unknown')
                self.players.pop(player_id, None)
                self.connections.pop(player_id, None)
                await self.broadcast({
                    'type': 'player_leave',
                    'id': player_id
                })
                player_count = len(self.players)
                print(f"[-] {name} left — {player_count} online")

    async def broadcast(self, message, exclude=None):
        msg_str = json.dumps(message)
        disconnected = []
        for pid, ws in self.connections.items():
            if pid == exclude:
                continue
            try:
                await ws.send(msg_str)
            except Exception:
                disconnected.append(pid)
        for pid in disconnected:
            self.connections.pop(pid, None)
            self.players.pop(pid, None)

    async def state_broadcast_loop(self):
        """Broadcast all player positions at 20 Hz"""
        while True:
            if self.players:
                await self.broadcast({
                    'type': 'state',
                    'players': list(self.players.values())
                })
            await asyncio.sleep(0.05)  # 20 ticks/sec


async def main():
    try:
        import websockets
    except ImportError:
        print("Installing websockets...")
        import subprocess
        subprocess.check_call(['pip3', 'install', 'websockets'])
        import websockets

    server = GameServer()

    # Start state broadcast loop
    asyncio.create_task(server.state_broadcast_loop())

    print("=" * 50)
    print("  13Store Metaverse — Multiplayer Server")
    print("  WebSocket: ws://localhost:8765")
    print("=" * 50)

    async with websockets.serve(server.handle_client, "0.0.0.0", 8765):
        await asyncio.Future()  # run forever

if __name__ == '__main__':
    asyncio.run(main())
