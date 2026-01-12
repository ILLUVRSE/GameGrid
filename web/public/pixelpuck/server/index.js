import { createServer } from "http";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import { advanceMatch, applyActions, clamp, createMatchState, resetPositions, updateBots } from "../src/hockey94/sim.mjs";

const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const TICK_RATE = 30;
const BROADCAST_RATE = 30;
const ADMIN_CODE = "79265";
const MAX_FRAME_DT = 0.1;
const createRoom = (code, options = {}) => {
  const match = createMatchState();
  match.players = match.players.map((player) => ({
    ...player,
    connected: false,
    token: null,
    lastSeq: 0,
    ws: null,
  }));
  match.phase = "lobby";
  return {
    code,
    ...match,
    started: false,
    lastTick: Date.now(),
    lastBroadcast: 0,
    interval: null,
    allowBots: Boolean(options.allowBots),
    autoStartBots: Boolean(options.autoStartBots),
    hostId: null,
  };
};

const startRoom = (room) => {
  if (room.started) return;
  room.started = true;
  room.phase = "playing";
  resetPositions(room);
};

const rooms = new Map();

const generateCode = () => {
  let code = "";
  do {
    code = formatCode(Math.floor(Math.random() * 100000));
  } while (rooms.has(code));
  return code;
};

const formatCode = (code) => code.toString().padStart(5, "0");

const getPlayerSummary = (room) =>
  room.players.map((player) => ({
    slot: player.slot,
    team: player.team,
    connected: player.connected,
  }));

const broadcast = (room, message) => {
  room.players.forEach((player) => {
    if (player.ws && player.ws.readyState === 1) {
      player.ws.send(JSON.stringify(message));
    }
  });
};

const startRoomLoop = (room) => {
  if (room.interval) return;
  room.lastTick = Date.now();
  room.accumulator = 0;
  const tick = () => {
    const now = Date.now();
    const frameDt = Math.min(MAX_FRAME_DT, (now - room.lastTick) / 1000);
    room.lastTick = now;
    if (room.started) {
      if (room.allowBots) {
        updateBots(room, (player) => !player.connected);
      }
      if (room.phase === "playing") {
        applyActions(room, frameDt);
      }
      advanceMatch(room, frameDt);
    }

    if (now - room.lastBroadcast >= 1000 / BROADCAST_RATE) {
      room.lastBroadcast = now;
      if (room.started) {
        broadcast(room, {
          type: "state",
          state: {
            t: now,
            players: room.players.map((player) => ({
              id: player.id,
              team: player.team,
              x: player.x,
              y: player.y,
              vx: player.vx,
              vy: player.vy,
              dirX: player.dirX,
              dirY: player.dirY,
              seq: player.lastSeq,
              shootCharge: player.shootCharge,
              stamina: player.stamina,
            })),
            puck: {
              x: room.puck.x,
              y: room.puck.y,
              vx: room.puck.vx,
              vy: room.puck.vy,
              ownerId: room.puck.ownerId,
            },
            goalies: room.goalies
              ? {
                  home: { ...room.goalies.home },
                  away: { ...room.goalies.away },
                }
              : null,
            events: room.events ? { ...room.events } : null,
            physics: room.physics ? { ...room.physics } : null,
            shotEvent: room.shotEvent ? { ...room.shotEvent } : null,
            scores: room.scores,
            phase: room.phase === "goal" ? "playing" : room.phase,
          },
        });
      }
      broadcast(room, {
        type: "lobby",
        players: getPlayerSummary(room),
        started: room.started,
      });
    }
  };
  room.interval = setInterval(tick, 1000 / TICK_RATE);
};

const assignPlayer = (room, ws, token) => {
  let player = null;
  if (token) {
    player = room.players.find((slot) => slot.token === token && !slot.connected);
  }
  if (!player) {
    player = room.players.find((slot) => !slot.connected && !slot.token);
  }
  if (!player) return null;
  player.connected = true;
  player.ws = ws;
  player.allowSprint = true;
  player.moveX = 0;
  player.moveY = 0;
  player.actions.shoot = false;
  player.actions.pass = false;
  player.actions.check = false;
  player.actions.switch = false;
  if (!player.token) player.token = crypto.randomBytes(8).toString("hex");
  return player;
};

