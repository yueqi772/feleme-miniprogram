// WebView 页：加载 H5 并桥接数据库操作
var H5_BASE = 'https://mcsclcr2hfli.space.minimaxi.com/';

Page({
  data: {
    src: '',        // 初始为空，避免 web-view 过早加载
    loaded: false,
  },

  onLoad: function() {
    wx.hideTabBar({ animation: false });
    console.log('【webview】onLoad');
    this.loadFromStorage();
  },

  onShow: function() {
    wx.hideTabBar({ animation: false });
    console.log('【webview】onShow');
    this.loadFromStorage();
  },

  loadFromStorage: function() {
    var stored = wx.getStorageSync('feleme_login_result');
    console.log('【webview】loginResult:', JSON.stringify(stored));
    if (stored && stored.loginToken) {
      var url = H5_BASE + '?' + this.buildQuery(stored);
      console.log('【webview】设置src:', url);
      this.setData({ src: url });
    } else {
      console.warn('【webview】无登录数据，跳回首页');
      wx.switchTab({ url: '/pages/index/index' });
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
    console.log('【webview】H5 页面加载成功');
    this.setData({ loaded: true });
  },

  onWebViewError: function() {
    console.error('【webview】H5 页面加载错误');
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
    console.log('【webview】收到H5消息:', type, payload);

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
    console.log('【webview】replyToH5:', data);
  },

  onUnload: function() {
    wx.showTabBar({ animation: false });
  },
});
