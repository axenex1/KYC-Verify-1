# Build KYC VirtCam Zygisk .so for arm64-v8a (Pixel lab).
# Requires Android NDK (r26+). Set ANDROID_NDK_HOME or ANDROID_HOME\ndk\<ver>.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Zygisk = Join-Path $Root "zygisk"
$OutSo = Join-Path $Zygisk "arm64-v8a.so"
$BuildDir = Join-Path $Zygisk "build-arm64"

function Find-Ndk {
  if ($env:ANDROID_NDK_HOME -and (Test-Path $env:ANDROID_NDK_HOME)) {
    return $env:ANDROID_NDK_HOME
  }
  if ($env:ANDROID_NDK_ROOT -and (Test-Path $env:ANDROID_NDK_ROOT)) {
    return $env:ANDROID_NDK_ROOT
  }
  $sdk = $env:ANDROID_HOME
  if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk" }
  $ndkRoot = Join-Path $sdk "ndk"
  if (Test-Path $ndkRoot) {
    $ver = Get-ChildItem $ndkRoot -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if ($ver) { return $ver.FullName }
  }
  return $null
}

$ndk = Find-Ndk
if (-not $ndk) {
  Write-Error "Android NDK not found. Install NDK and set ANDROID_NDK_HOME."
}

$toolchain = Join-Path $ndk "build\cmake\android.toolchain.cmake"
if (-not (Test-Path $toolchain)) {
  Write-Error "Missing android.toolchain.cmake under $ndk"
}

Write-Host "NDK: $ndk"
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

cmake -S $Zygisk -B $BuildDir `
  -DCMAKE_TOOLCHAIN_FILE="$toolchain" `
  -DANDROID_ABI=arm64-v8a `
  -DANDROID_PLATFORM=android-29 `
  -DCMAKE_BUILD_TYPE=Release

cmake --build $BuildDir --config Release -j

$built = Get-ChildItem -Path $BuildDir -Recurse -Filter "arm64-v8a.so" | Select-Object -First 1
if (-not $built) {
  Write-Error "Build succeeded but arm64-v8a.so not found under $BuildDir"
}
Copy-Item $built.FullName $OutSo -Force
Write-Host "Wrote $OutSo"
Write-Host "Next: .\package-magisk.ps1"
