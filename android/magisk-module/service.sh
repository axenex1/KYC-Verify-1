#!/system/bin/sh
# KYC VirtCam Magisk service
# Marks hook present and ensures frame paths exist for the companion app.

MODDIR=${0%/*}
mkdir -p /data/local/tmp
touch /data/local/tmp/kyc_virtcam.hook
chmod 666 /data/local/tmp/kyc_virtcam.hook
touch /data/local/tmp/kyc_virtcam.frame
touch /data/local/tmp/kyc_virtcam.armed
touch /data/local/tmp/kyc_virtcam.profile
touch /data/local/tmp/kyc_virtcam.imu
chmod 666 /data/local/tmp/kyc_virtcam.*

# Optional: load zygisk .so if present (OEM-specific Camera2 hook binary).
ZYGISK_LIB="$MODDIR/zygisk/arm64-v8a.so"
if [ -f "$ZYGISK_LIB" ]; then
  echo "kyc_virtcam: zygisk lib present" > /data/local/tmp/kyc_virtcam.log
else
  echo "kyc_virtcam: placeholder hook — drop Camera2 interceptor .so into zygisk/" > /data/local/tmp/kyc_virtcam.log
fi
