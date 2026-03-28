const config = {
  projectName: 'feleme-miniprogram',
  date: '2026-3-28',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1 / 1.71,
    375: 2 / 1,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [
    '@tarojs/plugin-platform-weapp',
    '@tarojs/plugin-framework-react',
    '@tarojs/webview-engine',
  ],
  defineConstants: {},
  framework: 'react',
  mini: {
    compile: {
      exclude: ['src/pages/h5/*'],
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      url: {
        enable: true,
        config: {
          limit: 1024,
        },
      },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
      },
    },
  },
};

module.exports = config;
