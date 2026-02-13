#!/usr/bin/env python3
"""
13Store Metaverse — Combined HTTP + WebSocket Server
Single port for both static files and multiplayer.

Works with websockets >= 13.0 (including v15)
"""
import asyncio
import json
import random
import os
import hashlib
import sqlite3
from pathlib import Path
from http import HTTPStatus

import websockets
from websockets.http11 import Response

# ─── Configuration ───────────────────────────────────────────
PORT = int(os.environ.get('PORT', 8080))
ROOT_DIR = Path(__file__).parent.resolve()
DB_PATH = ROOT_DIR / 'users.db'

# ─── Database ────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar_color INTEGER DEFAULT 4367861,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def register_user(email, password, name=None):
    conn = sqlite3.connect(str(DB_PATH))
    try:
        display_name = name or email.split('@')[0]
        conn.execute(
            'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
            (email.lower(), hash_password(password), display_name)
        )
        conn.commit()
        user_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        return {'id': user_id, 'email': email, 'name': display_name}
    except sqlite3.IntegrityError:
        return None  # Email already exists
    finally:
        conn.close()

def login_user(email, password):
    conn = sqlite3.connect(str(DB_PATH))
    row = conn.execute(
        'SELECT id, email, name, avatar_color FROM users WHERE email=? AND password_hash=?',
        (email.lower(), hash_password(password))
    ).fetchone()
    conn.close()
    if row:
        return {'id': row[0], 'email': row[1], 'name': row[2], 'color': row[3]}
    return None

init_db()

MIME_MAP = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.obj': 'text/plain',
    '.mtl': 'text/plain',
}


# ─── Game Server (Multiplayer) ───────────────────────────────
class GameServer:
    def __init__(self):
        self.players = {}
        self.next_id = 1
        self.connections = {}
        self.colors = [
            0x42a5f5, 0xef5350, 0x66bb6a, 0xffee58,
            0xab47bc, 0xff7043, 0x26c6da, 0xec407a,
            0x5c6bc0, 0x8d6e63, 0xffa726, 0x78909c
        ]

    def get_id(self):
        pid = self.next_id
        self.next_id += 1
        return str(pid)

    async def handler(self, websocket):
        """Main WebSocket connection handler."""
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

                    await websocket.send(json.dumps({
                        'type': 'welcome',
                        'id': player_id,
                        'you': self.players[player_id]
                    }))
                    await websocket.send(json.dumps({
                        'type': 'player_list',
                        'players': list(self.players.values())
                    }))
                    await self.broadcast({
                        'type': 'player_join',
                        'id': player_id,
                        'name': self.players[player_id]['name'],
                        'color': player_color,
                        'x': self.players[player_id]['x'],
                        'y': 0,
                        'z': self.players[player_id]['z'],
                    }, exclude=player_id)
                    print(f"  [+] {self.players[player_id]['name']} joined — {len(self.players)} online")

                elif msg_type == 'move' and player_id and player_id in self.players:
                    p = self.players[player_id]
                    for k in ('x', 'y', 'z', 'ry', 'anim'):
                        if k in data:
                            p[k] = data[k]

                elif msg_type == 'chat' and player_id and player_id in self.players:
                    msg_text = data.get('message', '')[:200]
                    if msg_text.strip():
                        await self.broadcast({
                            'type': 'chat',
                            'id': player_id,
                            'name': self.players[player_id]['name'],
                            'message': msg_text,
                            'color': self.players[player_id].get('color', 0xffffff)
                        })
                        print(f"  [💬] {self.players[player_id]['name']}: {msg_text}")

                elif msg_type == 'whiteboard' and player_id:
                    # Relay whiteboard data to all OTHER players
                    await self.broadcast({
                        'type': 'whiteboard',
                        'data': data.get('data', {})
                    }, exclude=player_id)

                elif msg_type == 'world_edit' and player_id:
                    # Relay world edits (spawn, delete, move)
                    await self.broadcast({
                        'type': 'world_edit',
                        'id': player_id,
                        'action': data.get('action'),
                        'data': data.get('data', {})
                    }, exclude=player_id)

                elif msg_type == 'voice_talking' and player_id:
                    # Broadcast who is talking for proximity indicators
                    await self.broadcast({
                        'type': 'voice_talking',
                        'id': player_id,
                        'talking': data.get('talking', False)
                    }, exclude=player_id)

                elif msg_type == 'voice_ready' and player_id:
                    await self.broadcast({
                        'type': 'voice_ready',
                        'id': player_id
                    }, exclude=player_id)

        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"  [!] Error: {e}")
        finally:
            if player_id:
                name = self.players.get(player_id, {}).get('name', '?')
                self.players.pop(player_id, None)
                self.connections.pop(player_id, None)
                await self.broadcast({'type': 'player_leave', 'id': player_id})
                print(f"  [-] {name} left — {len(self.players)} online")

    async def broadcast(self, message, exclude=None):
        msg_str = json.dumps(message)
        dead = []
        for pid, ws in self.connections.items():
            if pid == exclude:
                continue
            try:
                await ws.send(msg_str)
            except Exception:
                dead.append(pid)
        for pid in dead:
            self.connections.pop(pid, None)
            self.players.pop(pid, None)

    async def state_loop(self):
        """Broadcast all player positions at 20Hz."""
        while True:
            if self.players:
                await self.broadcast({
                    'type': 'state',
                    'players': list(self.players.values())
                })
            await asyncio.sleep(0.05)


