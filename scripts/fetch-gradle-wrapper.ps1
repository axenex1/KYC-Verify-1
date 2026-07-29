$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$PSScriptRoot")) { $root = (Get-Location).Path }
# Script lives in repo scripts/ — android wrapper is ../android/gradle/wrapper
$androidRoot = Join-Path (Split-Path -Parent $PSScriptRoot) "android"
if (-not (Test-Path $androidRoot)) {
  $androidRoot = Join-Path (Get-Location) "android"
}
$wrapperDir = Join-Path $androidRoot "gradle\wrapper"
New-Item -ItemType Directory -Force -Path $wrapperDir | Out-Null
$jar = Join-Path $wrapperDir "gradle-wrapper.jar"
$url = "https://github.com/gradle/gradle/raw/v8.9.0/gradle/wrapper/gradle-wrapper.jar"
Write-Host "Downloading $url"
Invoke-WebRequest -Uri $url -OutFile $jar
Write-Host "Wrote $jar"
