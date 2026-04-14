; NinjaBackup Agent - NSIS Installer Script
; Build with: makensis installer.nsi

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; ─── Version Info ─────────────────────────────────────────
!define PRODUCT_NAME "NinjaBackup Agent"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "NinjaBackup"
!define PRODUCT_WEB_SITE "https://ninjabackup.io"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\agent.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

; ─── Installer Settings ──────────────────────────────────
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "NinjaBackup-Agent-Setup-${PRODUCT_VERSION}.exe"
InstallDir "$PROGRAMFILES64\NinjaBackup"
InstallDirRegKey HKLM "${PRODUCT_DIR_REGKEY}" ""
RequestExecutionLevel admin
SetCompressor /SOLID lzma

; ─── UI Settings ──────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON "..\..\assets\icon.ico"
!define MUI_UNICON "..\..\assets\icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "..\..\assets\installer-sidebar.bmp"

; ─── Pages ────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
Page custom ServerConfigPage ServerConfigPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ─── Variables ────────────────────────────────────────────
Var ServerURL
Var RegistrationToken
Var Dialog
Var Label
Var ServerInput
Var TokenInput

; ─── Server Config Page ──────────────────────────────────
Function ServerConfigPage
  nsDialogs::Create 1018
  Pop $Dialog

  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Configure the backup server connection:"
  Pop $Label

  ${NSD_CreateLabel} 0 34u 100u 12u "Server URL:"
  Pop $Label

  ${NSD_CreateText} 100u 30u 200u 14u "https://backup.company.com"
  Pop $ServerInput

  ${NSD_CreateLabel} 0 58u 100u 12u "Registration Token:"
  Pop $Label

  ${NSD_CreateText} 100u 54u 200u 14u ""
  Pop $TokenInput

  ${NSD_CreateLabel} 0 80u 100% 24u "You can find the registration token in the NinjaBackup Dashboard under Agents > Generate Token."
  Pop $Label

  nsDialogs::Show
FunctionEnd

Function ServerConfigPageLeave
  ${NSD_GetText} $ServerInput $ServerURL
  ${NSD_GetText} $TokenInput $RegistrationToken
FunctionEnd

; ─── Install Section ─────────────────────────────────────
Section "Install" SecInstall
  SetOutPath "$INSTDIR"

  ; Copy agent binary
  File "..\..\agent.exe"

  ; Copy restic binary
  File "..\..\restic.exe"

  ; Create data directory
  CreateDirectory "$COMMONAPPDATA\NinjaBackup"
  CreateDirectory "$COMMONAPPDATA\NinjaBackup\logs"
  CreateDirectory "$COMMONAPPDATA\NinjaBackup\certs"

  ; Write config file
  FileOpen $0 "$COMMONAPPDATA\NinjaBackup\config.json" w
  FileWrite $0 '{"serverUrl": "$ServerURL", "registrationToken": "$RegistrationToken", "agentVersion": "${PRODUCT_VERSION}"}'
  FileClose $0

  ; Install as Windows service
  nsExec::ExecToLog '"$INSTDIR\agent.exe" --install'

  ; Register agent with server
  ${If} $RegistrationToken != ""
    nsExec::ExecToLog '"$INSTDIR\agent.exe" --register $RegistrationToken --server $ServerURL'
  ${EndIf}

  ; Start the service
  nsExec::ExecToLog 'sc start NinjaBackup'

  ; Write registry
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\agent.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\agent.exe"
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoRepair" 1

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Create Start Menu shortcuts
  CreateDirectory "$SMPROGRAMS\NinjaBackup"
  CreateShortCut "$SMPROGRAMS\NinjaBackup\Uninstall.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

; ─── Uninstall Section ───────────────────────────────────
Section "Uninstall"
  ; Stop and remove service
  nsExec::ExecToLog 'sc stop NinjaBackup'
  nsExec::ExecToLog 'sc delete NinjaBackup'

  ; Wait for service to stop
  Sleep 3000

  ; Remove files
  Delete "$INSTDIR\agent.exe"
  Delete "$INSTDIR\restic.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  ; Remove data directory (optional — keep backups config)
  ; RMDir /r "$COMMONAPPDATA\NinjaBackup"

  ; Remove registry
  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"

  ; Remove Start Menu
  Delete "$SMPROGRAMS\NinjaBackup\Uninstall.lnk"
  RMDir "$SMPROGRAMS\NinjaBackup"
SectionEnd
