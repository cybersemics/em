import reactRefresh from '@vitejs/plugin-react-refresh'
import legacyPlugin from '@vitejs/plugin-legacy'

/** Vite config. */
const config = ({ command, mode }) => {

  return {
    base: './',
    root: './',
    resolve: {
      alias: {
        'react-native': 'react-native-web',
      },
    },
    define: {
      'process.env.APP_IS_LOCAL': `'true'`,
    },
    build: {
      target: 'es2015',
      minify: 'terser',
      manifest: false,
      sourcemap: false,
      outDir: 'build',
    },
    plugins: [
      reactRefresh(),
      legacyPlugin({
        targets: ['Android > 39', 'Chrome >= 60', 'Safari >= 10.1', 'iOS >= 10.3', 'Firefox >= 54', 'Edge >= 15'],
      }),
    ],
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        }
      }
    },
  }
}

export default config
