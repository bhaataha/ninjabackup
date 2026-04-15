#!/bin/bash
# NinjaBackup interactive recovery wizard.
#
# Walks the operator through bare-metal restore:
#   1) Network online?
#   2) Server URL + tenant token (or kernel cmdline)
#   3) Pick host + snapshot
#   4) Pick target disk
#   5) Confirm + restore + reinstall bootloader

set -u

API_BASE_DEFAULT="https://api.backup.itninja.co.il/api/v1"
COLOR_RESET='\033[0m'
COLOR_BOLD='\033[1m'
COLOR_GREEN='\033[32m'
COLOR_YELLOW='\033[33m'
COLOR_RED='\033[31m'
COLOR_BLUE='\033[34m'

banner() {
    clear
    echo -e "${COLOR_BLUE}${COLOR_BOLD}"
    cat <<'EOF'
  _   _ _       _       ____             _
 | \ | (_)_ __ (_) __ _| __ )  __ _  ___| | ___   _ _ __
 |  \| | | '_ \| |/ _' |  _ \ / _' |/ __| |/ / | | | '_ \
 | |\  | | | | | | (_| | |_) | (_| | (__|   <| |_| | |_) |
 |_| \_|_|_| |_| |\__,_|____/ \__,_|\___|_|\_\\__,_| .__/
              _/ |              R E C O V E R Y    |_|
             |__/
EOF
    echo -e "${COLOR_RESET}"
    echo
}

err()  { echo -e "${COLOR_RED}✗ $*${COLOR_RESET}" >&2; }
ok()   { echo -e "${COLOR_GREEN}✓ $*${COLOR_RESET}"; }
info() { echo -e "${COLOR_BLUE}→ $*${COLOR_RESET}"; }
warn() { echo -e "${COLOR_YELLOW}! $*${COLOR_RESET}"; }

require_root() {
    if [ "$(id -u)" -ne 0 ]; then
        err "This wizard must be run as root."
        exit 1
    fi
}

read_kernel_cmdline() {
    # Pull nbk.token=, nbk.server=, nbk.snapshot= for unattended mode.
    for kv in $(cat /proc/cmdline); do
        case "$kv" in
            nbk.token=*)    KERNEL_TOKEN="${kv#nbk.token=}";;
            nbk.server=*)   KERNEL_SERVER="${kv#nbk.server=}";;
            nbk.snapshot=*) KERNEL_SNAPSHOT="${kv#nbk.snapshot=}";;
            nbk.disk=*)     KERNEL_DISK="${kv#nbk.disk=}";;
        esac
    done
}

wait_for_network() {
    info "Waiting for network..."
    for _ in $(seq 1 30); do
        if ping -c1 -W2 1.1.1.1 >/dev/null 2>&1; then
            ok "Network is up."
            return 0
        fi
        sleep 1
    done
    err "No network after 30s. Run 'nmtui' to configure WiFi/static IP, then re-run recover.sh."
    return 1
}

prompt_credentials() {
    if [ -n "${KERNEL_SERVER:-}" ]; then
        SERVER_URL="$KERNEL_SERVER"
    else
        read -r -p "Server URL [$API_BASE_DEFAULT]: " SERVER_URL
        SERVER_URL="${SERVER_URL:-$API_BASE_DEFAULT}"
    fi
    if [ -n "${KERNEL_TOKEN:-}" ]; then
        TOKEN="$KERNEL_TOKEN"
    else
        read -r -s -p "Tenant token: " TOKEN
        echo
    fi
}

