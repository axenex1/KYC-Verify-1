plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "dev.khaos.kycverify.webrtc"
    compileSdk = 34

    defaultConfig {
        minSdk = 26
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    api(project(":protocol"))
    implementation("io.getstream:stream-webrtc-android:1.3.8")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