const maybeStartRoom = (room) => {
  const connectedCount = room.players.filter((player) => player.connected).length;
  if (connectedCount === 6 && !room.started) {
    startRoom(room);
  }
  if (room.allowBots && room.autoStartBots && connectedCount > 0 && !room.started) {
    startRoom(room);
  }
};

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (error) {
      return;
    }

    if (message.type === "create_room") {
      const code = generateCode();
      const room = createRoom(code, {
        allowBots: message.allowBots === true,
        autoStartBots: message.autoStartBots === true,
      });
      rooms.set(code, room);
      const player = assignPlayer(room, ws, null);
      if (!player) return;
      ws.roomCode = code;
      ws.playerId = player.id;
      room.hostId = player.id;
      startRoomLoop(room);
      maybeStartRoom(room);
      ws.send(
        JSON.stringify({
          type: "room_created",
          code,
          playerId: player.id,
          team: player.team,
          token: player.token,
          host: true,
        })
      );
      broadcast(room, { type: "lobby", players: getPlayerSummary(room), started: room.started });
      return;
    }

    if (message.type === "join_room") {
      const code = formatCode(message.code || "");
      let room = rooms.get(code);
      if (!room && code === ADMIN_CODE) {
        room = createRoom(code, { allowBots: true, autoStartBots: true });
        rooms.set(code, room);
        startRoomLoop(room);
      }
      if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found." }));
        return;
      }
      const player = assignPlayer(room, ws, message.token);
      if (!player) {
        ws.send(JSON.stringify({ type: "error", message: "Room Full" }));
        return;
      }
      ws.roomCode = code;
      ws.playerId = player.id;
      ws.send(
        JSON.stringify({
          type: "room_joined",
          code,
          playerId: player.id,
          team: player.team,
          token: player.token,
          host: false,
        })
      );
      maybeStartRoom(room);
      broadcast(room, { type: "lobby", players: getPlayerSummary(room), started: room.started });
      return;
    }

    if (message.type === "start_match") {
      const room = rooms.get(ws.roomCode);
      if (!room) return;
      if (ws.playerId !== room.hostId) return;
      startRoom(room);
      broadcast(room, { type: "lobby", players: getPlayerSummary(room), started: room.started });
      return;
    }

    if (message.type === "input") {
      const room = rooms.get(ws.roomCode);
      if (!room) return;
      const player = room.players[ws.playerId];
      if (!player) return;
      const seq = Number(message.seq || 0);
      if (seq <= player.lastSeq) return;
      player.lastSeq = seq;
      const input = message.input || {};
      let moveX = clamp(Number(input.x || 0), -1, 1);
      let moveY = clamp(Number(input.y || 0), -1, 1);
      const length = Math.hypot(moveX, moveY);
      if (length > 1) {
        moveX /= length;
        moveY /= length;
      }
      player.moveX = moveX;
      player.moveY = moveY;
      const buttons = Number(input.buttons || 0);
      const held = Number(input.held || 0);
      player.actions.shoot = (buttons & 1) === 1;
      player.actions.pass = (buttons & 2) === 2;
      player.actions.check = (buttons & 4) === 4;
      player.actions.switch = (buttons & 8) === 8;
      player.shootHeld = (held & 1) === 1 || player.actions.shoot;
      return;
    }

    if (message.type === "ping") {
      ws.send(
        JSON.stringify({
          type: "pong",
          time: Number(message.time || 0),
          serverTime: Date.now(),
        })
      );
    }
  });

  ws.on("close", () => {
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const player = room.players[ws.playerId];
    if (!player) return;
    player.connected = false;
    player.ws = null;
    player.allowSprint = false;
    player.moveX = 0;
    player.moveY = 0;
    player.actions.shoot = false;
    player.actions.pass = false;
    player.actions.check = false;
    player.actions.switch = false;
    broadcast(room, { type: "lobby", players: getPlayerSummary(room), started: room.started });
  });
});

server.listen(PORT, () => {
  console.log(`PixelPuck hockey94 server listening on ${PORT}`);
});