list_snapshots() {
    info "Fetching snapshots from $SERVER_URL ..."
    curl -sf -H "Authorization: Bearer $TOKEN" \
        "$SERVER_URL/snapshots?type=IMAGE" -o /tmp/snapshots.json || {
        err "Could not list snapshots. Check token + URL."
        return 1
    }
    echo
    echo "Available IMAGE snapshots:"
    # Tiny inline JSON parser — avoids requiring jq.
    python3 -c '
import json, sys
data = json.load(open("/tmp/snapshots.json"))
items = data["data"] if isinstance(data, dict) and "data" in data else data
for i, s in enumerate(items[:20]):
    print(f"  [{i}] {s.get(\"agentHostname\", s.get(\"agentId\", \"?\"))[:24]:24s} "
          f"{s.get(\"createdAt\", \"\")[:19]}  "
          f"{int(s.get(\"sizeBytes\", 0))/1024/1024/1024:7.1f} GB  "
          f"{s.get(\"id\", \"\")[:12]}")
' 2>/dev/null || cat /tmp/snapshots.json
    echo
    if [ -n "${KERNEL_SNAPSHOT:-}" ]; then
        SNAPSHOT_ID="$KERNEL_SNAPSHOT"
    else
        read -r -p "Snapshot index or ID: " SEL
        if [[ "$SEL" =~ ^[0-9]+$ ]]; then
            SNAPSHOT_ID=$(python3 -c "import json; d=json.load(open('/tmp/snapshots.json')); items=d['data'] if isinstance(d,dict) and 'data' in d else d; print(items[$SEL]['id'])")
        else
            SNAPSHOT_ID="$SEL"
        fi
    fi
    ok "Selected snapshot: $SNAPSHOT_ID"
}

pick_target_disk() {
    echo
    echo "Detected disks:"
    lsblk -dno NAME,SIZE,MODEL,TRAN | grep -vE '^(loop|sr)' | nl -w2
    echo
    if [ -n "${KERNEL_DISK:-}" ]; then
        TARGET_DISK="$KERNEL_DISK"
    else
        read -r -p "Target disk (e.g. sda, nvme0n1): " TARGET_DISK
    fi
    if [ ! -b "/dev/$TARGET_DISK" ]; then
        err "/dev/$TARGET_DISK does not exist."
        return 1
    fi
    warn "All data on /dev/$TARGET_DISK will be ERASED."
    if [ -z "${KERNEL_DISK:-}" ]; then
        read -r -p "Type 'YES' to confirm: " CONFIRM
        [ "$CONFIRM" = "YES" ] || { err "Aborted."; return 1; }
    fi
}

do_restore() {
    info "Restoring snapshot $SNAPSHOT_ID to /dev/$TARGET_DISK ..."
    info "(this can take a while — image restores are typically 30-90 minutes)"

    /usr/local/bin/ninjabackup-agent \
        --register "$TOKEN" \
        --server "$SERVER_URL" || warn "register failed — continuing with anonymous restore"

    # Trigger restore via the agent. The agent knows how to talk to restic.
    /usr/local/bin/ninjabackup-agent \
        --restore-snapshot "$SNAPSHOT_ID" \
        --restore-target "/dev/$TARGET_DISK" \
        --image-mode || {
        err "Restore failed."
        return 1
    }

    ok "Restore complete."
}

reinstall_bootloader() {
    info "Reinstalling bootloader on /dev/$TARGET_DISK ..."
    mount /dev/${TARGET_DISK}1 /mnt 2>/dev/null || true
    if [ -d /sys/firmware/efi ]; then
        grub-install --target=x86_64-efi --efi-directory=/mnt/boot/efi --boot-directory=/mnt/boot --recheck "/dev/$TARGET_DISK" 2>/dev/null || warn "grub-install (UEFI) skipped"
    else
        grub-install --target=i386-pc --boot-directory=/mnt/boot --recheck "/dev/$TARGET_DISK" 2>/dev/null || warn "grub-install (BIOS) skipped"
    fi
    umount /mnt 2>/dev/null || true
    ok "Bootloader reinstalled."
}

main() {
    require_root
    banner

    KERNEL_TOKEN=""
    KERNEL_SERVER=""
    KERNEL_SNAPSHOT=""
    KERNEL_DISK=""
    read_kernel_cmdline

    wait_for_network    || exit 1
    prompt_credentials
    list_snapshots      || exit 1
    pick_target_disk    || exit 1
    do_restore          || exit 1
    reinstall_bootloader

    echo
    ok "Recovery complete. Reboot when ready (type 'reboot' or remove media + power-cycle)."
    if [ -n "${KERNEL_SNAPSHOT:-}" ]; then
        # unattended mode — auto reboot
        sleep 5
        reboot
    fi
}

main "$@"
