#!/bin/sh
# Build the NinjaBackup recovery Live ISO using Alpine's mkimage tooling.
#
# This runs INSIDE the builder Docker image. The output is a single .iso
# file written to /out (mounted from the host).

set -eu

AGENT_VERSION="${AGENT_VERSION:-1.0.0}"
OUT_DIR=/out
ISO_NAME="ninjabackup-recovery-${AGENT_VERSION}.iso"

echo "→ Building NinjaBackup recovery ISO v${AGENT_VERSION}"

WORK=/tmp/iso-work
mkdir -p "$WORK"

# Use Alpine's official mkimage / aports for the live ISO base. We add our
# overlay (binaries + recover.sh) into the apkovl tarball so it lands at /
# inside the live system.
APK_OVL=/tmp/apkovl.tar.gz
( cd /build/overlay && tar czf "$APK_OVL" . )

# Pull the official mkimage profile and patch it to bundle our overlay
git clone --depth=1 https://gitlab.alpinelinux.org/alpine/aports.git /tmp/aports

cd /tmp/aports/scripts
cp /build/scripts/mkimg.ninjabackup.sh .
cp /build/scripts/genapkovl-ninjabackup.sh .
chmod +x mkimg.ninjabackup.sh genapkovl-ninjabackup.sh

./mkimage.sh \
  --tag edge \
  --outdir "$OUT_DIR" \
  --arch x86_64 \
  --repository https://dl-cdn.alpinelinux.org/alpine/v3.20/main \
  --repository https://dl-cdn.alpinelinux.org/alpine/v3.20/community \
  --profile ninjabackup

# Rename the produced ISO to a stable name
PRODUCED=$(ls "$OUT_DIR"/alpine-ninjabackup-*.iso 2>/dev/null | head -1 || true)
if [ -n "$PRODUCED" ]; then
  mv "$PRODUCED" "$OUT_DIR/$ISO_NAME"
  echo "✓ ISO ready: $OUT_DIR/$ISO_NAME"
  ls -lh "$OUT_DIR/$ISO_NAME"
else
  echo "✗ ISO build failed — no output produced"
  exit 1
fi
