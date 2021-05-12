module.exports = {
  preset: 'ts-jest',
  setupFilesAfterEnv: ['<rootDir>src/setupTests.ts'],
  modulePathIgnorePatterns: [
    'scripts',
  ],
  testPathIgnorePatterns: [
    'build',
    'e2e',
    'scripts'
  ],
  moduleDirectories: ['node_modules', 'src'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy'
  }
}
