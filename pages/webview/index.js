// ⚠️ 发布时请替换为你的实际 H5 部署域名
const H5_URL = 'https://mcsclcr2hfli.space.minimaxi.com/';

Page({
<<<<<<< HEAD
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
=======
  data: { webviewUrl: H5_BASE, loaded: false },

  onLoad(query) {
    const { loginData } = query;
    if (loginData) {
      try {
        const data = JSON.parse(decodeURIComponent(loginData));
        const params = new URLSearchParams({
          __mp_login: '1',
          nickname: data.nickname || '',
          avatar: data.avatarUrl || '',
          gender: String(data.gender || 0),
          province: data.province || '',
          city: data.city || '',
          openid: data.openid || '',
          unionid: data.unionid || '',
          from: 'miniprogram',
          _t: String(Date.now()),
        });
        this.setData({ webviewUrl: `${H5_BASE}?${params.toString()}` });
      } catch(e) {
        console.error('解析登录数据失败', e);
        this.setData({ webviewUrl: H5_BASE });
>>>>>>> 3bcb3f2 (feat: webview bridges H5 DB ops to wx.cloud.callFunction via postMessage)
      }
    }
  },

<<<<<<< HEAD
  /**
   * 构建 WebView URL
   */
  buildWebViewUrl(loginData) {
    const params = {
      __mp_login: '1',
      userId: loginData.userId || '',
      openid: loginData.openid || '',
      unionid: loginData.unionid || '',
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
  },

  /**
   * WebView 加载错误
   */
  onWebViewError(e) {
    console.error('WebView 加载失败', e);
=======
  onWebViewLoad() {
    this.setData({ loaded: true });
    console.log('【webview】H5 页面加载完成');
    // 通知 H5：小程序已就绪，可以发消息了
    wx.miniProgram.postMessage({ data: { type: 'MP_READY', loaded: true } });
  },

  onWebViewError() {
>>>>>>> 3bcb3f2 (feat: webview bridges H5 DB ops to wx.cloud.callFunction via postMessage)
    this.setData({ loaded: true });
    wx.showToast({ title: '页面加载失败', icon: 'none' });
  },

<<<<<<< HEAD
  /**
   * 监听 H5 页面通过 postMessage 发来的消息
   */
  onWebViewMessage(e) {
    const data = e.detail && e.detail.data && e.detail.data[0];
    console.log('收到H5页面消息:', data);

    if (!data) return;

    switch (data.type) {
      case 'MP_READY':
        // H5 页面已准备好（登录数据已通过 URL 参数传递，无需再次发送）
        console.log('H5 已就绪');
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
        // H5 页面请求用户信息（小程序无法直接向 WebView 推送，忽略）
        console.log('收到 GET_USER_INFO 请求');
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
=======
  // 接收 H5 页面发来的消息
  onWebViewMessage(e) {
    const msgs = e.detail?.data || [];
    for (const msg of msgs) {
      this.handleH5Message(msg);
    }
  },

  // 处理 H5 发来的各类消息
  handleH5Message(msg) {
    const { type, payload } = msg;

    switch (type) {
      case 'H5_REQUEST_LOGIN':
        wx.redirectTo({ url: '/pages/login/index' });
        break;

      // ─── 数据库写操作 ─────────────────────────────
      case 'DB_ADD':
        this.callCloud('tcb', {
          collection: payload.collection,
          action: 'add',
          data: payload.data,
        }).then(res => {
          this.replyToH5({ msgId: payload._msgId, success: res.success, id: res.id, error: res.error });
        });
        break;

      case 'DB_UPDATE':
        this.callCloud('tcb', {
          collection: payload.collection,
          action: 'update',
          data: payload.data,
          query: payload.query,
        }).then(res => {
          this.replyToH5({ msgId: payload._msgId, success: res.success, error: res.error });
        });
        break;

      case 'DB_LIST':
        this.callCloud('tcb', {
          collection: payload.collection,
          action: 'list',
          openid: payload.openid || '',
          limit: payload.limit || 20,
          skip: payload.skip || 0,
        }).then(res => {
          this.replyToH5({ msgId: payload._msgId, success: res.success, list: res.list || [], error: res.error });
        });
        break;

      case 'DB_GET':
        this.callCloud('tcb', {
          collection: payload.collection,
          action: 'get',
          query: payload.query,
        }).then(res => {
          this.replyToH5({ msgId: payload._msgId, success: res.success, data: res.data, error: res.error });
        });
        break;

      // ─── 登录状态查询 ─────────────────────────────
      case 'GET_LOGIN_INFO':
        const loginData = wx.getStorageSync('feleme_login_result') || {};
        this.replyToH5({ msgId: payload?._msgId, type: 'LOGIN_INFO', data: loginData });
        break;

      default:
        console.log('【webview】未知消息类型:', type, msg);
    }
  },

  // 调用云函数（统一入口）
  callCloud(name, data) {
    return new Promise((resolve) => {
      wx.cloud.call({
        config: { env: 'cloudbase-3g22c9ce5bcf0e55' },
        name,
        data,
        success: (res) => {
          console.log(`【cloud.${name}] 成功:`, res.result);
          resolve(res.result || {});
        },
        fail: (err) => {
          console.error(`【cloud.${name}] 失败:`, err);
          resolve({ success: false, error: err.errMsg || '云函数调用失败' });
        },
      });
    });
  },

  // 向 H5 发消息（通过 evaluateJavaScript）
  replyToH5(data) {
    try {
      wx.miniProgram.postMessage({ data });
    } catch(e) {
      console.error('回复 H5 失败:', e);
>>>>>>> 3bcb3f2 (feat: webview bridges H5 DB ops to wx.cloud.callFunction via postMessage)
    }
  },

  /**
   * 保存操作日志到云数据库
   */
  handleSaveOperationLog(logs) {
    if (!this.data.loginData || !this.data.loginData.loginToken) {
      console.error('未登录，无法保存操作日志');
      return;
    }

    wx.cloud.callFunction({
      name: 'saveOperationLog',
      data: {
        token: this.data.loginData.loginToken,
        logs: logs,
      },
      success: function(res) {
        console.log('保存操作日志成功:', res);
      },
      fail: function(err) {
        console.error('保存操作日志失败:', err);
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
