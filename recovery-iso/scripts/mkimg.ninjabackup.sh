# mkimage profile for the NinjaBackup recovery Live ISO.
# Sourced by Alpine's mkimage.sh build harness.

profile_ninjabackup() {
    profile_standard
    title="NinjaBackup Recovery"
    desc="Bare-metal recovery environment with restic + ninjabackup-agent"
    profile_abbrev="ninjabackup"
    image_ext="iso"
    arch="x86_64"
    output_format="iso"
    kernel_cmdline="modules=loop,squashfs,sd-mod,usb-storage console=tty0 console=ttyS0,115200"
    syslinux_serial="0 115200"
    kernel_flavors="lts"
    initfs_features="ata base ide scsi usb virtio ext4 squashfs"
    apks="
        $apks
        bash
        curl wget
        ca-certificates
        e2fsprogs e2fsprogs-extra
        xfsprogs
        dosfstools
        ntfs-3g ntfs-3g-progs
        parted gptfdisk
        lvm2 cryptsetup
        util-linux
        nano vim
        less
        openssh-client
        ncurses
        chrony
        networkmanager networkmanager-cli wpa_supplicant
        pciutils usbutils lspci
        smartmontools
        rsync
    "
    apkovl="genapkovl-ninjabackup.sh"
}
