#!/usr/bin/env python3
"""Servidor para jugar Crisol de Éter en equipo dentro de la misma red Wi-Fi.

Uso:  python3 tools/servidor.py [puerto] [--nueva]

Sirve los archivos del juego y, en /equipo, una conexión WebSocket por jugador. Todos comparten el mundo,
la mochila, el crisol, el flux y las recetas. El servidor guarda la partida en partida-equipo.json (junto a
index.html); --nueva la empieza de cero. Solo usa la biblioteca estándar de Python y no necesita internet.

Protocolo (mensajes JSON):
  jugador → servidor  hola {name} · ops {seq, ops} · pos {p, a, ms} · nombre {name} · aviso {text}
                      mobs {ms, list, ev} (solo el guía) · mobhit {id, k, x, z} (al guía)
  servidor → jugador  bienvenida {id, color, state, players, leader, dirs} · ops {from, ops} · estado {state, ack}
                      mobs {ms, list, ev} · mobhit {from, id, k, x, z} · pos {id, p, a, ms} · entra {player} · sale {id} · nombre {id, name} · lider {id} · hora {time} · aviso {id, text}
Las ops son cambios del estado compartido (ver applyOp en js/net.js, que aplica las mismas reglas que apply_op aquí).
"""
import base64
import hashlib
import json
import math
import mimetypes
import os
import queue
import socket
import struct
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAVE = ROOT / "partida-equipo.json"
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MAX_MSG = 512 * 1024
DAY_LEN = 480  # igual que en js/render.js
COLORS = ["#d9534f", "#5b9bd5", "#7fbf5a", "#e0a03c", "#9a62b0", "#59d0d6", "#e8e2cf", "#c4579f"]

SH_N = {"flux", "mined", "rifts", "fuel", "vis"}          # números: se suman diferencias
SH_M = {"inv", "cru", "bl"}                # cantidades por clave: se suman y se borran al llegar a 0
SH_S = {"world", "placed", "resp"}         # valor por clave: gana el último
SH_U = {"scanned", "res"}                  # listas sin repetidos: se unen
SH_V = {"won", "rsch"}                     # valor entero: gana el último


def fresh():
    return {"inv": {}, "cru": {}, "bl": {}, "flux": 5, "mined": 0, "rifts": 0, "world": {}, "placed": {}, "resp": {},
            "scanned": [], "res": ["sal", "tiza"], "won": False, "rsch": None, "time": .06, "fuel": 0, "vis": 60}


def isnum(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def apply_op(st, op):
    """Aplica una op validada al estado. Lanza ValueError si la op no es válida."""
    if not isinstance(op, list) or not op:
        raise ValueError("op")
    kind, f = op[0], op[1] if len(op) > 1 else None
    if kind == "n" and f in SH_N and len(op) == 3 and isnum(op[2]):
        st[f] += op[2]
    elif kind == "m" and f in SH_M and len(op) == 4 and isinstance(op[2], str) and len(op[2]) <= 24 and isnum(op[3]):
        v = st[f].get(op[2], 0) + op[3]
        if v > 0:
            st[f][op[2]] = v
        else:
            st[f].pop(op[2], None)
    elif kind == "s" and f in SH_S and len(op) == 4 and isinstance(op[2], str) and len(op[2]) <= 32:
        val = op[3]
        ok = (val is None or (f == "world" and isinstance(val, int) and 0 <= val < 64)
              or (f == "placed" and val == 1)
              or (f == "resp" and isinstance(val, dict) and isinstance(val.get("id"), int) and isnum(val.get("t"))))
        if not ok:
            raise ValueError("valor")
        if val is None:
            st[f].pop(op[2], None)
        else:
            st[f][op[2]] = val
    elif kind == "u" and f in SH_U and len(op) == 3 and isinstance(op[2], str) and len(op[2]) <= 24:
        if op[2] not in st[f] and len(st[f]) < 500:
            st[f].append(op[2])
    elif kind == "v" and f in SH_V and len(op) == 3:
        if f == "won" and not isinstance(op[2], bool):
            raise ValueError("won")
        if f == "rsch" and not (op[2] is None or isinstance(op[2], dict)):
            raise ValueError("rsch")
        st[f] = op[2]
    else:
        raise ValueError("op")


def lan_addresses(port):
    """Direcciones con las que otros equipos de la Wi-Fi pueden abrir el juego."""
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))  # no envía nada: solo elige la interfaz de la red local
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return [f"http://{ip}:{port}" for ip in sorted(ips) if not ip.startswith("127.")]


