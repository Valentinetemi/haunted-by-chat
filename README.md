### Haunted by Chat 👁️

A first-person browser horror game where **Twitch chat controls the scares**. You walk a harsh, white-lit school corridor smeared with blood, searching for the exit, while a rogue AI robot with a single glowing red eye hunts you. Your viewers decide when it strikes.

> What if AI takes over the world one day and becomes the monster we have to run from?

### Chat commands
| Type in chat | Effect |
|---|---|
| `f` or `!flicker` | Lights flicker |
| `w` or `!whisper` | A whisper appears: "behind you" |
| `s` or `!slam` | A door slams / camera shakes |
| `c` or `!hunt` | The hunter rushes you |

Get caught and you're **TERMINATED**.

### Run it
```bash
npm install
npm run dev
```
Open `http://localhost:5173/?channel=YOUR_TWITCH_NAME`, then open your Twitch chat (`twitch.tv/popout/YOUR_TWITCH_NAME/chat`) and type commands. No login or OAuth needed, since the game reads chat read-only.

### Controls
- WASD to move, mouse to look (click to lock the pointer)
- Test keys: `1` whisper, `2` flicker, `3` slam, `4` rush

### Built with
Vite, Three.js, tmi.js, and OpenAI Codex. The whole game was built in one Codex thread, one feature per commit.

### Author
Temiloluwa Valentine ([GitHub](https://github.com/Valentinetemi))
