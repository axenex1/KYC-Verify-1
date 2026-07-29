# Zip Magisk module with module.prop at zip root.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$So = Join-Path $Root "zygisk\arm64-v8a.so"
$OutZip = Join-Path $Root "kyc_virtcam-magisk.zip"

if (-not (Test-Path $So)) {
  Write-Error "Missing $So — run build-zygisk.ps1 first (requires NDK)."
}

if (Test-Path $OutZip) { Remove-Item $OutZip -Force }

$stage = Join-Path $env:TEMP ("kyc_virtcam_magisk_" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item (Join-Path $Root "module.prop") $stage
Copy-Item (Join-Path $Root "service.sh") $stage
New-Item -ItemType Directory -Force -Path (Join-Path $stage "zygisk") | Out-Null
Copy-Item $So (Join-Path $stage "zygisk\arm64-v8a.so")
if (Test-Path (Join-Path $Root "customize.sh")) {
  Copy-Item (Join-Path $Root "customize.sh") $stage
}

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $OutZip -Force
Remove-Item $stage -Recurse -Force
Write-Host "Packed $OutZip"
Write-Host "Flash in Magisk → Reboot → check /data/local/tmp/kyc_virtcam.log"