class Game:
    def __init__(self, nueva):
        self.lock = threading.Lock()
        self.clients = {}
        self.next_id = 1
        self.leader = None
        self.dirty = False
        self.state = fresh()
        if SAVE.exists() and not nueva:
            try:
                saved = json.loads(SAVE.read_text(encoding="utf-8"))
                self.state.update({k: v for k, v in saved.items() if k in self.state})
            except (OSError, ValueError):
                print("No pude leer partida-equipo.json: empiezo una partida nueva.")

    # --- envío (siempre con self.lock tomado, para que cada jugador reciba los mensajes en orden)
    def send(self, c, msg):
        c.out.put(json.dumps(msg, separators=(",", ":")))

    def broadcast(self, msg, skip=None):
        for c in self.clients.values():
            if c is not skip:
                self.send(c, msg)

    def pick_leader(self):
        new = min(self.clients) if self.clients else None
        if new != self.leader:
            self.leader = new
            if new is not None:
                self.broadcast({"t": "lider", "id": new})

    def player_info(self, c):
        return {"id": c.id, "name": c.name, "color": c.color, "p": c.pos}

    # --- mensajes de un jugador
    def handle(self, c, msg):
        t = msg.get("t")
        with self.lock:
            c.seen = time.time()
            if t == "hola" and c.id is None:
                c.id = self.next_id
                self.next_id += 1
                used = {o.color for o in self.clients.values()}
                c.color = next((col for col in COLORS if col not in used), COLORS[c.id % len(COLORS)])
                c.name = clean_name(msg.get("name")) or f"Jugador {c.id}"
                self.clients[c.id] = c
                self.send(c, {"t": "bienvenida", "id": c.id, "color": c.color, "state": self.state,
                              "players": [self.player_info(o) for o in self.clients.values()],
                              "leader": self.leader if self.leader is not None else c.id, "dirs": DIRS})
                self.broadcast({"t": "entra", "player": self.player_info(c)}, skip=c)
                self.pick_leader()
                print(f"Entró {c.name} ({len(self.clients)} en línea)")
            elif c.id is None:
                return
            elif t == "ops" and isinstance(msg.get("ops"), list) and isnum(msg.get("seq")):
                ok = []
                for op in msg["ops"]:
                    try:
                        apply_op(self.state, op)
                        ok.append(op)
                    except (ValueError, TypeError, KeyError, IndexError):
                        pass
                c.ack = msg["seq"]
                if ok:
                    self.dirty = True
                    self.broadcast({"t": "ops", "from": c.id, "ops": ok}, skip=c)
            elif t == "pos" and isinstance(msg.get("p"), list) and len(msg["p"]) == 5 and all(isnum(v) for v in msg["p"]) and isnum(msg.get("ms")):
                c.pos = msg["p"]
                self.broadcast({"t": "pos", "id": c.id, "p": c.pos, "a": 1 if msg.get("a") else 0, "ms": msg["ms"]}, skip=c)
            elif t == "mobs" and c.id == self.leader and isinstance(msg.get("list"), list) and len(msg["list"]) <= 64 \
                    and isinstance(msg.get("ev", []), list) and len(msg.get("ev", [])) <= 32 and isnum(msg.get("ms")):
                # criaturas: las simula el guía y se reenvían tal cual al resto
                self.broadcast({"t": "mobs", "ms": msg["ms"], "list": msg["list"], "ev": msg.get("ev", [])}, skip=c)
            elif t == "mobhit" and c.id != self.leader and self.leader in self.clients and isinstance(msg.get("id"), str) \
                    and msg.get("k") == "golpe" and isnum(msg.get("x", 0)) and isnum(msg.get("z", 0)):
                self.send(self.clients[self.leader], {"t": "mobhit", "from": c.id, "id": msg["id"][:24], "k": msg["k"],
                                                      "dmg": msg.get("dmg", 1) if msg.get("dmg") in (1, 2, 3) else 1,
                                                      "x": msg.get("x", 0), "z": msg.get("z", 0)})
            elif t == "nombre":
                c.name = clean_name(msg.get("name")) or c.name
                self.broadcast({"t": "nombre", "id": c.id, "name": c.name})
            elif t == "aviso" and isinstance(msg.get("text"), str):
                self.broadcast({"t": "aviso", "id": c.id, "text": msg["text"][:160]}, skip=c)

    def leave(self, c):
        with self.lock:
            if c.id in self.clients:
                del self.clients[c.id]
                self.broadcast({"t": "sale", "id": c.id})
                self.pick_leader()
                print(f"Salió {c.name} ({len(self.clients)} en línea)")
        c.out.put(None)

    # --- reloj: hora del día, resincronización, guardado y jugadores que se quedaron sin señal
    def clock(self):
        tick = 0
        while True:
            time.sleep(.5)
            tick += 1
            with self.lock:
                e = math.sin(self.state["time"] * math.pi * 2)
                daylight = max(0, min(1, (e + .12) / .32))
                self.state["time"] = (self.state["time"] + .5 / DAY_LEN * (2 if daylight < .5 else 1)) % 1
                if tick % 4 == 0:
                    self.broadcast({"t": "hora", "time": self.state["time"]})
                if tick % 20 == 0:
                    for c in self.clients.values():
                        self.send(c, {"t": "estado", "state": self.state, "ack": c.ack})
                        if time.time() - c.seen > 20:
                            c.kill()
                if tick % 20 == 0 and self.dirty:
                    self.dirty = False
                    self.save()

    def save(self):
        try:
            tmp = SAVE.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.state, separators=(",", ":")), encoding="utf-8")
            os.replace(tmp, SAVE)
        except OSError as err:
            print("No pude guardar la partida:", err)


