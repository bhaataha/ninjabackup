# NinjaBackup Agent — Code Signing

The Windows agent + tray + NSIS installer should be signed so Windows
SmartScreen, AV vendors, and Group Policy don't flag them as unknown.

## Why sign

| Symptom without signing | Reason |
|---|---|
| Windows SmartScreen "unrecognized publisher" warning | EV cert builds reputation immediately; OV cert builds it after ~3000 installs |
| Defender / EDR quarantine on first execution | Unsigned PE files flagged as `WIN32/Wacapew.C!ml` heuristic match |
| Cannot install via MSI Group Policy | GPO software install requires signed packages |
| `signtool verify` fails | No Authenticode signature present |

## Cert types — what to buy

| Type | Cost / yr | SmartScreen reputation | Recommended for |
|---|---|---|---|
| **Standard OV (Organization Validation)** | ~$200-300 | Builds slowly (~3000 installs) | Solo developers, internal tools |
| **EV (Extended Validation)** | ~$400-700 | **Immediate** — zero SmartScreen warnings | **Production SaaS, customer downloads** ← us |
| Microsoft Trusted Signing (Azure) | $9.99 / mo + Azure | Immediate (uses Microsoft's CA) | Cloud-native CI/CD with no HSM |

**Recommended vendors** (issue Authenticode-compatible certificates):

- DigiCert (most expensive, fastest validation)
- Sectigo / Comodo (cheapest EV ~$400/yr)
- SSL.com (good middle ground)
- GlobalSign
- Microsoft Trusted Signing (best if already on Azure — no HSM hardware required)

## EV cert delivery

EV certs ship on a **YubiKey FIPS** or HSM token — you cannot export the
private key. For CI/CD this means either:

1. **eToken Pass-through** — install a runner physically at your office with
   the YubiKey plugged in (manual / brittle)
2. **Cloud Signing via vendor API** (DigiCert KeyLocker, SSL.com eSigner) —
   key stays in HSM, signtool calls the vendor's REST API
3. **Microsoft Trusted Signing** — key stays in Azure Key Vault, Azure-native
   `Trusted Signing` task in GitHub Actions

For NinjaBackup we use option 3 OR option 2 (whichever the customer's
compliance team approves).

## Configuration

The `.github/workflows/sign-windows.yml` workflow expects two GitHub Actions
secrets when using a standard PFX (option 1 above):

| Secret | Value |
|---|---|
| `WINDOWS_CERT_BASE64` | `base64 -w0 cert.pfx` (Linux) or `[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx"))` (PowerShell) |
| `WINDOWS_CERT_PASSWORD` | The password chosen when exporting the PFX |

For Azure Trusted Signing, replace the signtool step in the workflow with
the official `Azure/trusted-signing-action@v0.5.1` action and add:

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | Service principal client ID |
| `AZURE_CLIENT_SECRET` | Service principal secret |
| `AZURE_TENANT_ID` | Azure AD tenant ID |

## Manual signing (one-off)

```powershell
# Once, decode the cert from your password manager:
$bytes = [Convert]::FromBase64String($base64FromVault)
[IO.File]::WriteAllBytes("cert.pfx", $bytes)

# Sign every .exe in dist\:
$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"
Get-ChildItem dist\*.exe | ForEach-Object {
  & $signtool sign `
    /f cert.pfx /p '<password>' `
    /tr http://timestamp.digicert.com /td sha256 /fd sha256 `
    /d "NinjaBackup Agent" /du "https://backup.itninja.co.il" `
    $_.FullName
  & $signtool verify /pa $_.FullName
}
```

## Verifying a downloaded binary

End-users (and your support team) can verify a downloaded binary on
Windows with:

```powershell
Get-AuthenticodeSignature ninjabackup-agent-1.0.0-windows-amd64.exe
```

The output should show `SignerCertificate.Subject` matching your
organisation, `Status: Valid`, and a timestamp.

## What about macOS / Linux?

- **macOS** — needs Apple Developer ID Application certificate (~$99/yr) +
  notarization. The `.github/workflows/sign-macos.yml` workflow handles this
  (TODO once we get an Apple Developer account).
- **Linux** — `.deb` and `.rpm` packages are signed with GPG (`debsigs`,
  `rpm --addsign`). Cheaper but less universally checked.
