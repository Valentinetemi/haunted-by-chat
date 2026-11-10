# Haunted by Chat 👁️

![Haunted by Chat cover artwork](public/assets/haunted-by-chat-cover.jpg)

A replayable first-person browser horror game spanning a haunted house, moonlit graveyard courtyard, underground crypt, and fractured mirror realm. Zombie waves hit within seconds. Short missions pay cash on the spot. Mother is still the boss, and five keys are still the way out.

The game is single-player by default. Twitch chat controls are available only when you explicitly choose **Streamer mode**.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` and choose **Play**, pick a survivor, then **Deploy**.

For Streamer mode, add a Twitch channel to the URL and choose **Streamer mode** on the title screen:

```text
http://localhost:5173/?channel=yourname
```

The Twitch connection is anonymous and read-only. It does not use OAuth or require a sign-in.

## Goal and controls

- Find five keys, then return to the front door and press `E` to escape. Keys stay large and lit. A compass points at the active one.
- Waves of zombies (walkers, runners, crawlers, and a brute) hunt you. Headshots pay more. Kills build a streak.
- You have health. Zombies bite it down. Mother still ends the run if she reaches you.
- `1` revolver, `2` shotgun, `3` SMG, `4` or `G` grenade. Click fires. `R` reloads. The revolver starts with six bullets loaded and 24 in reserve. Kills and boxes add more bullets. Shotgun, SMG, and grenades can be found in the house.
- Cash from kills and missions is banked at the end of the run. Spend it on the menu to unlock the shotgun, the SMG, and the survivors Ash and Nico.
- Survivors: Vale is balanced, Rook reloads faster, June has more health, Ash carries more grenades, Nico moves faster. The choice is saved in `localStorage`.
- Missions pop up during the run (drop zombies, reach a room, survive the cellar) and pay cash, score, bullets, and health immediately.
- Press `E` near a hiding spot to hide or leave. Hiding still breaks Mother's sight. A close gunshot can give you away.
- Press `Esc` to release the pointer and pause. **Play again** restarts immediately. **Change survivor** returns to the picker.
- The best score and best escape time are saved in `localStorage`.

On a phone, rotate to landscape. Drag the left side to move, the right side to look, and use RUN, FIRE, GUN, NADE, RELOAD, and USE.

## Streamer commands

| Chat message | Effect |
| --- | --- |
| `f` or `!flicker` | Flicker the house lights |
| `w` or `!whisper` | Whisper “behind you” |
| `s` or `!slam` | Slam a nearby door |
| `c` or `!hunt` | Make Mother rush the player |
| `z` or `!zombie` | Spawn zombies near the player |
| `!horde` | Call an extra wave |

Autonomous scares and zombie waves remain active in Streamer mode, so the game never depends on chat activity.

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