# ─── HTTP Static File Handler (websockets v13-v15) ──────────
def serve_file(connection, request):
    """
    process_request handler for websockets.serve().
    In v13+, signature is (connection, request) where request is a Request object.
    Return a Response to serve HTTP, or None to proceed with WebSocket.
    """
    # Only intercept non-WebSocket requests (normal HTTP GET)
    if request.headers.get('Upgrade', '').lower() == 'websocket':
        return None  # Let it be handled as WebSocket

    url_path = request.path.split('?')[0]

    # ─── API Routes ────────────────────────────────────────
    if url_path.startswith('/api/'):
        return handle_api(request, url_path)

    # ─── Static Files ──────────────────────────────────────
    if url_path == '/':
        url_path = '/index.html'

    file_path = (ROOT_DIR / url_path.lstrip('/')).resolve()

    # Security: no directory traversal
    if not str(file_path).startswith(str(ROOT_DIR)):
        return Response(HTTPStatus.FORBIDDEN, "Forbidden\r\n", websockets.Headers())

    if not file_path.is_file():
        return Response(HTTPStatus.NOT_FOUND, "Not Found\r\n", websockets.Headers())

    try:
        body = file_path.read_bytes()
    except Exception:
        return Response(HTTPStatus.INTERNAL_SERVER_ERROR, "Server Error\r\n", websockets.Headers())

    ext = file_path.suffix.lower()
    content_type = MIME_MAP.get(ext, 'application/octet-stream')

    headers = websockets.Headers([
        ('Content-Type', content_type),
        ('Content-Length', str(len(body))),
        ('Cache-Control', 'no-cache'),
        ('Access-Control-Allow-Origin', '*'),
    ])

    return Response(HTTPStatus.OK, "", headers, body)


def handle_api(request, url_path):
    """Handle JSON API endpoints."""
    json_headers = websockets.Headers([
        ('Content-Type', 'application/json'),
        ('Access-Control-Allow-Origin', '*'),
        ('Access-Control-Allow-Headers', 'Content-Type'),
    ])

    # Parse body for POST requests
    try:
        body_str = request.body.decode() if hasattr(request, 'body') and request.body else '{}'
        data = json.loads(body_str) if body_str else {}
    except Exception:
        data = {}

    if url_path == '/api/register':
        email = data.get('email', '').strip()
        password = data.get('password', '')
        name = data.get('name', '')
        if not email or not password:
            resp_body = json.dumps({'error': 'กรุณากรอกอีเมลและรหัสผ่าน'}).encode()
            return Response(HTTPStatus.BAD_REQUEST, "", json_headers, resp_body)
        result = register_user(email, password, name)
        if result:
            resp_body = json.dumps(result).encode()
            print(f"  [📝] Registered: {email}")
            return Response(HTTPStatus.OK, "", json_headers, resp_body)
        else:
            resp_body = json.dumps({'error': 'อีเมลนี้ถูกใช้แล้ว'}).encode()
            return Response(HTTPStatus.CONFLICT, "", json_headers, resp_body)

    elif url_path == '/api/login':
        email = data.get('email', '').strip()
        password = data.get('password', '')
        if not email or not password:
            resp_body = json.dumps({'error': 'กรุณากรอกอีเมลและรหัสผ่าน'}).encode()
            return Response(HTTPStatus.BAD_REQUEST, "", json_headers, resp_body)
        result = login_user(email, password)
        if result:
            resp_body = json.dumps(result).encode()
            print(f"  [🔑] Login: {email}")
            return Response(HTTPStatus.OK, "", json_headers, resp_body)
        else:
            resp_body = json.dumps({'error': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'}).encode()
            return Response(HTTPStatus.UNAUTHORIZED, "", json_headers, resp_body)

    elif url_path == '/api/world':
        world_file = ROOT_DIR / 'world.json'
        if request.method == 'POST':
            # Save world state
            try:
                with open(world_file, 'w') as f:
                    json.dump(data, f)
                return Response(HTTPStatus.OK, "", json_headers, b'{"success":true}')
            except Exception as e:
                resp_body = json.dumps({'error': str(e)}).encode()
                return Response(HTTPStatus.INTERNAL_SERVER_ERROR, "", json_headers, resp_body)
        else:
            # Load world state
            if world_file.exists():
                body = world_file.read_bytes()
                return Response(HTTPStatus.OK, "", json_headers, body)
            else:
                return Response(HTTPStatus.OK, "", json_headers, b'{"objects":[]}')

    else:
        resp_body = json.dumps({'error': 'Not found'}).encode()
        return Response(HTTPStatus.NOT_FOUND, "", json_headers, resp_body)


# ─── Main ────────────────────────────────────────────────────
async def main():
    game = GameServer()
    asyncio.create_task(game.state_loop())

    async with websockets.serve(
        game.handler,
        "0.0.0.0",
        PORT,
        process_request=serve_file,
        max_size=2**20,
        ping_interval=30,
        ping_timeout=10,
    ):
        print()
        print("=" * 56)
        print("  🌐 13Store Metaverse — Online Server")
        print("=" * 56)
        print(f"  📡 http://localhost:{PORT}")
        print(f"  🔌 WebSocket on same port")
        print()
        print("  Deploy to Render.com or use ngrok for public access")
        print("=" * 56)
        print()
        await asyncio.Future()


if __name__ == '__main__':
    asyncio.run(main())
