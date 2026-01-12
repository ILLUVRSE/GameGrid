# PixelPuck

## NHL '94 3v3 Online (WebSocket)

### Run the server

```bash
cd pixelpuck/server
npm install
npm start
```

The WebSocket server defaults to port 8080. You can change it with `PORT`:

```bash
PORT=8080 npm start
```

### Serve the client

From the `pixelpuck/` folder, run any static server. Example:

```bash
cd pixelpuck
python3 -m http.server 5173
```

Open the app at `http://localhost:5173` (or your host IP).

### Host and join

1. Go to **3v3 Arcade Hockey (NHL '94 Mode)**.
2. Click **Host Game** to create a room and get a 5-digit code.
3. Share the code with the other five players.
4. Others choose **Join Game** and enter the code.
5. The match starts automatically when all 6 players are connected.

### Notes

- Server URL defaults to `ws://<host>:8080`. You can override it in the Server field.
- If a player disconnects, their slot is reserved so they can rejoin with the same room code.
- Admin/demo code: join room `79265` to start immediately with bot-controlled skaters filling empty slots.
