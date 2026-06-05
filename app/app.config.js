module.exports = {
  expo: {
    name: 'HiveMind',
    slug: 'hivemind',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'app',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'cover',
      backgroundColor: '#130C2E',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.hivemind.app',
    },
    android: {
      package: 'com.hivemind.app',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#130C2E',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
        },
      },
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#6D28D9',
          defaultChannel: 'default',
          sounds: [],
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          project: 'react-native',
          organization: 'hivemind-ak',
        },
      ],
      'expo-secure-store',
      '@react-native-community/datetimepicker',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'HiveMind uses your location to place events on the map.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: 'dea59be6-d311-4a02-b861-4601499088e0',
      },
    },
    owner: 'waqvirk',
  },
};
