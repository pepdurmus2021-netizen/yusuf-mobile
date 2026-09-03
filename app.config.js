// Çoklu marka build sistemi — hangi markanın build alınacağı APP_BRAND ortam
// değişkeniyle seçilir (bkz. eas.json build profilleri, ör. "hasiptech",
// "hakanonline"). Yerelde `npx expo start` çalıştırırken de aynı değişken
// okunur, verilmezse brands/index.ts'teki DEFAULT_BRAND_KEY kullanılır.
const { getBrand } = require('./brands');

const brand = getBrand(process.env.APP_BRAND);

module.exports = {
  expo: {
    name: brand.appName,
    slug: brand.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: `./assets/brands/${brand.key}/icon.png`,
    scheme: 'bwpauth', // MARKA BAĞIMSIZ SABİT TUTULUYOR — bkz. config/brand.ts notu (Google OAuth redirect'i buna bağlı)
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: brand.adaptiveIconBg,
        foregroundImage: `./assets/brands/${brand.key}/android-icon-foreground.png`,
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: brand.androidPackage,
    },
    web: {
      output: 'static',
      favicon: `./assets/brands/${brand.key}/favicon.png`,
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: `./assets/brands/${brand.key}/splash-icon.png`,
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: brand.splashBg,
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      'expo-web-browser',
      'expo-font',
    ],
    updates: {
      enabled: false,
    },
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'd7dc428a-9ba2-4cc8-a520-e4c75c104f7e',
      },
      // Çalışma zamanında config/brand.ts bunu Constants.expoConfig.extra.brand
      // üzerinden okuyup BRAND objesini oluşturur.
      brand,
    },
    owner: 'bayiwebpanel',
  },
};
