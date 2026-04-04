App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('Please use base library 2.2.3 or above for cloud capability');
    } else {
      wx.cloud.init({
        env: 'cloudbase-3g22c9ce5bcf0e55',
        traceUser: true
      });
      console.log('Cloud init success');
    }
  }
});
