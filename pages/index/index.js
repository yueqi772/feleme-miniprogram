// 首页：未登录显示登录入口；已登录自动跳转 webview
Page({
  data: {
    features: [
      { icon: '🧠', title: '精准情绪识别', desc: 'AI 驱动的职场情绪分析' },
      { icon: '🌳', title: '情绪树洞', desc: '安全私密的情绪倾诉空间' },
      { icon: '💬', title: '话术练习', desc: '真实场景对话模拟训练' },
    ],
  },

  onShow: function() {
    // 每次显示首页都检查登录状态，已登录则跳 webview
    var login = wx.getStorageSync('feleme_login_result');
    if (login && login.loginToken) {
      wx.redirectTo({ url: '/pages/webview/index' });
    }
  },

  goLogin: function() {
    wx.navigateTo({ url: '/pages/login/index' });
  },
});
