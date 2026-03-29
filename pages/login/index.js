Page({
  data: { loading: false, errorMsg: '' },

  // ⚠️ 关键：wx.getUserProfile 必须由用户点击直接触发，
  // handleLogin 必须是按钮的 bindtap 的直接处理函数，中间不能有任何异步步骤。
  // wx.login 在 getUserProfile 成功后再调用（拿到 userInfo 之后才调 login），
  // 这样手势链路只经过一次直接函数调用，符合微信的要求。
  handleLogin() {
    this.setData({ loading: true, errorMsg: '' });

    wx.getUserProfile({
      desc: '用于展示您的个人信息',
      success: (profileRes) => {
        const userInfo = profileRes.userInfo;

        // 拿到 userInfo 后，再调 wx.login 获取 code（此时不限制异步）
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
            // login 失败但 userInfo 已拿到，仍可使用
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
        if (msg.includes('auth deny') || msg.includes('cancel')) {
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
