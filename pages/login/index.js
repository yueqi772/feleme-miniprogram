Page({
  data: { loading: false, errorMsg: '' },

  onLoad() {
    const loginResult = wx.getStorageSync('feleme_login_result');
    if (loginResult && loginResult.loginToken) {
      this.navigateToWebView(loginResult);
    }
  },

  handleLogin() {
    console.log('开始登录...');
    this.setData({ loading: true, errorMsg: '' });

    // Step 1: 获取 code
    wx.login({
      success: (loginRes) => {
        const { code } = loginRes;
        if (!code) {
          this.setData({ loading: false, errorMsg: '获取登录凭证失败，请重试' });
          return;
        }
        console.log('获取 code 成功:', code);
        wx.showLoading({ title: '登录中…' });

        // Step 2: 调用 login 云函数获取 openid
        wx.cloud.callFunction({
          name: 'login',
          env: 'cloudbase-3g22c9ce5bcf0e55',
          data: { code },
          success: async (cloudRes) => {
            wx.hideLoading();
            const result = cloudRes.result;

            if (result && result.success && result.data && result.data.openid) {
              const { openid, unionid } = result.data;

              // Step 3: 初始化用户档案（写入数据库）
              try {
                const initRes = await wx.cloud.callFunction({
                  name: 'initUser',
                  env: 'cloudbase-3g22c9ce5bcf0e55',
                  data: { openid },
                });
                console.log('initUser 返回:', initRes);
              } catch (e) {
                console.warn('initUser 失败（不影响登录）:', e);
              }

              // Step 4: 组装登录数据，跳转 WebView
              const loginData = {
                openid,
                unionid: unionid || '',
                nickname: '微信用户',
                avatarUrl: '',
                loginTime: Date.now(),
                loginToken: openid,
              };
              wx.setStorageSync('feleme_login_result', loginData);
              console.log('登录成功，跳转 WebView...');
              this.navigateToWebView(loginData);
            } else {
              console.error('login 云函数返回异常:', result);
              this.setData({ loading: false, errorMsg: '登录失败，请稍后重试' });
            }
          },
          fail: (cloudErr) => {
            wx.hideLoading();
            console.error('login 云函数调用失败:', cloudErr);
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

  navigateToWebView(loginData) {
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
