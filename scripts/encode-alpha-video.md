# encode-alpha-video

Encodes a chroma-keyed video (green, blue, or black background) into a real-alpha
`.webm` (VP9 + `yuva420p` + `alpha_mode=1`). This is "pre-rendered alpha
transparency" — Chromium plays it natively in a plain `<video>` element, with no
runtime chroma-key filter (no Pixi/WebGL shader) involved. This is how
[`LobbyBackgroundLayer.tsx`](../src/screens/LobbyBackgroundLayer.tsx) and the
draw-result videos (`local-media/Videos/*/*.webm`) get their transparency.

## Requirements

`ffmpeg` and `ffprobe` on your `PATH`. On Windows:

```bash
winget install --id Gyan.FFmpeg -e
```

Restart your shell afterward so the updated `PATH` takes effect. If the script
can't find them automatically (see [Troubleshooting](#troubleshooting)), pass
`--ffmpeg <path>` / `--ffprobe <path>` explicitly.

## Usage

```bash
node scripts/encode-alpha-video.mjs [options] [source] [destination]
# or
npm run encode-alpha-video -- [options] [source] [destination]
```

`source` and `destination` are both optional and default to the lobby loop this
script was built for:

- source: `local-media/Lobby/lobby_loop.mp4`
- destination: `local-media/Lobby/lobby_loop.webm`

Running it with no arguments re-encodes that file in place.

### Single file, custom paths

```bash
node scripts/encode-alpha-video.mjs local-media/Videos/9/9_2.mp4
```

With one argument, the destination defaults to the same file name next to the
source, with a `.webm` extension.

```bash
node scripts/encode-alpha-video.mjs source.mp4 output/wherever.webm
```

### A whole folder

