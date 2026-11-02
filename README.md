# Haunted by Chat

A first-person browser horror game controlled by the player and an anonymous, read-only Twitch chat connection.

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:5173/?channel=yourname](http://localhost:5173/?channel=yourname), replacing `yourname` with the Twitch channel to read. If the `channel` parameter is omitted, the game uses `YOURTWITCHNAME`.

No Twitch OAuth token is required. Chat commands are `!whisper`/`w`, `!flicker`/`f`, `!slam`/`s`, and `!hunt`/`c`.
