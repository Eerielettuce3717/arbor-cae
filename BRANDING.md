# Arbor — brand brief

Field `#0A0C0F`. Paper `#FFFFFF`. Signal `#E85D04`.
No second accent. No gradient. No glow.

This suite is a bench tool: solids, T-splines, boards, toolpaths, and a local history tree. The name has to survive a purchasing meeting, a 16px favicon, and a machinist saying it without irony.

## Naming criteria

Real tools in this category are short, speakable, and slightly stubborn: Onshape, Altium, FreeCAD, Fornjot, KiCad, SolidWorks. They are not feature lists and they are not sci-fi.

A name was rejected if it:

- is a command already on the ribbon (`Sketch`, `Loft`, `Datum`, `Trace` as product names all fail this)
- sounds generated (`Quantum`, `Nexus`, `Synth`, `Aero`, `Omni`, `Cyber`)
- cannot be searched (`Via`, `Net`, `Fit`)
- collides with a CAD platform or a kernel (`Forge` / Autodesk Forge, `Spline` / spline.design, `Foundry` / The Foundry)

---

## Five names

### 1. Arbor — winner

**Pronunciation:** AR-bər
**What it is:** the shaft you mount a cutter or a workpiece on; also a tree.

Two meanings, both true. In the shop, an arbor is the thing everything else clamps to. In software, a tree is how history, features, and branches actually look. The product is the mount: Part Studio, PCB, CAM, and SQLite history are tools that seat on one local spindle.

It is not a ribbon command. It is one word. It sits next to SolidWorks in a sentence without shrinking. It is ownable in CAD; the collisions (Arbor Education, Arbor Networks) are other industries.

Lockup: **Arbor**. Not ArborCAD. Not Arbor Suite.

### 2. Locus

**Pronunciation:** LOH-kəs
**What it is:** the set of points that satisfy a condition; also “place.”

The most geometrically literate option. Local-first is literally the meaning: the work has a place, and the place is this machine. Engineers already say the word.

It loses to Arbor because Locus Robotics owns the name in industry, and because “locus” still sounds like a textbook heading rather than a tool on a dock.

### 3. Datum

**Pronunciation:** DAY-təm
**What it is:** the reference everything is measured from.

GD&T-native. Implies the origin does not move — which is the local-first argument. Serious, precise, enterprise.

It loses because every CAD system already has datums. Naming the suite after a feature is how you get a product that sounds like a panel. It also collides with “data” in any room that has a software buyer in it.

### 4. Trace

**Pronunciation:** trays
**What it is:** a copper route; a construction line; an audit trail.

The best single-word fusion of MCAD, ECAD, and versioning. One syllable, industrial, honest.

It loses because it is a command (trace a sketch, route a trace) and because it is unsearchable. There are a thousand Traces. A VP will ask “trace what?”

### 5. Kerf

**Pronunciation:** kurf
**What it is:** the width of a cut.

The most ownable word on the list. Precision as a gap, not as a slogan. Machinists and CAM people will get it in one beat.

It loses because it is a CAM idea, not a suite idea. It does not carry boards, T-splines, or history. Distinctive is not the same as representative.

---

## Winner

**Arbor.**

It is the only name that represents the whole machine without listing the modules. The arbor is the local axis. The tree is the version graph. The press is the shop. Nothing about it is decorative.

Short names for files and chrome:

| Use | Value |
| --- | --- |
| Product | Arbor |
| Wordmark | Arbor |
| package.json `name` | `arbor` |
| Tauri `productName` | `Arbor` |
| Window title | `Arbor` |
| Bundle id | leave `com.cadengine.app` (changing it breaks existing installs) |
| Theme storage key | leave `cad-engine-theme` until a planned migration |

## Mark

`app-icon.svg` — orange Y on mill-control black.

- Vertical member: arbor shaft / history root
- 45° member: mechanical edge
- Horizontal member: electrical trace
- Square joint: vertex, via, local origin

Solid fills only. Slate field, signal orange mark. Reads at 16px. Holds a dock.

## Color

| Token | Hex | Use |
| --- | --- | --- |
| Field | `#0A0C0F` | icon ground, dark chrome |
| Signal | `#E85D04` | mark, the only accent |
| Paper | `#FFFFFF` | wordmark on dark if needed; UI paper stays `#F3EEE6` |

These are the existing mill-control tokens, not stock Tailwind Slate 950 (`#020617`). 950 reads blue. The field here is a warm black, same family as a DRO.

---

## Codebase rename

Applied in this pass: root `package.json`, `src-tauri/tauri.conf.json` product/window/publisher copy, `web/app/layout.tsx` metadata.

```bash
# Product strings (already applied — re-run only on a fresh tree)
# package.json → "name": "arbor"
# src-tauri/tauri.conf.json → productName, windows[0].title, publisher, descriptions
# web/app/layout.tsx → metadata.title, applicationName

# Optional follow-ups. Do not change the bundle identifier.
# identifier stays com.cadengine.app

# Raster dock icons from the SVG (macOS, ImageMagick):
# magick app-icon.svg -resize 32x32   src-tauri/icons/32x32.png
# magick app-icon.svg -resize 128x128 src-tauri/icons/128x128.png
# magick app-icon.svg -resize 256x256 src-tauri/icons/128x128@2x.png

# Remaining user-facing strings if you want a clean sweep:
# rg -n 'CAD Engine|cad-engine|cadengine' --glob '!package-lock.json' --glob '!**/gen/**'
```

Leave `src-tauri` crate name `cad-engine` and `THEME_STORAGE_KEY` until you are ready to migrate installs and user prefs. Changing those is not a brand change; it is a compatibility change.
