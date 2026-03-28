Page({
  data: { loading: false, errorMsg: '' },
  async handleLogin() {
    this.setData({ loading: true, errorMsg: '' });
    let code, userInfo;
    try {
      const loginRes = await wx.login();
      if (!loginRes.code) throw new Error('未获取到登录凭证');
      code = loginRes.code;
    } catch(e) {
      this.setData({ loading: false, errorMsg: '获取登录凭证失败，请检查网络后重试' });
      return;
    }
    try {
      const profileRes = await wx.getUserProfile({ desc: '用于展示您的个人信息' });
      userInfo = profileRes.userInfo;
    } catch(e) {
      const msg = e?.errMsg || '';
      if (msg.includes('auth deny') || msg.includes('cancel')) {
        this.setData({ loading: false, errorMsg: '您已拒绝授权，可重新点击登录' });
      } else {
        this.setData({ loading: false, errorMsg: e?.errMsg || '获取用户信息失败' });
      }
      return;
    }
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
    wx.redirectTo({ url: `/pages/webview/index?loginData=${encoded}&from=miniprogram` });
  },
  goBack() { wx.navigateBack(); },
});
