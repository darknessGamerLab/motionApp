const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withNotifeeRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      const notifeeRepo = "maven { url \"$rootDir/../node_modules/@notifee/react-native/android/libs\" }";
      
      if (!buildGradle.includes('@notifee/react-native/android/libs')) {
        buildGradle = buildGradle.replace(
          /allprojects\s*\{\s*repositories\s*\{/,
          `allprojects {\n  repositories {\n    ${notifeeRepo}`
        );
        config.modResults.contents = buildGradle;
      }
    }
    return config;
  });
};
