Page({
  data: {
    features: [
      { icon: '🧠', title: '精准情绪识别', desc: 'AI 驱动的职场情绪分析' },
      { icon: '🌳', title: '情绪树洞', desc: '安全私密的情绪倾诉空间' },
      { icon: '💬', title: '话术练习', desc: '真实场景对话模拟训练' },
    ],
  },
  onShow() {
    const login = wx.getStorageSync('feleme_login');
    if (login) {
      const encoded = encodeURIComponent(JSON.stringify(login));
      wx.redirectTo({ url: `/pages/webview/index?loginData=${encoded}` });
    }
  },
  goLogin() { wx.redirectTo({ url: '/pages/login/index' }); },
});
