if (process.platform !== 'darwin') {
  console.log('!!! WARN: SwiftLint cannot be used on non-macOS platforms\n');
  process.exit(0);
}

const { isInstalled } = require('./utils');

const run = async () => {
  if (!(await isInstalled())) {
    console.log(
      `!!! WARN: SwiftLint not found in PATH. You can install it with Homebrew:\n\n` +
      `    > brew install swiftlint\n`
    );
  }
};

run().catch(err => { console.error(err); process.exit(1); });
