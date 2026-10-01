#!/usr/bin/env bash
# Rebuild the README's demo GIF and the poster frame from the full quality MP4.
#
# Both start after the title card has risen. The reel fades up from black, correctly, so frame 0 of a straight
# conversion is a solid black rectangle, and frame 0 is the only frame a GIF thumbnail, a social card or a
# marketplace tile ever shows. A product whose whole proposition is visual then advertises itself with a black box.
set -euo pipefail
cd "$(dirname "$0")/.."

src=docs/demo-relay-web.mp4
# The title lockup is fully settled by 0.75s and the product rises at 3.25s, measured with signalstats YMAX.
start=0.8
# The caption is up and the product is framed, which is the frame worth putting on a card.
poster=4.5
width=720
fps=12.5

palette=$(mktemp -t react-launch-video-palette).png
trap 'rm -f "$palette"' EXIT

ffmpeg -v error -ss "$start" -i "$src" -vf "fps=$fps,scale=$width:-1:flags=lanczos,palettegen=stats_mode=diff" -y "$palette"
ffmpeg -v error -ss "$start" -i "$src" -i "$palette" \
  -lavfi "fps=$fps,scale=$width:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  -y docs/demo.gif

ffmpeg -v error -ss "$poster" -i "$src" -frames:v 1 -y docs/poster.png

# Real bytes, not `du`, which reports allocated blocks and overstated this by 25%.
for f in docs/demo.gif docs/poster.png; do
  printf '%-16s %s KB\n' "$f" "$(( $(wc -c < "$f") / 1024 ))"
done
