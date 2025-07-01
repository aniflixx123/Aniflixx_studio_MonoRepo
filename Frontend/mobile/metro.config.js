const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {
  watchFolders: [],
  server: {
    useWatchman: false,
  },
  watcher: {
    watchman: false,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
