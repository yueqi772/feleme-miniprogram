// ⚠️ 发布时请替换为你的实际 H5 部署域名
const H5_URL = 'https://yueqi772.github.io/feleme-web/';

Page({
  data: {
    src: H5_URL,
    loaded: false,
    loginData: null,
  },

  onLoad() {
    console.log('WebView页面加载');

    // 隐藏 tabBar
    wx.hideTabBar({ animation: false });

    this.loadLoginData();
  },

  onShow() {
    // switchTab 不触发 onLoad，需在 onShow 里重新读取最新登录数据
    wx.hideTabBar({ animation: false });
    this.loadLoginData();
  },

  /**
   * 从本地存储读取登录数据并构建 WebView URL
   */
  loadLoginData() {
    const loginResult = wx.getStorageSync('feleme_login_result');
    if (loginResult && loginResult.loginToken) {
      // 只有登录数据变化时才更新（避免 WebView 重复刷新）
      const current = this.data.loginData;
      if (!current || current.loginToken !== loginResult.loginToken) {
        this.setData({ loginData: loginResult });
        const targetUrl = this.buildWebViewUrl(loginResult);
        this.setData({ src: targetUrl });
        console.log('构建WebView URL:', targetUrl);
      }
    }
  },

  /**
   * 构建 WebView URL
   */
  buildWebViewUrl(loginData) {
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

    const query = Object.keys(params)
      .map(function(k) { return k + '=' + encodeURIComponent(params[k]); })
      .join('&');

    return H5_URL + '?' + query;
  },

  /**
   * WebView 加载完成
   */
  onWebViewLoad() {
    console.log('WebView 加载完成');
    this.setData({ loaded: true });

    // 通知 H5 页面小程序已准备就绪
    wx.miniProgram.postMessage({
      data: {
        type: 'MP_READY',
        loaded: true,
        loginData: this.data.loginData,
      },
    });
  },

  /**
   * WebView 加载错误
   */
  onWebViewError(e) {
    console.error('WebView 加载失败', e);
    this.setData({ loaded: true });
    wx.showToast({ title: '页面加载失败', icon: 'none' });
  },

  /**
   * 监听 H5 页面通过 postMessage 发来的消息
   */
  onWebViewMessage(e) {
    const data = e.detail?.data?.[0];
    console.log('收到H5页面消息:', data);

    if (!data) return;

    switch (data.type) {
      case 'MP_READY':
        // H5 页面已准备好，发送登录数据
        if (this.data.loginData) {
          wx.miniProgram.postMessage({
            data: {
              type: 'LOGIN_DATA',
              loginData: this.data.loginData,
            },
          });
        }
        break;

      case 'H5_REQUEST_LOGIN':
        // H5 页面请求重新登录
        wx.redirectTo({ url: '/pages/login/index' });
        break;

      case 'SAVE_OPERATION_LOG':
        // H5 页面请求保存操作日志
        this.handleSaveOperationLog(data.logs);
        break;

      case 'GET_USER_INFO':
        // H5 页面请求获取用户信息
        wx.miniProgram.postMessage({
          data: {
            type: 'USER_INFO',
            userInfo: this.data.loginData,
          },
        });
        break;

      case 'TOAST':
        wx.showToast({
          title: data.message || '',
          icon: data.icon || 'none',
          duration: data.duration || 2000,
        });
        break;

      default:
        console.log('未处理的消息类型:', data.type);
    }
  },

  /**
   * 保存操作日志到云数据库
   */
  handleSaveOperationLog(logs) {
    if (!this.data.loginData?.loginToken) {
      console.error('未登录，无法保存操作日志');
      wx.miniProgram.postMessage({
        data: {
          type: 'SAVE_OPERATION_LOG_RESULT',
          success: false,
          error: '未登录',
        },
      });
      return;
    }

    wx.cloud.callFunction({
      name: 'saveOperationLog',
      data: {
        token: this.data.loginData.loginToken,
        logs: logs,
      },
      success: (res) => {
        console.log('保存操作日志成功:', res);
        wx.miniProgram.postMessage({
          data: {
            type: 'SAVE_OPERATION_LOG_RESULT',
            success: true,
            data: res.result,
          },
        });
      },
      fail: (err) => {
        console.error('保存操作日志失败:', err);
        wx.miniProgram.postMessage({
          data: {
            type: 'SAVE_OPERATION_LOG_RESULT',
            success: false,
            error: err.message || '保存失败',
          },
        });
      },
    });
  },

  /**
   * 页面卸载时恢复 tabBar
   */
  onUnload() {
    wx.showTabBar({ animation: false });
  },
});
