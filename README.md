# Tug & Learn — Two-Screen Online Game

This version replaces the experimental PeerJS connection with a small Node.js + Socket.IO server. The game uses one website URL on both phones.

## How it works

1. Phone 1 opens the website and chooses **Two-Screen Online Game → Create Room**.
2. Phone 1 chooses the game and level and receives a short room code such as `TUG-7K4P`.
3. Phone 2 opens the **same website**, chooses **Join Room**, and enters the code.
4. Phone 1 starts the game automatically when Phone 2 joins.
5. The server keeps the Blue/Red scores synchronized.
6. A team wins when it has **5 more correct answers** than the other team.

No third screen is required.

## Run it on a computer

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

For two phones on the same Wi-Fi, use the computer's local network address (for example `http://192.168.1.50:3000`) if the network/firewall allows it.

## Put it online

Deploy this folder to a Node.js host that supports a long-running WebSocket/Socket.IO server. Typical deployment settings are:

- Build/install command: `npm install`
- Start command: `npm start`
- Node version: 18 or newer

After deployment you will receive one HTTPS website address. Both phones use that same address.

Free hosting availability and limits change over time, so check the provider's current plan before deploying. You do not need a custom domain to use the game.

## Important

The room list is kept in the server's memory. Rooms are temporary and disappear when both players leave or the server restarts. This is intentional for a simple classroom game and means there is no database to configure.
