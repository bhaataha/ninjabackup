#!/bin/sh
# genapkovl-ninjabackup.sh — produce the apkovl tarball that customises
# the live system: enables NetworkManager, ships the recover.sh wizard,
# embeds the agent + restic binaries, and auto-runs the wizard on tty1.
#
# Called by mkimage.sh. Output: apkovl.tar.gz on stdout.

set -e

HOSTNAME="$1"
[ -z "$HOSTNAME" ] && HOSTNAME="ninjabackup-recovery"

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

cd "$TMP"

# Hostname
mkdir -p etc
echo "$HOSTNAME" > etc/hostname

# DNS
mkdir -p etc
cat > etc/resolv.conf <<EOF
nameserver 1.1.1.1
nameserver 8.8.8.8
EOF

# Auto-login as root on tty1, and run recover.sh
mkdir -p etc/inittab.d
cat > etc/profile.d/recovery.sh <<'EOF'
# Auto-launch the recovery wizard on the main TTY
if [ "$(tty)" = "/dev/tty1" ] && [ -z "$RECOVER_LAUNCHED" ]; then
    export RECOVER_LAUNCHED=1
    /usr/local/bin/recover.sh || true
fi
EOF

# Enable boot-time services
mkdir -p etc/runlevels/default
ln -s /etc/init.d/networkmanager etc/runlevels/default/networkmanager 2>/dev/null || true
ln -s /etc/init.d/chronyd etc/runlevels/default/chronyd 2>/dev/null || true
ln -s /etc/init.d/sshd etc/runlevels/default/sshd 2>/dev/null || true

# Drop the binaries + recover.sh into place from the build overlay
if [ -d /build/overlay ]; then
    cp -a /build/overlay/. .
fi

# Ship a banner so users see what they booted into
mkdir -p etc
cat > etc/motd <<'EOF'

╔══════════════════════════════════════════════════════════════╗
║              NinjaBackup Recovery Environment                ║
║                                                              ║
║  Run:   recover.sh    — interactive bare-metal restore      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF

# Ensure the wizard is executable
[ -f usr/local/bin/recover.sh ] && chmod +x usr/local/bin/recover.sh

tar c .