def clean_name(n):
    if not isinstance(n, str):
        return ""
    return "".join(ch for ch in n if ch.isprintable()).strip()[:16]


class Client:
    def __init__(self, sock):
        self.sock = sock
        self.out = queue.Queue()
        self.id = None
        self.name = ""
        self.color = COLORS[0]
        self.pos = None
        self.ack = 0
        self.seen = time.time()

    def writer(self):
        while True:
            msg = self.out.get()
            if msg is None:
                return
            data = msg.encode("utf-8")
            n = len(data)
            head = bytes([0x81, n]) if n < 126 else bytes([0x81, 126]) + struct.pack(">H", n) if n < 65536 else bytes([0x81, 127]) + struct.pack(">Q", n)
            try:
                self.sock.sendall(head + data)
            except OSError:
                self.kill()
                return

    def kill(self):
        try:
            self.sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass  # sin una línea por cada archivo servido

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self.path == "/equipo" and self.headers.get("Upgrade", "").lower() == "websocket":
            return self.websocket()
        if self.path.split("?")[0] == "/js/equipo.js":
            body = b"// Servido por tools/servidor.py: partida en equipo.\nconst EQUIPO=true;\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if self.path.split("?")[0].endswith(".json"):
            return self.send_error(404)  # la partida guardada no se sirve
        return super().do_GET()

    def websocket(self):
        key = self.headers.get("Sec-WebSocket-Key", "")
        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        self.send_response(101)
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept)
        super().end_headers()
        self.close_connection = True
        c = Client(self.connection)
        threading.Thread(target=c.writer, daemon=True).start()
        try:
            while True:
                text = self.read_message()
                if text is None:
                    break
                try:
                    msg = json.loads(text)
                except ValueError:
                    continue
                if isinstance(msg, dict):
                    GAME.handle(c, msg)
        except (OSError, ValueError, struct.error):
            pass
        finally:
            GAME.leave(c)

    def read_message(self):
        parts = []
        size = 0
        while True:
            head = self.rfile.read(2)
            if len(head) < 2:
                return None
            fin, op, masked, n = head[0] & 0x80, head[0] & 0x0F, head[1] & 0x80, head[1] & 0x7F
            if n == 126:
                n = struct.unpack(">H", self.rfile.read(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self.rfile.read(8))[0]
            size += n
            if size > MAX_MSG:
                raise ValueError("mensaje demasiado grande")
            mask = self.rfile.read(4) if masked else b"\0\0\0\0"
            data = bytearray(self.rfile.read(n))
            if len(data) < n:
                return None
            for i in range(n):
                data[i] ^= mask[i % 4]
            if op == 8:  # cierre
                return None
            if op in (9, 10):  # ping / pong: los navegadores no los mandan; se ignoran
                continue
            parts.append(bytes(data))
            if fin:
                return b"".join(parts).decode("utf-8", "replace")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = int(args[0]) if args else 8000
    mimetypes.add_type("font/woff", ".woff")
    mimetypes.add_type("text/javascript", ".js")
    DIRS = lan_addresses(port)
    GAME = Game(nueva="--nueva" in sys.argv)
    threading.Thread(target=GAME.clock, daemon=True).start()
    httpd = ThreadingHTTPServer(("0.0.0.0", port), partial(Handler, directory=str(ROOT)))
    httpd.daemon_threads = True
    print("Crisol de Éter · partida en equipo")
    print(f"  En este equipo:          http://localhost:{port}")
    for d in DIRS:
        print(f"  Desde la misma Wi-Fi:    {d}")
    if not DIRS:
        print("  (no encontré la dirección de la red local: búscala en la configuración de Wi-Fi de este equipo)")
    print("Ctrl+C para cerrar. La partida se guarda en partida-equipo.json.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        with GAME.lock:
            GAME.save()
        print("\nPartida guardada. ¡Hasta luego!")
