Page({
  data: { loading: false, errorMsg: '' },

  // 微信要求：getUserProfile 必须由用户点击直接触发，中间不能有 await
  // 所以先 wx.login，再用同步回调链调 wx.getUserProfile
  handleLogin() {
    this.setData({ loading: true, errorMsg: '' });

    // Step 1: 先获取 code（同步回调，不阻塞）
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.setData({ loading: false, errorMsg: '获取登录凭证失败，请重试' });
          return;
        }
        const code = loginRes.code;

        // Step 2: 紧接着调用 getUserProfile（在同一回调链中，保持 TAP 触发上下文）
        wx.getUserProfile({
          desc: '用于展示您的个人信息',
          success: (profileRes) => {
            const userInfo = profileRes.userInfo;
            const loginData = {
              code,
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
      fail: (e) => {
        this.setData({ loading: false, errorMsg: '获取登录凭证失败，请检查网络后重试' });
      },
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
