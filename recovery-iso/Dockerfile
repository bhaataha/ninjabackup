# ════════════════════════════════════════════════════════════
# NinjaBackup Recovery ISO Builder
#
# Builds a bootable Live ISO based on Alpine Linux that contains:
#   - kernel + initramfs
#   - restic + ninjabackup-agent
#   - disk tools (parted, lvm2, cryptsetup, e2fsprogs, xfsprogs)
#   - the recover.sh interactive wizard
#
# The build is fully containerised — no host-level VM/loop-mount needed.
# ════════════════════════════════════════════════════════════

FROM alpine:3.20

ARG AGENT_VERSION=1.0.0
ARG GITHUB_REPO=bhaataha/ninjabackup
ARG RESTIC_VERSION=0.17.1

ENV AGENT_VERSION=${AGENT_VERSION} \
    GITHUB_REPO=${GITHUB_REPO} \
    RESTIC_VERSION=${RESTIC_VERSION}

# Build-time deps for assembling the ISO
RUN apk add --no-cache \
        bash curl xorriso syslinux mtools squashfs-tools \
        grub grub-efi efibootmgr \
        alpine-conf alpine-base mkinitfs

WORKDIR /build

COPY scripts/ /build/scripts/
COPY overlay/ /build/overlay/

# Pull the agent + restic at build time so the ISO is self-contained
RUN mkdir -p overlay/usr/local/bin && \
    curl -fsSL "https://github.com/${GITHUB_REPO}/releases/download/v${AGENT_VERSION}/ninjabackup-agent-${AGENT_VERSION}-linux-amd64" \
      -o overlay/usr/local/bin/ninjabackup-agent && \
    chmod +x overlay/usr/local/bin/ninjabackup-agent && \
    curl -fsSL "https://github.com/restic/restic/releases/download/v${RESTIC_VERSION}/restic_${RESTIC_VERSION}_linux_amd64.bz2" \
      | bzcat > overlay/usr/local/bin/restic && \
    chmod +x overlay/usr/local/bin/restic

VOLUME ["/out"]

CMD ["/build/scripts/build-iso.sh"]
