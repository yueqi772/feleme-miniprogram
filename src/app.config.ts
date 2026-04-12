export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/login/index',
    'pages/webview/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'A里味',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999',
    selectedColor: '#4A90E2',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/index/index', text: '首页', iconPath: 'static/home.png', selectedIconPath: 'static/home-active.png' },
      { pagePath: 'pages/webview/index', text: '网页', iconPath: 'static/web.png', selectedIconPath: 'static/web-active.png' },
    ],
  },
  style: 'v2',
  sitemapLocation: 'sitemap.json',
});
