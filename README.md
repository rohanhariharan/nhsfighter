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

| Fighter | Role | Special | Ability |
|---|---|---|---|
| **ADAMYA** | agile — fastest walk, highest jump, light hits | *SHARDS* — two fast projectiles | **FLOW** — while charged: **ATK+30% / DEF+30%**, free specials **and** a double jump |
| **AARNAV** | tall reach — longer legs, heavier single hits | *RISE* — invincible rising uppercut | **IRON** — absorbs one hit; his special buffs **ATK/DEF scaled by gauge fill**, up to +50% |
| **ROHAN** | balanced — mid speed, mid range | *RUSH* — armoured charging shoulder | **DODGE** — 4 charges, slips one attack each; +50% speed while stocked, −40% after all four |

| | height | health | speed | jump | power | POW/SPD/RNG |
|---|---|---|---|---|---|---|
| Adamya | 47 | 96 | 1.95 | 7.8 | 0.92 | 2/5/4 |
| Rohan | 50 | 100 | 1.78 | 7.4 | 0.98 | 3/4/4 |
| Aarnav | 55 | 104 | 1.66 | 7.1 | 1.04 | 3/3/5 |

Best of three rounds, three stages; the CPU picks any fighter at Easy / Normal / Hard.

### Abilities

Under each fighter's meter is a thinner, four-segment bar — their personal
gauge. Buffs appear as badges above the health bar (blue arrow = up, red arrow =
down).

- **FLOW** (Adamya) — while the gauge is full he is buffed: **ATK +30%**,
  **DEF +30%** (takes 30% less), specials cost no meter, and he gets one extra
  jump in the air. Spending a special burns the whole charge and takes all of it
  away until the gauge refills.
- **IRON** (Aarnav) — a full gauge absorbs one clean hit for zero damage. Every
  *RISE* also grants an ATK/DEF buff whose size is **proportional to how full the
  gauge is**: +50%/+50% at a full bar, +25%/+25% at half, and nothing at empty.
  Lasts 8 seconds, snapshot at the moment he casts.
- **DODGE** (Rohan) — four charges. Any unblocked hit is slipped entirely (i-frames
  + phase-out), burning one charge. While stocked at 4 he moves **+50%** faster;
  burn all four and he's stuck at **−40%** speed for five seconds.

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
- Rendering is at 384×216 and scaled to fill the window with nearest-neighbour
  filtering — snapping to a whole-number scale when it's close, which is where
  the chunky look comes from.
- No external requests: works offline and from `file://`.
