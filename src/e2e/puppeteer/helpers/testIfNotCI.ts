/** Replaces the typical `test` call when the test fails intermittently on CI, but not locally. Skips it in the CI. */
const testIfNotCI = process.env.CI ? test.skip : test

export default testIfNotCI
