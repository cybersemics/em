module.exports = {
  jest: config => {
    return {
      ...config,
      transformIgnorePatterns: [
        // default patterns
        // '[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|cjs|ts|tsx)$',
        '^.+\\.module\\.(css|sass|scss)$',

        // yjs, y-indexddb, and lib0 need to be transformed.
        // The original regex ignored everything in node_modules.
        '[/\\\\]node_modules[/\\\\](?!(yjs|y-indexeddb|lib0)).+\\.(js|cjs|jsx|mjs|ts|tsx)$',
      ],
    }
  },
}
