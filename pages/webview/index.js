// WebView 页：加载 H5 并桥接数据库操作
var H5_BASE = 'https://mcsclcr2hfli.space.minimaxi.com/';

Page({
  data: {
    webviewUrl: H5_BASE,
    loaded: false,
  },

  onLoad: function(query) {
    wx.hideTabBar({ animation: false });

    // 优先从 URL 参数取登录数据（redirectTo 跳转场景）
    var loginData = query.loginData;
    if (loginData) {
      try {
        var data = JSON.parse(decodeURIComponent(loginData));
        this.setData({ webviewUrl: H5_BASE + '?' + this.buildQuery(data) });
        return;
      } catch(e) {
        console.error('解析登录数据失败', e);
      }
    }

    // 备用：从 Storage 取（switchTab 跳转场景）
    var stored = wx.getStorageSync('feleme_login_result');
    if (stored && stored.loginToken) {
      this.setData({ webviewUrl: H5_BASE + '?' + this.buildQuery(stored) });
    }
  },

  onShow: function() {
    wx.hideTabBar({ animation: false });

    // switchTab 不触发 onLoad，onShow 时补充读取 Storage
    if (!this.data.webviewUrl || this.data.webviewUrl === H5_BASE) {
      var stored = wx.getStorageSync('feleme_login_result');
      if (stored && stored.loginToken) {
        this.setData({ webviewUrl: H5_BASE + '?' + this.buildQuery(stored) });
      }
    }
  },

  buildQuery: function(data) {
    return [
      '__mp_login=1',
      'nickname=' + encodeURIComponent(data.nickname || ''),
      'avatar=' + encodeURIComponent(data.avatarUrl || ''),
      'gender=' + String(data.gender || 0),
      'province=' + encodeURIComponent(data.province || ''),
      'city=' + encodeURIComponent(data.city || ''),
      'openid=' + encodeURIComponent(data.openid || ''),
      'unionid=' + encodeURIComponent(data.unionid || ''),
      'loginToken=' + encodeURIComponent(data.loginToken || ''),
      'from=miniprogram',
      '_t=' + Date.now(),
    ].join('&');
  },

  onWebViewLoad: function() {
    this.setData({ loaded: true });
    console.log('【webview】H5 加载完成');
  },

  onWebViewError: function() {
    this.setData({ loaded: true });
    wx.showToast({ title: '页面加载失败', icon: 'none' });
  },

  onWebViewMessage: function(e) {
    var msgs = (e.detail && e.detail.data) || [];
    for (var i = 0; i < msgs.length; i++) {
      this.handleH5Message(msgs[i]);
    }
  },

  handleH5Message: function(msg) {
    var type = msg.type;
    var payload = msg.payload || {};
    console.log('【webview】收到 H5 消息:', msg);

    if (type === 'H5_REQUEST_LOGIN') {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }

    if (type === 'DB_ADD') {
      this.callCloud('tcb', {
        collection: payload.collection,
        action: 'add',
        data: payload.data,
      }).then(function(res) {
        this.replyToH5({ msgId: payload._msgId, success: res.success, id: res.id, error: res.error });
      }.bind(this));
      return;
    }

    if (type === 'DB_UPDATE') {
      this.callCloud('tcb', {
        collection: payload.collection,
        action: 'update',
        data: payload.data,
        query: payload.query,
      }).then(function(res) {
        this.replyToH5({ msgId: payload._msgId, success: res.success, error: res.error });
      }.bind(this));
      return;
    }

    if (type === 'DB_LIST') {
      this.callCloud('tcb', {
        collection: payload.collection,
        action: 'list',
        openid: payload.openid || '',
        limit: payload.limit || 20,
        skip: payload.skip || 0,
      }).then(function(res) {
        this.replyToH5({ msgId: payload._msgId, success: res.success, list: res.list || [], error: res.error });
      }.bind(this));
      return;
    }

    if (type === 'DB_GET') {
      this.callCloud('tcb', {
        collection: payload.collection,
        action: 'get',
        query: payload.query,
      }).then(function(res) {
        this.replyToH5({ msgId: payload._msgId, success: res.success, data: res.data, error: res.error });
      }.bind(this));
      return;
    }

    if (type === 'GET_LOGIN_INFO') {
      var loginData = wx.getStorageSync('feleme_login_result') || {};
      this.replyToH5({ msgId: payload._msgId || null, type: 'LOGIN_INFO', data: loginData });
      return;
    }

    console.log('【webview】未知消息类型:', type);
  },

  callCloud: function(name, data) {
    return new Promise(function(resolve) {
      wx.cloud.callFunction({
        name: name,
        data: data,
        success: function(res) {
          console.log('【cloud.' + name + '】成功:', res.result);
          resolve(res.result || {});
        },
        fail: function(err) {
          console.error('【cloud.' + name + '】失败:', err);
          resolve({ success: false, error: err.errMsg || '云函数调用失败' });
        },
      });
    });
  },

  replyToH5: function(data) {
    console.log('【webview】回复 H5:', data);
    // 注：wx.miniProgram.postMessage 只在 H5 侧可用
    // 小程序无法主动推送消息给 WebView，此处仅记录日志
  },

  onUnload: function() {
    wx.showTabBar({ animation: false });
  },
});
