// WebView 页：加载 H5 并桥接数据库操作
var H5_BASE = 'https://mcsclcr2hfli.space.minimaxi.com/';

Page({
  data: {
    src: H5_BASE,   // web-view 的 src（WXML 用 src）
    loaded: false,  // 控制 loading 遮罩
  },

  onLoad: function(query) {
    var loginData = query.loginData;
    if (loginData) {
      try {
        var data = JSON.parse(decodeURIComponent(loginData));
        var params = [
          '__mp_login=1',
          'nickname=' + encodeURIComponent(data.nickname || ''),
          'avatar=' + encodeURIComponent(data.avatarUrl || ''),
          'gender=' + String(data.gender || 0),
          'province=' + encodeURIComponent(data.province || ''),
          'city=' + encodeURIComponent(data.city || ''),
          'openid=' + encodeURIComponent(data.openid || ''),
          'unionid=' + encodeURIComponent(data.unionid || ''),
          'from=miniprogram',
          '_t=' + Date.now(),
        ].join('&');
        this.setData({ src: H5_BASE + '?' + params });
      } catch(e) {
        console.error('解析登录数据失败', e);
      }
    }
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

    if (type === 'H5_REQUEST_LOGIN') {
      wx.redirectTo({ url: '/pages/login/index' });
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
      wx.cloud.call({
        config: { env: 'cloudbase-3g22c9ce5bcf0e55' },
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
    try {
      wx.miniProgram.postMessage({ data: data });
    } catch(e) {
      console.error('回复 H5 失败:', e);
    }
  },
});
