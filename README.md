# Haunted by Chat 👁️

![Haunted by Chat cover artwork](public/assets/haunted-by-chat-cover.png)

A replayable first-person browser horror game set inside a haunted house. Search the entrance hall, living room, kitchen, bathroom, kid's bedroom, basement, and attic for five randomized keys while Mother hunts you.

The game is single-player by default. Twitch chat controls are available only when you explicitly choose **Streamer mode**.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` and choose **Play**.

For Streamer mode, add a Twitch channel to the URL and choose **Streamer mode** on the title screen:

```text
http://localhost:5173/?channel=yourname
```

The Twitch connection is anonymous and read-only. It does not use OAuth or require a sign-in.

## Goal and controls

- Find five glowing keys hidden in different rooms, then return to the front door and press `E` to escape.
- Use `WASD` to move and the mouse to look.
- Hold `Shift` to sprint while stamina lasts.
- Left-click to fire the stun blaster. Each run starts with three charges.
- Press `E` near a hiding spot to hide or leave.
- Press `Esc` to release the pointer and pause the timer.

Each run randomizes key locations, Mother's spawn, and scare timing. Collecting keys raises the tension: Mother becomes faster and dangerous scares become more frequent. The best escape time is saved in `localStorage`.

## Streamer commands

| Chat message | Effect |
| --- | --- |
| `f` or `!flicker` | Flicker the house lights |
| `w` or `!whisper` | Whisper “behind you” |
| `s` or `!slam` | Slam a nearby door |
| `c` or `!hunt` | Make Mother rush the player |

Autonomous scares remain active in Streamer mode, so the game never depends on chat activity.

## Production build

```bash
npm run build
npm run preview
```

The production files are written to `dist/`. Relative asset paths make the same build suitable for Vercel or a GitHub Pages repository path.

## Built with

Vite, Three.js, and tmi.js.

## Author

Temiloluwa Valentine ([GitHub](https://github.com/Valentinetemi))
