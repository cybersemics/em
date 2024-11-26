const { which } = require('@ionic/utils-subprocess');

const isInstalled = async () => {
  try {
    await which('swiftlint');
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    return false;
  }

  return true;
};

module.exports = { isInstalled };
