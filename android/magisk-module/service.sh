#!/system/bin/sh
# KYC VirtCam Magisk service — lab devices only.

MODDIR=${0%/*}
mkdir -p /data/local/tmp
touch /data/local/tmp/kyc_virtcam.hook
chmod 666 /data/local/tmp/kyc_virtcam.hook
touch /data/local/tmp/kyc_virtcam.frame
touch /data/local/tmp/kyc_virtcam.armed
echo 0 > /data/local/tmp/kyc_virtcam.armed
touch /data/local/tmp/kyc_virtcam.profile
touch /data/local/tmp/kyc_virtcam.imu
touch /data/local/tmp/kyc_virtcam.seam
chmod 666 /data/local/tmp/kyc_virtcam.*

ZYGISK_LIB="$MODDIR/zygisk/arm64-v8a.so"
if [ -f "$ZYGISK_LIB" ]; then
  echo "kyc_virtcam: zygisk lib present ($(date))" > /data/local/tmp/kyc_virtcam.log
  ls -l "$ZYGISK_LIB" >> /data/local/tmp/kyc_virtcam.log
else
  echo "kyc_virtcam: MISSING arm64-v8a.so — run build-zygisk.ps1" > /data/local/tmp/kyc_virtcam.log
fi
