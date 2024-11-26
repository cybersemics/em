#!/usr/bin/env node

'use strict';

process.title = 'swiftlint';

if (process.platform !== 'darwin') {
  console.log('!!! WARN: Not running SwiftLint for non-macOS platform: ' + process.platform + '\n');
  process.exit();
}

const { Subprocess } = require('@ionic/utils-subprocess');
const { writeJson } = require('@ionic/utils-fs');
const { cosmiconfig } = require('cosmiconfig');
const os = require('os');
const path = require('path');
const { isInstalled } = require('./utils');

const getConfigPath = async () => {
  try {
    const explorer = cosmiconfig('swiftlint');
    const result = await explorer.search();
    const tmppath = path.resolve(os.tmpdir(), 'swiftlint-config');
    const config = typeof result.config === 'string' ? require(result.config) : result.config;

    await writeJson(tmppath, config, { spaces: 2 });
    console.log('node-swiftlint: using config from', result.filepath);

    return tmppath;
  } catch (e) {
    // ignore
  }
};

const run = async () => {
  if (await isInstalled()) {
    const p = await getConfigPath();

    const proc = new Subprocess(
      'swiftlint',
      [...process.argv.slice(2), ...p ? ['--config', p] : []],
      { stdio: 'inherit' },
    );

    await proc.run();
  } else {
    console.log(
      `!!! WARN: SwiftLint not found in PATH. You can install it with Homebrew:\n\n` +
      `    > brew install swiftlint\n`
    );
  }
};

run().catch(() => { process.exit(1); });
