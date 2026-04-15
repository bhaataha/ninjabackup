# NinjaBackup Recovery ISO

Bootable Live ISO that boots a minimal Linux + the NinjaBackup agent for
**bare-metal restore (BMR)**: recovering an entire machine from an image
backup, even when the disk is empty or the OS won't boot.

## What's inside

- **Alpine Linux 3.20** kernel + userspace (~50 MB compressed)
- **restic** (statically linked) — for image and file restore
- **ninjabackup-agent** (static Go binary, current release)
- **e2fsprogs / xfsprogs / dosfstools / parted / gdisk** — for repartitioning
- **lvm2 / cryptsetup** — for restoring LVM / LUKS volumes
- **Network bootstrap** — DHCP via `networkmanager` so you can talk to the
  NinjaBackup API immediately
- **`recover.sh`** — interactive TUI wizard:
  1. Connect to NinjaBackup server (URL + tenant token)
  2. Pick a snapshot to restore
  3. Pick the target disk
  4. Confirm + restore

## Building

The ISO is produced by a Docker-based builder so the build is hermetic and
works on any host with Docker installed (no need for a Linux build VM).

```bash
cd recovery-iso
docker build -t ninjabackup/recovery-iso-builder .
docker run --rm --privileged \
  -v "$(pwd)/dist:/out" \
  -e AGENT_VERSION=1.0.0 \
  ninjabackup/recovery-iso-builder
# Output: dist/ninjabackup-recovery-1.0.0.iso  (~120 MB)
```

The `AGENT_VERSION` env var pins which agent binary the ISO will embed
(downloaded from GitHub releases at build time).

## Burning to USB

```bash
# Linux/macOS:
sudo dd if=dist/ninjabackup-recovery-1.0.0.iso of=/dev/sdX bs=4M status=progress oflag=sync
# Windows (PowerShell): use Rufus / balenaEtcher — point them at the ISO.
```

## Boot + recover

1. Boot the target machine from the USB stick (UEFI or legacy BIOS).
2. At the live shell, run:
   ```
   recover.sh
   ```
3. Follow the prompts. The wizard will:
   - Detect available disks
   - Ask for the registration token + server URL (or read from kernel cmdline)
   - List the latest IMAGE snapshots for this hostname
   - Restore the chosen snapshot to the chosen disk
   - Run grub-install + update-grub if applicable
   - Reboot

## Unattended mode

Pass `nbk.token=...` and `nbk.server=...` and `nbk.snapshot=...` on the
kernel command line (e.g. via `isolinux.cfg` or PXE) to skip prompts and
restore automatically.