If `source` is a directory, every file in it matching `--ext` (default
`.mp4,.mov`) gets encoded. `destination` is treated as an output directory
(created if it doesn't exist) — each file becomes `<name>.webm` there. If
`destination` is omitted, output files are written alongside the source files.

```bash
node scripts/encode-alpha-video.mjs local-media/RawRenders local-media/Videos/12
```

### Options

| Flag | Default | What it does |
| --- | --- | --- |
| `--key-color <hex>` | auto-detected | Chroma key color, e.g. `0x00ff00`. The script samples a corner pixel of each source video when this is omitted — override it if the auto-detected color looks wrong (see [Troubleshooting](#troubleshooting)). |
| `--despill <blue\|green\|none>` | inferred from key color | Suppresses color spill bleeding into semi-transparent edge pixels. Inferred as `none` for dark/near-black keys, `blue`/`green` otherwise. Only blue/green are supported (VP9 alpha spill suppression doesn't have a red mode). |
| `--similarity <0-1>` | `0.16` | `colorkey` similarity — how close a pixel's color needs to be to the key color to become transparent. Higher = keys out more (risk: eats real content). Lower = keys out less (risk: leftover background halo). |
| `--blend <0-1>` | `0.12` | `colorkey` edge softness — the width of the transition band between fully transparent and fully opaque. |
| `--fps <n>` | source fps (auto-detected) | Force an output frame rate instead of matching the source. |
| `--crf <n>` | `32` | VP9 quality. Lower = better quality and bigger file, higher = smaller and blurrier. |
| `--ext <.mp4,.mov>` | `.mp4,.mov` | Extensions to pick up in folder mode. |
| `--ffmpeg <path>` | auto-detected | Path to the `ffmpeg` binary. |
| `--ffprobe <path>` | auto-detected | Path to the `ffprobe` binary. |
| `--dry-run` | off | Prints the plan (key color, despill, fps, source/dest paths) for every file without encoding anything. Always run this first on an unfamiliar source. |

Run `node scripts/encode-alpha-video.mjs --help` any time for this same summary
inline.

## Verifying the result

The script can't verify Chromium's alpha decode itself (see the flakiness note
below), so check the output manually:

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=r_frame_rate,width,height \
  -show_entries stream_tags=alpha_mode \
  -of default=noprint_wrappers=1 \
  path/to/output.webm
```

You want to see `ALPHA_MODE=1` in the tags and the `r_frame_rate` matching what
you expected. That confirms the file is *tagged* correctly — it does not prove
Chromium will actually render it transparently (`ffprobe`/`ffmpeg` decode VP9
alpha differently than Chromium does), so also load it in the app and eyeball
it behind something non-black.

## Troubleshooting

**"Could not find ffmpeg on PATH"**
Install it (see [Requirements](#requirements)) and open a new shell, or pass
`--ffmpeg <path>` / `--ffprobe <path>` directly.

**The auto-detected key color looks wrong / output has a colored halo around
the subject**
The auto-detect samples the pixel at `(5, 5)` (near the top-left corner) of the
frame at `t=1s`. If the source doesn't have a clean background right there —
intro animation, subject in that corner, watermark, etc. — the sample will be
wrong. Pass `--key-color 0x<hex>` explicitly instead. To find the right value,
grab a frame and sample it:

```bash
ffmpeg -y -ss 1 -i source.mp4 -frames:v 1 -pix_fmt rgba -update 1 frame.png
```

Open `frame.png`, pick a background pixel, and convert its RGB to hex.

**Visible color fringe/halo at the edge of the subject after encoding**
Usually one of:
- `--similarity` too low — raise it slightly (e.g. `0.16` → `0.20`) so more of
  the near-key-color edge pixels get keyed out.
- `--despill` picked the wrong channel, or spill wasn't suppressed at all —
  check the printed despill value in the (non-dry-run) output, override with
  `--despill blue` / `--despill green` / `--despill none` if it's wrong.
- **Filter order matters and this script gets it right, but if you're hand-
  rolling an ffmpeg command instead of using this script**: `colorkey` must
  run *before* `despill`. Despill-then-colorkey neutralizes the key color's
  hue before colorkey ever sees it, so colorkey can no longer recognize the
  background as "close to the key" and the whole background comes out opaque
  instead of transparent. This exact bug happened once during development —
  see the git history on this file if you want the postmortem.

**Wheel/subject detail got eaten (holes appear in dark areas of the subject
itself)**
`--similarity` is too high for a source with near-black/near-key shading in
the subject (e.g. a black-keyed 3D render where the subject also has dark
shadow areas). Lower `--similarity` so only the actual background — not the
subject's own dark pixels — gets keyed out. Use `--dry-run` off but on a throwaway
destination first, then inspect the output frame-by-frame before overwriting
anything real.

**The 1x1 pixel crop error `Invalid too big or non positive size for width
'0' or height '0'`**
This was a real bug in an earlier version of this script (some ffmpeg builds
reject a literal 1x1 `crop` output). It's fixed — the script crops a 4x4 block
and reads the first pixel instead. If you see this error, you're on an old
copy of the script; pull the latest version.

**Output looks transparent in one check and opaque in another, on the exact
same file**
This is a known Chromium quirk, not a bug in the encode: VP9 alpha decode only
works over Chromium's *software* decode path. After decoding many videos in
the same browser tab/process, Chromium can silently switch to hardware
decoding for a new `<video>`, which drops the alpha channel — the video
renders fully opaque even though the file is correctly encoded. It's not
something this script (or `ffmpeg`) can detect, since `ffprobe`/`ffmpeg`'s own
VP9 decoder doesn't expose Chromium's alpha side-channel at all — a "clean"
`ffprobe`/frame-extraction check only confirms the `alpha_mode` tag and pixel
format, not that Chromium will actually composite it as transparent.

If you hit this while testing in a browser: reload the page fresh (a real
single page load, not a page that's already decoded a dozen other videos) and
re-check. In the actual deployed kiosk app, this isn't a practical concern —
each video plays from a fresh page load, not a browser tab that's been used to
decode 10+ throwaway test clips in a row.

**The source `.mp4` keeps changing while I'm working on this**
If something else in your pipeline (a render tool, an export step) rewrites
the source file while you're iterating, re-run the script against the latest
version before trusting your last output — it encodes whatever is on disk at
the moment it runs, so a source that changed after your last encode makes that
encode stale.
