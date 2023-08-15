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
  // Update webpack config to use custom loader for worker files
  webpack: config => {
    // Note: It's important that the "worker-loader" gets defined BEFORE the TypeScript loader!
    // eslint-disable-next-line fp/no-mutating-methods
    config.module.rules.unshift({
      test: /\.worker\.ts$/,
      use: {
        loader: 'worker-loader',
        options: {
          // Use directory structure & typical names of chunks produces by "react-scripts"
          filename: 'static/js/[name].[contenthash:8].js',
        },
      },
    })

    return config
  },
}
