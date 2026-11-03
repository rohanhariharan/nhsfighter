# NHS FIGHTER

**Play it: https://rohanhariharan.github.io/nhsfighter/**

An 8-bit style 1-on-1 fighting game that runs in the browser. No build step, no
dependencies, no image or audio files — every fighter, stage, effect and sound is
generated in code.

```
open index.html
```

That's it. Double-clicking `index.html` works (plain `<script>` tags, nothing to
compile). If you prefer a local server:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

## Controls

| | Player 1 | Player 2 |
|---|---|---|
| Move | `A` / `D` | `J` / `L` |
| Jump | `W` | `I` |
| Crouch | `S` | `K` |
| Punch | `Q` | `U` |
| Kick | `E` | `O` |
| Block | hold **back** (away from the opponent) | hold **back** |

Global: `Enter` confirm · `Esc` pause · `M` mute

**Tilts** — direction + button changes the move

| Input | Move | What it does |
|---|---|---|
| `S` + `E` | **Sweep** | low hit, knocks down |
| `S` + `Q` | **Low Jab** | fast poke that hits crouchers |
| **Up + `Q`** | **Launcher** | uppercut that pops the opponent into the air |
| Jump + `Q` | **Dive Punch** | fast downward air punch |
| Jump + `E` | **Dive Kick** | longer-range air kick |

Jumps have a 3-frame wind-up, which is what makes `Up + Punch` reliable — press
up and punch together and you get the launcher instead of a jump.

**Specials** — `S`, then forward, then attack, *or* punch + kick together.
Costs 40 meter (the blue bar under your health).

**FINAL** — the desperation super. It unlocks only when the meter is completely
full **and** you are one round away from losing the match. When it is up, the
word `FINAL` blinks next to your meter and your special input becomes a 5-hit
flurry that costs the whole bar. Same input as your special, so it fires the
next time you reach for one — which is the drama of it. You give up your normal
special while it is charged.

Rounds are best of three, 60 seconds each.

---

## Roster

| Fighter | Role | Special |
|---|---|---|
| **ADAMYA** | agile — fastest walk, highest jump, light hits | *SHARDS* — two fast projectiles |
| **AARNAV** | tall reach — longer legs, heavier single hits | *RISE* — invincible rising uppercut |

**ADAMYA** — 96 health, speed 1.95, jump 7.8, weight 0.88, power 0.92, POW 2 / SPD 5 / RNG 4.
**AARNAV** — 104 health, speed 1.66, jump 7.1, weight 1.02, power 1.04, POW 3 / SPD 3 / RNG 5.

Aarnav is about 8px taller, which is also why he reaches further and gets hit
higher. Best of three rounds, three stages; the CPU picks either fighter at
Easy / Normal / Hard.

---

## How it is built

```
index.html          loads everything, in order
styles.css          page chrome + CRT scanline overlay
js/config.js        ALL tuning: physics, move frame data, characters, stages
js/font.js          5x7 bitmap font (no font files)
js/audio.js         WebAudio synth for every sound effect
js/input.js         keyboard -> per-player input, edge detection, motion buffer
js/sprite.js        the character: palette, geometry, one pose per state
js/art.js           sparks, projectiles, ground shadows
js/stages.js        three procedurally drawn stages
js/fighter.js       Fighter + the per-fighter state machine + hit resolution
js/ai.js            CPU opponent (produces the same input object a human does)
js/hud.js           health / meter / timer / combo
js/game.js          scenes, rounds, main loop
```

### The state machine

Each fighter owns exactly one state at a time:

```
idle, walkF, walkB, crouch, block, blockLow, jump, land,
attack, hit, hitAir, blockStun, knockdown, getup, ko, victory
```

Every state has `enter()`, `update()` and `exit()` in `js/fighter.js`. A state
decides what happens next by calling `f.setState('...')`. `attack` is
data-driven — it plays whatever move sits in `f.move`, so all normals and
specials share one state.

### Art per state

`js/sprite.js` is the character renderer, and each fighter supplies its own
`look` and `body` in `config.js`:

- **`look`** — palette: skin, hair, shirt, jeans, shoe, glasses, lens
- **`body`** — geometry overrides: `lift` (taller/shorter legs), hair length,
  head/torso sizes
- **`S`** — the shared pose table, expressed as hand and foot positions in pixels

So a new fighter is a `look` object, a `body` object and a stat line — the pose
table and all the drawing code are reused as-is.

Everything is flat rectangles drawn straight to the canvas — no outlines, no
sprite sheet, no pixel buffer, no cache. `body.lift` slides the whole upper body
up or down and lets the legs stretch to the ground, which is how Aarnav ends up
taller without a second set of poses.

Knockdowns and KOs use a separate horizontal block layout, and walk/idle/final
alternate two poses. Attacks reuse a shared wind-up pose during startup.

### Hit resolution

`Fighter.hitbox()` returns the active attack box during the startup/active
frames in `config.js`; `Fighter.hurtbox()` returns the body box for the current
state (crouching shrinks it, knockdowns widen it). One hit per attack is
enforced by `hitDone`. Blocking checks the defender's current state, so a block
must already be held when the hit lands.

---

## Tweaking it

Everything gameplay-facing lives in `js/config.js`:

- `GRAVITY`, `GROUND`, `PUSH_DIST`, `ROUND_FRAMES`
- `MOVES` — startup / active / recovery frames, damage, hitstun, knockback,
  hitbox rectangles, meter cost. Multi-hit moves use `hits` + `hitEvery`.
- `FINAL` — when the desperation super unlocks: `roundThreat` (one more loss
  ends the match), or `lowHealth` + `lowHealthPct`. Flip those to change the
  trigger.
- `CHARS` — health, speed, jump, weight, damage multiplier, palette, special,
  projectile stats, select-screen stats

Add a fighter by appending to `CHARS` (with `head:` set to `band`, `block`,
`horns` or `knot`). Add a stage by appending to `STAGES` and adding a draw
function in `js/stages.js`.

## Notes

- Fixed 60 Hz simulation with an accumulator, so frame data is deterministic.
- Rendering is at 384×216 and integer-scaled with nearest-neighbour filtering,
  which is where the chunky look comes from.
- No external requests: works offline and from `file://`.
