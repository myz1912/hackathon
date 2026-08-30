#!/usr/bin/env bash
# Reproduce renders/postforge-linkedin.mp4 from the team's own event footage.
# Clips live in inputs/ and are gitignored. ffmpeg here has no drawtext (no freetype),
# so captions are rendered as PNG cards with Pillow and composited.
set -euo pipefail
cd "$(dirname "$0")/.."
F="/System/Library/Fonts/Supplemental/Arial Bold.ttf"
# Keep the audio: captions make it watchable on mute, they do not replace the room.
# Levels normalised to -16 LUFS so clips cut together without jumps.
norm(){ ffmpeg -loglevel error -y -ss "$2" -t "$3" -i "inputs/$1.MOV" \
  -vf "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350,setsar=1,fps=30" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000" \
  -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k -ar 48000 -ac 2 "$4"; }
norm IMG_4199 59 4.5 /tmp/s1.mp4
norm IMG_4199 29 4.0 /tmp/s2.mp4
norm IMG_4196 23 3.5 /tmp/s3.mp4
norm IMG_4199 5  3.5 /tmp/s4.mp4
norm IMG_4200 57 3.5 /tmp/s5.mp4
norm IMG_4192 2  3.0 /tmp/s6.mp4
printf "file '/tmp/s%d.mp4'\n" 1 2 3 4 5 6 > /tmp/list.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i /tmp/list.txt -c copy /tmp/joined.mp4
python3 renders/make-cards.py
ffmpeg -loglevel error -y -i /tmp/joined.mp4 \
 -i /tmp/c1.png -i /tmp/c2.png -i /tmp/c3.png -i /tmp/c4.png -i /tmp/c5.png -i /tmp/c6.png \
 -filter_complex "\
[0:v][1:v]overlay=0:0:enable='between(t,0.3,4)'[a];\
[a][2:v]overlay=0:0:enable='between(t,4.2,7.8)'[b];\
[b][3:v]overlay=0:0:enable='between(t,8,11.4)'[c];\
[c][4:v]overlay=0:0:enable='between(t,11.6,14.8)'[d];\
[d][5:v]overlay=0:0:enable='between(t,15,17.9)'[e];\
[e][6:v]overlay=0:0:enable='between(t,19.1,22)'[out]" \
 -map "[out]" -map 0:a -c:a aac -b:a 128k -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart \
 renders/postforge-linkedin.mp4
echo "wrote renders/postforge-linkedin.mp4"
