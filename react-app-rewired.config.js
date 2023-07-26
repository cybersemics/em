module.exports = {
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
