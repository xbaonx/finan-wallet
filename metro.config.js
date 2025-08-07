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

// Exclude test and debug files from production builds
if (process.env.NODE_ENV === 'production') {
  config.resolver.blacklistRE = /.*\/(moralis_test|moralis_transaction_debug|MoralisDebugScreen)\.(ts|tsx|js|jsx)$/;
}

module.exports = config;
