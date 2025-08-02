const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add Buffer polyfill for React Native/Expo SDK 53
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
};

config.resolver.fallback = {
  ...config.resolver.fallback,
  buffer: require.resolve('buffer'),
};

module.exports = config;
