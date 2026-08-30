---
name: video-cut
description: Cut raw event footage into a captioned social video with ffmpeg — select segments by audio energy, normalise loudness, compose captions, and verify the delivered file. Use when an approved edit plan must become an actual rendered video.
---

# Video cut

Turn an approved edit plan into a file. Everything here was learned rendering a real
21-second LinkedIn cut from 11 clips of iPhone event footage; the traps are the ones that
actually bit.

## 1 · Probe before planning

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate \
  -show_entries format=duration -of default=nw=1:nk=1 IN.MOV
```
Phone footage mixes orientations in one shoot. **Rotation lives in metadata**, so a clip
reported `1080x1920` may display landscape. Never trust the stored dimensions alone — pull
a thumbnail and look at it.

## 2 · Select segments by audio energy, not by eye

The moments worth keeping are where people are *talking and reacting*. Scan for them:

```bash
for s in $(seq 0 6 $DUR); do
  v=$(ffmpeg -loglevel info -ss $s -t 6 -i IN.MOV -af volumedetect -f null - 2>&1 \
      | awk -F': ' '/mean_volume/{print $2}')
  echo "$s $v"
done | sort -k2 -n | tail
```

Loudest windows first. In a real set, one clip carried the whole shoot: its peaks were
−18 dB against −23 dB elsewhere, and it supplied half the final cut.

**Loudness is a proxy for energy, not for funny.** It reliably finds animated talking; it
cannot tell a joke from a dry explanation. Say so, and have a human confirm the beats.

## 3 · Normalise every segment identically

```bash
ffmpeg -loglevel error -y -ss $IN -t $DUR -i IN.MOV \
  -vf "scale=W:H:force_original_aspect_ratio=increase,crop=W:H,setsar=1,fps=30" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000" \
  -c:v libx264 -preset veryfast -crf 20 \
  -c:a aac -b:a 128k -ar 48000 -ac 2 seg.mp4
```

- `scale…increase` + `crop` fills the frame without letterboxing.
- `setsar=1` prevents a stretched final file when sources disagree on pixel aspect.
- **`loudnorm=I=-16`** — phone clips vary wildly; without it, cuts jump in volume.
- Identical fps, sample rate and channel count on every segment, or `concat -c copy` fails
  or silently desyncs.

## 4 · Never strip the audio

Platform guidance says social video must be *understandable* with sound off. That means
**captions**, not silence. Silence removes the reactions that make a clip worth sharing.
Keep the audio; burn in the captions.

## 5 · Captions when `drawtext` is unavailable

Many ffmpeg builds ship without freetype:
```
No such filter: 'drawtext'
```
Check with `ffmpeg -filters | grep drawtext`. When missing, render RGBA cards with Pillow
and composite:

```bash
ffmpeg -y -i joined.mp4 -i c1.png -i c2.png \
 -filter_complex "[0:v][1:v]overlay=0:0:enable='between(t,0.2,4.5)'[a];\
                  [a][2:v]overlay=0:0:enable='between(t,4.7,8.4)'[out]" \
 -map "[out]" -map 0:a -c:a aac -b:a 128k \
 -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart out.mp4
```

- `-map 0:a` is required — the filter graph only carries video, and omitting it silently
  drops the sound.
- Semi-opaque box behind the text (`fill=(0,0,0,140)`) keeps captions legible over any frame.
- Leave a ~0.2s gap between cards so they do not visibly collide on a cut.

## 6 · Frame sizes that earn their place

| Platform | Size | Why |
|---|---|---|
| LinkedIn feed | 1080×1350 (4:5) | Tallest ratio rendered in-feed without cropping |
| TikTok / Reels / Shorts | 1080×1920 (9:16) | Full screen |
| Square fallback | 1080×1080 | Safe when the feed ratio is unknown |

Always `-pix_fmt yuv420p` and `-movflags +faststart`, or the file fails to play or to
stream progressively on some clients.

## 7 · Verify the delivered file, not the command

The command exiting 0 proves nothing. Check the artifact:

```bash
ffprobe -v error -show_entries format=duration \
  -show_entries stream=codec_type,width,height -of default=nw=1:nk=1 out.mp4
```
Expect **both** `video` and `audio`. Then extract a frame from a captioned moment and
actually look at it — a caption can be off-screen, clipped, or invisible against a bright
background, and only a pixel will tell you.

## Rules

- Do not render footage the human has not approved for this use. Event footage shows other
  people; consent is theirs to give, and it is not a technical question.
- Keep the source clips out of the repository. Commit the render script, not the media.
- Report the real segment table — source clip, in-point, duration — so the cut is
  reproducible and arguable.
- **Never claim a beat is funny because it is loud.** Report the measurement, not an
  interpretation of it.
