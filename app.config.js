export default {
  expo: {
    name: "LanguageLearningApp",
    slug: "LanguageLearningApp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      newArchEnabled: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      newArchEnabled: true
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    extra: {
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};
