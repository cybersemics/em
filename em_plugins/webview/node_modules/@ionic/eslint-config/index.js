module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'import'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:import/typescript',
  ],
  rules: {
    // https://eslint.org/docs/rules/
    'no-fallthrough': 'off', // https://github.com/ionic-team/eslint-config/issues/7
    'no-constant-condition': 'off',

    // https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin/docs/rules
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': ['warn', { 'allowArgumentsExplicitlyTypedAsAny': true }],
  },
};