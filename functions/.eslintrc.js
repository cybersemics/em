module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  extends: [
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "raine"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    sourceType: "module",
  },
  rules: {
    'no-unused-vars': 0,
    '@typescript-eslint/no-unused-vars': 2,
  },
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  settings: {
    jsdoc: {
      tagNamePreference: {
        returns: "return",
      },
    },
  },
};
