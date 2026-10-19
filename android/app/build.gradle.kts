plugins {
    id("com.android.application")
}

android {
    namespace = "com.rfqcollector.vezin"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.rfqcollector.vezin"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
        buildConfigField("String", "FRONTEND_URL", "\"https://vezin.rfqcollector.com\"")
        buildConfigField("String", "API_URL", "\"https://vezinapi.rfqcollector.com\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}
