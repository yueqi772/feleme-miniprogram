Page({
  data: { loading: false, errorMsg: '' },

  onLoad() {
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

    // Step 1: 获取 code
    wx.login({
      success: (loginRes) => {
        console.log('获取code成功:', loginRes.code);
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
          data: { code },
          success: async (cloudRes) => {
            wx.hideLoading();
            const result = cloudRes.result;

            if (result && result.success) {
              const loginData = result.data;

              // Step 3: 尝试初始化用户档案（写入数据库，失败不影响登录）
              try {
                const initRes = await wx.cloud.callFunction({
                  name: 'initUser',
                  data: { openid: loginData.openid },
                });
                console.log('initUser 返回:', initRes);
              } catch (e) {
                console.warn('initUser 失败（不影响登录）:', e);
              }

              wx.setStorageSync('feleme_login_result', loginData);
              console.log('登录成功，跳转...');
              this.navigateToWebView(loginData);
            } else {
              console.error('login 云函数返回异常:', result);
              this.setData({ loading: false, errorMsg: result && result.error || '登录失败，请稍后重试' });
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
        console.error('wx.login失败:', err);
        this.setData({ loading: false, errorMsg: '获取登录凭证失败' });
      }
    });
  },

  /**
   * 跳转到 WebView 页面
   * 登录数据存入 Storage，并通过 URL 参数传递给 webview 页面
   */
  navigateToWebView(loginData) {
    wx.setStorageSync('feleme_login_result', loginData);
    var param = encodeURIComponent(JSON.stringify(loginData));
    wx.redirectTo({
      url: '/pages/webview/index?loginData=' + param,
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
