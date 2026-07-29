package dev.khaos.kycverify.companion

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.core.content.ContextCompat
import dev.khaos.kycverify.companion.ui.CompanionAppTheme
import dev.khaos.kycverify.companion.ui.CompanionScreen

class MainActivity : ComponentActivity() {
    private val viewModel: CompanionViewModel by viewModels()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { /* ViewModel polls camera when pair starts */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestNeededPermissions()
        setContent {
            CompanionAppTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF0A0A0A)) {
                    val state by viewModel.uiState.collectAsState()
                    CompanionScreen(
                        state = state,
                        onScanQr = viewModel::onQrScanned,
                        onManualConnect = viewModel::connectManual,
                        onDisconnect = viewModel::disconnect,
                        onToggleFacing = viewModel::toggleFacing,
                        onArmInject = viewModel::armInject,
                        onDisarmInject = viewModel::disarmInject,
                        onToggleDebugPreview = viewModel::toggleDebugPreview,
                        onToggleImuSpoof = viewModel::toggleImuSpoof,
                        onReportFinding = viewModel::reportFinding,
                        onFieldChange = viewModel::updateManualFields,
                    )
                }
            }
        }
    }

    private fun requestNeededPermissions() {
        val needed = mutableListOf(
            Manifest.permission.CAMERA,
        )
        if (Build.VERSION.SDK_INT >= 33) {
            needed += Manifest.permission.POST_NOTIFICATIONS
        }
        val missing = needed.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }
}
