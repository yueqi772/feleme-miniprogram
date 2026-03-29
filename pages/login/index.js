Page({
  data: { loading: false, errorMsg: '' },

  // 使用 wx.getUserInfo：直接触发，无频率限制（推荐方式）
  // nickname 和 avatarUrl 同样可以拿到
  handleLogin() {
    this.setData({ loading: true, errorMsg: '' });

    wx.getUserInfo({
      lang: 'zh_CN',
      success: (userInfoRes) => {
        const userInfo = userInfoRes.userInfo || {};

        // userInfo 拿到后，再调 wx.login 获取 code
        wx.login({
          success: (loginRes) => {
            const loginData = {
              code: loginRes.code || '',
              nickname: userInfo.nickName || '微信用户',
              avatarUrl: userInfo.avatarUrl || '',
              gender: userInfo.gender || 0,
              province: userInfo.province || '',
              city: userInfo.city || '',
              loginTime: Date.now(),
            };
            wx.setStorageSync('feleme_login', loginData);
            const encoded = encodeURIComponent(JSON.stringify(loginData));
            wx.redirectTo({
              url: `/pages/webview/index?loginData=${encoded}&from=miniprogram`,
            });
          },
          fail: () => {
            // code 没拿到，但仍用 userInfo 数据登录（nickname/avatar 已够用）
            const loginData = {
              code: '',
              nickname: userInfo.nickName || '微信用户',
              avatarUrl: userInfo.avatarUrl || '',
              gender: userInfo.gender || 0,
              province: userInfo.province || '',
              city: userInfo.city || '',
              loginTime: Date.now(),
            };
            wx.setStorageSync('feleme_login', loginData);
            const encoded = encodeURIComponent(JSON.stringify(loginData));
            wx.redirectTo({
              url: `/pages/webview/index?loginData=${encoded}&from=miniprogram`,
            });
          },
        });
      },
      fail: (e) => {
        const msg = e?.errMsg || '';
        if (msg.includes('auth deny') || msg.includes('cancel') || msg.includes('authorize')) {
          this.setData({ loading: false, errorMsg: '您已取消授权，可重新点击登录' });
        } else {
          this.setData({ loading: false, errorMsg: e?.errMsg || '获取用户信息失败' });
        }
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
