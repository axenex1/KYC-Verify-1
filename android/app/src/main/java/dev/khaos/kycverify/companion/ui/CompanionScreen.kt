package dev.khaos.kycverify.companion.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import dev.khaos.kycverify.companion.CompanionUiState
import dev.khaos.kycverify.sync.SyncConnectionState
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

private val Neon = Color(0xFF39FF14)
private val Panel = Color(0xFF121212)
private val Muted = Color(0xFF8A8A8A)

@Composable
fun CompanionAppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Neon,
            background = Color(0xFF0A0A0A),
            surface = Panel,
            onPrimary = Color.Black,
            onBackground = Color.White,
            onSurface = Color.White,
        ),
        content = content,
    )
}

@Composable
fun CompanionScreen(
    state: CompanionUiState,
    onScanQr: (String) -> Unit,
    onManualConnect: (String, String, String) -> Unit,
    onDisconnect: () -> Unit,
    onToggleFacing: () -> Unit,
    onArmInject: () -> Unit,
    onDisarmInject: () -> Unit,
    onToggleDebugPreview: () -> Unit,
    onToggleImuSpoof: () -> Unit,
    onReportFinding: (String) -> Unit,
    onFieldChange: (String?, String?, String?) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "KYC_BREACH//COMPANION",
            color = Neon,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
        )
        Text(
            text = "AUTHORIZED LAB DEVICE ONLY",
            color = Color(0xFFFFB020),
            fontFamily = FontFamily.Monospace,
            fontSize = 11.sp,
        )
        StatusChip(state.connectionState, state.statusLine)

        if (state.connectionState != SyncConnectionState.Paired) {
            QrScanner(onScanQr = onScanQr)
            ManualPairFields(
                state = state,
                onFieldChange = onFieldChange,
                onConnect = {
                    onManualConnect(state.sessionId, state.token, state.wsUrl)
                },
            )
        } else {
            Text(
                text = "session ${state.sessionId.take(8)}…",
                color = Muted,
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ActionButton("Facing ${if (state.facingFront) "FRONT" else "BACK"}", onToggleFacing)
                ActionButton("Disconnect", onDisconnect)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (state.injectArmed) {
                    ActionButton("Disarm inject", onDisarmInject)
                } else {
                    ActionButton("Arm inject", onArmInject)
                }
                ActionButton(
                    if (state.showDebugPreview) "Hide debug" else "Show debug",
                    onToggleDebugPreview,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ActionButton(
                    if (state.imuSpoof) "IMU spoof ON" else "IMU spoof",
                    onToggleImuSpoof,
                )
            }
            Text(
                text = buildString {
                    append("remote=${state.remoteTrackAttached} ")
                    append("hook=${state.hookPresent} ")
                    append("armed=${state.injectArmed}")
                },
                color = Muted,
                fontFamily = FontFamily.Monospace,
                fontSize = 11.sp,
            )
            if (state.showDebugPreview && !state.injectArmed) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .background(Panel)
                        .border(1.dp, Neon.copy(alpha = 0.35f), RoundedCornerShape(4.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = if (state.remoteTrackAttached) {
                            "desktop_to_mobile attached (lab preview)"
                        } else {
                            "Waiting for desktop synthetic stream…"
                        },
                        color = Muted,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                    )
                }
            } else if (state.injectArmed) {
                Text(
                    text = "Debug preview hidden while inject armed. Open vendor KYC app.",
                    color = Neon,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                )
            }
            Text(
                text = "Report vendor verdict",
                color = Color.White,
                fontFamily = FontFamily.Monospace,
                fontSize = 12.sp,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("pass", "fail", "review", "detected").forEach { outcome ->
                    OutlinedButton(onClick = { onReportFinding(outcome) }) {
                        Text(outcome, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                    }
                }
            }
            state.lastFinding?.let {
                Text(
                    text = "last finding: $it",
                    color = Muted,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 11.sp,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun StatusChip(state: SyncConnectionState, line: String) {
    val color = when (state) {
        SyncConnectionState.Paired -> Neon
        SyncConnectionState.Connecting -> Color(0xFFFFB020)
        SyncConnectionState.Error -> Color(0xFFFF4444)
        else -> Muted
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, color.copy(alpha = 0.5f), RoundedCornerShape(4.dp))
            .padding(10.dp),
    ) {
        Text(
            text = state.name.uppercase(),
            color = color,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
        )
        Text(text = line, color = Muted, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
    }
}

@Composable
private fun ActionButton(label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = Neon, contentColor = Color.Black),
    ) {
        Text(label, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
    }
}

@Composable
private fun ManualPairFields(
    state: CompanionUiState,
    onFieldChange: (String?, String?, String?) -> Unit,
    onConnect: () -> Unit,
) {
    val colors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = Neon,
        unfocusedBorderColor = Muted,
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        cursorColor = Neon,
    )
    OutlinedTextField(
        value = state.sessionId,
        onValueChange = { onFieldChange(it, null, null) },
        label = { Text("sessionId") },
        modifier = Modifier.fillMaxWidth(),
        colors = colors,
        singleLine = true,
    )
    OutlinedTextField(
        value = state.token,
        onValueChange = { onFieldChange(null, it, null) },
        label = { Text("token") },
        modifier = Modifier.fillMaxWidth(),
        colors = colors,
        singleLine = true,
    )
    OutlinedTextField(
        value = state.wsUrl,
        onValueChange = { onFieldChange(null, null, it) },
        label = { Text("wsUrl") },
        modifier = Modifier.fillMaxWidth(),
        colors = colors,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
    )
    Button(
        onClick = onConnect,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(containerColor = Neon, contentColor = Color.Black),
    ) {
        Text("Connect", fontFamily = FontFamily.Monospace)
    }
}

@Composable
private fun QrScanner(onScanQr: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scanned = remember { AtomicBoolean(false) }
    val executor = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose { executor.shutdown() }
    }

    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                val scanner = BarcodeScanning.getClient()
                analysis.setAnalyzer(executor) { imageProxy ->
                    val media = imageProxy.image
                    if (media != null && !scanned.get()) {
                        val image = InputImage.fromMediaImage(
                            media,
                            imageProxy.imageInfo.rotationDegrees,
                        )
                        scanner.process(image)
                            .addOnSuccessListener { barcodes ->
                                val raw = barcodes.firstOrNull {
                                    it.format == Barcode.FORMAT_QR_CODE
                                }?.rawValue
                                if (raw != null && scanned.compareAndSet(false, true)) {
                                    onScanQr(raw)
                                }
                            }
                            .addOnCompleteListener { imageProxy.close() }
                    } else {
                        imageProxy.close()
                    }
                }
                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        analysis,
                    )
                } catch (e: Exception) {
                    // Camera may be in use by WebRTC after pair.
                }
            }, ContextCompat.getMainExecutor(ctx))
            previewView
        },
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp)
            .border(1.dp, Neon.copy(alpha = 0.4f), RoundedCornerShape(4.dp)),
    )
}
