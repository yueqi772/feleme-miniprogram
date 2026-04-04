Page({
  data: { loading: false, errorMsg: '' },

  onLoad() {
    // 检查是否已登录
    const loginResult = wx.getStorageSync('feleme_login_result');
    if (loginResult && loginResult.loginToken) {
      this.navigateToWebView(loginResult);
    }
  },

  /**
   * 一键登录：点一下按钮即可完成
   */
  handleLogin() {
    console.log('开始登录...');
    this.setData({ loading: true, errorMsg: '' });

    // Step 1: 获取微信登录凭证
    wx.login({
      success: (loginRes) => {
        console.log('获取code成功:', loginRes.code);
        const { code } = loginRes;

        if (!code) {
          this.setData({ loading: false, errorMsg: '获取登录凭证失败，请重试' });
          return;
        }

        wx.showLoading({ title: '登录中…' });

        // Step 2: 调用云函数登录
        console.log('调用云函数...');
        wx.cloud.callFunction({
          name: 'login',
          data: { code: code },
          success: (cloudRes) => {
            console.log('云函数返回:', cloudRes);
            wx.hideLoading();

            const result = cloudRes.result;
            if (result && result.success) {
              // 登录成功
              const loginData = result.data;
              wx.setStorageSync('feleme_login_result', loginData);
              console.log('登录成功，跳转...');
              this.navigateToWebView(loginData);
            } else {
              // 云函数返回失败，使用备用登录
              console.log('云函数失败，使用备用登录...');
              this.fallbackLogin(code);
            }
          },
          fail: (cloudErr) => {
            console.error('云函数调用失败:', cloudErr);
            wx.hideLoading();
            // 云函数调用失败，使用备用登录
            console.log('使用备用登录方案...');
            this.fallbackLogin(code);
          }
        });
      },
      fail: (err) => {
        console.error('wx.login失败:', err);
        this.setData({ loading: false, errorMsg: '获取登录凭证失败' });
      }
    });
  },

  /**
   * 备用登录方案：不依赖云函数
   */
  fallbackLogin(code) {
    console.log('执行备用登录...');

    const loginData = {
      userId: 'local_' + Date.now(),
      openid: '',
      nickname: '微信用户',
      avatarUrl: '',
      gender: 0,
      province: '',
      city: '',
      loginToken: 'local_token_' + Date.now(),
      loginTime: new Date().toISOString(),
      isLocalLogin: true,
    };

    wx.setStorageSync('feleme_login_result', loginData);
    console.log('备用登录成功，跳转...');
    this.navigateToWebView(loginData);
  },

  /**
   * 跳转到 WebView 页面
   */
  navigateToWebView(loginData) {
    const params = {
      __mp_login: '1',
      userId: loginData.userId || '',
      openid: loginData.openid || '',
      nickname: loginData.nickname || '微信用户',
      avatar: loginData.avatarUrl || '',
      gender: String(loginData.gender || 0),
      province: loginData.province || '',
      city: loginData.city || '',
      loginToken: loginData.loginToken || '',
      from: 'miniprogram',
      _t: String(Date.now()),
    };

    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    wx.redirectTo({
      url: `/pages/webview/index?${query}`,
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
