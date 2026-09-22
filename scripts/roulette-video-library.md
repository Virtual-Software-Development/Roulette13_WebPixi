# Roulette video library: status & intake

Two tools for managing `local-media/Videos/<result>/` — the American-roulette
draw-result clips this app plays (see `RouletteVideoView.tsx` /
`src/utils/media.ts`). American roulette has 38 results (`0`, `00`, `1`–`36`);
by default each needs 5 recorded variants, for 190 clips total.

These tools **do not simulate a spin or produce raw footage** — this app has
no wheel-physics engine or recorder of its own (see the header comment in
`encode-alpha-video.md` re: raw footage coming from a black-keyed 3D render
elsewhere). They exist for what happens after raw clips already exist:
tracking what's present, encoding what's newly added, and never losing or
overwriting anything in the process.

## `roulette-video-status.mjs` — inventory report

Read-only. Scans `local-media/Videos/<result>/*.webm`, counts how many valid
variants exist per result, and reports what's missing.

```bash
node scripts/roulette-video-status.mjs
npm run roulette-video-status
```

```
VIDEO LIBRARY STATUS

Valid clips:       143 / 190
Completed results: 24 / 38
Remaining clips:   47

Missing:
00  -> 3/5 (needs 2)
9   -> 2/5 (needs 3)
...
```

- `--required <n>` — variants required per result (default 5).
- `--json` — machine-readable output instead of the text report.
- `--verify` — also open each candidate file with `ffprobe` to confirm it
  actually decodes as video, not just that it exists and isn't tiny. Slower;
  off by default.
- `--fail-if-incomplete` — exit code 1 unless the library is at 190/190 (for
  a CI check, if you ever want one).

A file only counts if it matches the naming convention
(`roulette_<result>_var<LETTER>.webm`, e.g.
`local-media/Videos/12/roulette_12_varA.webm`) **and** is larger than a small
sanity threshold. A `0`/`00` result is never confused
with the other — they're separate folders, always compared as strings, never
coerced to a shared numeric value.

## `roulette-video-intake.mjs` — encode & place new clips

Takes raw clips out of a staging folder, runs each one through the existing
`encode-alpha-video.mjs` (unmodified — this script only calls it, per file),
and places the result into the right `local-media/Videos/<result>/` slot.

```bash
node scripts/roulette-video-intake.mjs
npm run roulette-video-intake
```

**Staging layout** — mirrors the destination, one subfolder per result:

```
local-media/RawRenders/17/take1.mp4
local-media/RawRenders/17/take2.mp4
local-media/RawRenders/00/spin_014.mov
```

Drop new raw clips into the matching result's subfolder whenever they're
ready; there's nothing else to register or configure.

### What it does, per result

1. **Skips results that already have their required variant count** —
   doesn't touch their staging files at all, but tells you if some are still
   sitting there unused (nothing is ever silently ignored).
2. For an incomplete result, encodes raw clips **only up to how many are
   still needed** — extra raw clips beyond that are left alone in staging,
   not deleted, not encoded early.
3. Each clip is encoded to a temp filename first
   (`.tmp-roulette_<result>_var<LETTER>-<random>.webm`) and only renamed into
   its final `roulette_<result>_var<LETTER>.webm` slot after the encoder
   exits successfully and the output passes the same size check `status`
   uses. A crash or a bad encode never leaves something that looks like a
   valid variant.
4. The variant letter (`A`, `B`, `C`, ...) is the earliest one not already
   used for that result — see the comment on `nextFreeVariantIndex` in
   `scripts/lib/rouletteVideoLibrary.mjs` for why gaps get filled rather
   than always appending at the end.
5. **Never overwrites.** The destination path is checked twice (before and
   right before the rename); a real collision is treated as an error, not
   silently clobbered.
6. On success, the raw source is moved to `<result>/_encoded/` next to
   itself — never deleted. On failure, it's left exactly where it was, so
   the next run (or this same run, for the next file) just retries it. There
   is no separate retry counter or crash-recovery state: "still in staging,
   not in `_encoded/`" *is* the retry state.

### Options

- `--staging <dir>` — default `local-media/RawRenders`.
- `--required <n>` — must match what you pass to `status` if you're not
  using the default 5.
- `--result <id>` — process only this one result (e.g. `--result 26`) —
  useful once the library is nearly done and only a few numbers are still
  missing, so you're not scanning/encoding staging folders you don't care
  about right now.
- `--dry-run` — prints exactly what would be encoded and where each output
  would land, without touching any file.
- `--ext <.mp4,.mov>` — which raw extensions to pick up (default same as
  `encode-alpha-video.mjs`).
- `--key-color`, `--despill`, `--similarity`, `--blend`, `--fps`, `--crf`,
  `--ffmpeg`, `--ffprobe` — forwarded as-is to `encode-alpha-video.mjs` for
  every file it encodes. See `encode-alpha-video.md` for what each one does.

### Resuming after an interruption

There's nothing to resume — run the same command again. Both scripts always
re-derive the current state from whatever files actually exist on disk (no
manifest, no database, no in-memory counters). Whatever was already placed
in `Videos/` stays counted; whatever raw clips are still sitting in staging
(not yet in `_encoded/`) get tried again.
