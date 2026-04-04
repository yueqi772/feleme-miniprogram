// 云开发环境初始化（使用腾讯云开发）
// ⚠️ 请在微信开发者工具中「云开发」控制台开通云开发后，再运行本项目
// ⚠️ 环境 ID：cloudbase-3g22c9ce5bcf0e55（用户提供的环境）
App({
  onLaunch() {
    // 初始化云开发能力
    // env: 填写你的云开发环境 ID
    // traceUser: true 表示记录每次访问的用户身份
    wx.cloud.init({
      env: 'cloudbase-3g22c9ce5bcf0e55',
      traceUser: true,
    });

    console.log('云开发初始化完成，环境:', 'cloudbase-3g22c9ce5bcf0e55');
  },
});
