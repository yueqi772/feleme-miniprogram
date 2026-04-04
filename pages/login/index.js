Page({
  data: { loading: false, errorMsg: '' },

  onLoad() {
    // 检查是否已登录
    const loginResult = wx.getStorageSync('feleme_login_result');
    if (loginResult && loginResult.loginToken) {
      this.navigateToWebView(loginResult);
    }
  },

  handleLogin() {
    console.log('开始登录...');
    this.setData({ loading: true, errorMsg: '' });

    wx.login({
      success: (loginRes) => {
        const { code } = loginRes;
        if (!code) {
          this.setData({ loading: false, errorMsg: '获取登录凭证失败，请重试' });
          return;
        }
        console.log('获取code成功:', code);
        wx.showLoading({ title: '登录中…' });

        // 调用云函数 login，换取 openid
        wx.cloud.callFunction({
          name: 'login',               // 云函数名（与 cloudfunctions/login 目录名一致）
          env: 'cloudbase-3g22c9ce5bcf0e55', // 云开发环境 ID
          data: { code },
          success: (cloudRes) => {
            wx.hideLoading();
            console.log('云函数返回:', cloudRes);
            const result = cloudRes.result;

            if (result && result.success && result.data && result.data.openid) {
              // 登录成功，组装用户数据，跳转 WebView
              const { openid, unionid } = result.data;
              const loginData = {
                openid,
                unionid: unionid || '',
                nickname: '微信用户',
                avatarUrl: '',
                loginTime: Date.now(),
                loginToken: openid, // 用 openid 作为登录标识
              };
              wx.setStorageSync('feleme_login_result', loginData);
              console.log('登录成功，跳转 WebView...');
              this.navigateToWebView(loginData);
            } else {
              // 云函数返回数据异常，使用备用本地登录
              console.log('云函数返回异常，使用备用登录...', result);
              this.fallbackLogin(code);
            }
          },
          fail: (cloudErr) => {
            wx.hideLoading();
            console.error('云函数调用失败:', cloudErr);
            this.setData({ loading: false, errorMsg: '网络错误，请检查网络后重试' });
          },
        });
      },
      fail: (err) => {
        this.setData({ loading: false, errorMsg: '获取登录凭证失败' });
        console.error('wx.login 失败:', err);
      },
    });
  },

  // 备用登录：直接用 code 作为标识，不依赖云函数
  fallbackLogin(code) {
    const loginData = {
      openid: '',
      unionid: '',
      nickname: '微信用户',
      avatarUrl: '',
      loginTime: Date.now(),
      loginToken: 'local_' + Date.now(),
      note: '本地离线登录，openid 未获取',
    };
    wx.setStorageSync('feleme_login_result', loginData);
    this.navigateToWebView(loginData);
  },

  navigateToWebView(loginData) {
    // 清理旧登录态
    wx.removeStorageSync('feleme_login');
    const encoded = encodeURIComponent(JSON.stringify(loginData));
    wx.redirectTo({
      url: `/pages/webview/index?loginData=${encoded}&from=miniprogram`,
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
