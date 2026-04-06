// 首页：未登录显示登录页；已登录直接跳转 webview
Page({
  data: {
    features: [
      { icon: '🧠', title: '精准情绪识别', desc: 'AI 驱动的职场情绪分析' },
      { icon: '🌳', title: '情绪树洞', desc: '安全私密的情绪倾诉空间' },
      { icon: '💬', title: '话术练习', desc: '真实场景对话模拟训练' },
    ],
  },

  onLoad: function() {
    var login = wx.getStorageSync('feleme_login_result');
    if (login && login.loginToken && login.openid) {
      var loginData = encodeURIComponent(JSON.stringify({
        nickname: login.nickname || '',
        avatarUrl: login.avatarUrl || '',
        gender: login.gender || 0,
        province: login.province || '',
        city: login.city || '',
        openid: login.openid || '',
        unionid: login.unionid || '',
      }));
      wx.redirectTo({
        url: 'https://xqywrskpys0r.space.minimaxi.com/?loginData=' + loginData + '&from=miniprogram',
      });
    }
  },

  goLogin: function() {
    wx.navigateTo({ url: '/pages/login/index' });
  },
});
