Page({
  data: {
    features: [
      { icon: '🧠', title: '精准情绪识别', desc: 'AI 驱动的职场情绪分析' },
      { icon: '🌳', title: '情绪树洞', desc: '安全私密的情绪倾诉空间' },
      { icon: '💬', title: '话术练习', desc: '真实场景对话模拟训练' },
    ],
  },
  onShow() {
    // 已登录则直接跳转到 webview（tabBar 页面用 switchTab）
    const login = wx.getStorageSync('feleme_login_result');
    if (login && login.loginToken) {
      wx.switchTab({ url: '/pages/webview/index' });
    }
  },
  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },
});
