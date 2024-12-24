/*
npm-check-updates config
See: https://github.com/raineorshine/npm-check-updates

Dependency notes:
  - html-escaper     Replace 'he' with 'html-escaper' due to bundle size.
                     Other small HTML entity encoder/decoders: entities, html-entities
  - page-lifecycle   Use https://github.com/magic-akari/page-lifecycle/tree/feat/add-types
                     to get Typescript types.

*/

module.exports = {
  reject: [
    // TypeError: TextDecoder is not a constructor
    // TextDecoder is not exposed by jsdom v16
    // https://github.com/jsdom/jsdom/pull/2928
    // https://github.com/jsdom/whatwg-encoding/pull/11
    'ipfs-http-client',

    // ts-key-enum v3 does not work with @babel/plugin-transform-typescript which is a subdependency of react-scripts
    // Currently v2 appears to be published to the latest tag, but keep this locked in case v3 is published to latest in the future. Minor and patch versions are safe to upgrade to.
    // https://gitlab.com/nfriend/ts-key-enum#which-version-should-i-use
    'ts-key-enum',

    // customSnapshotIdentifier breaks in puppeteer snapshot tests on puppeteer v23.
    // Error running image diff: Unknown Error
    // https://github.com/vitest-dev/vitest/releases/tag/v2.0.0
    'puppeteer',
  ],
}
