// ⚠️ 发布时请替换为你的实际 H5 部署域名
const H5_BASE = 'https://mcsclcr2hfli.space.minimaxi.com/';

Page({
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
      }
    }
  },
  onWebViewLoad() {
    this.setData({ loaded: true });
    wx.miniProgram.postMessage({ data: { type: 'MP_READY', loaded: true } });
  },
  onWebViewError() {
    this.setData({ loaded: true });
    wx.showToast({ title: '页面加载失败', icon: 'none' });
  },
  onWebViewMessage(e) {
    const data = e.detail?.data?.[0];
    if (data?.type === 'H5_REQUEST_LOGIN') {
      wx.redirectTo({ url: '/pages/login/index' });
    }
  },
});
