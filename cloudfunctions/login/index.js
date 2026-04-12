/**
 * 微信云函数 - 用户登录（简化版）
 *
 * 流程：
 * 1. 直接获取 openid（云函数环境自带，无需 code）
 * 2. 生成登录凭证 loginToken
 * 3. 返回登录数据（用户档案初始化由 initUser 云函数负责）
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  try {
    // Step 1: 直接获取 openid（云函数环境自带）
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return {
        success: false,
        error: '无法获取用户标识',
      };
    }

    // Step 2: 生成登录凭证
    const loginToken = Buffer.from(JSON.stringify({
      openid,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天有效期
    })).toString('base64');

    return {
      success: true,
      data: {
        openid,
        loginToken,
        loginTime: Date.now(),
      },
    };
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      error: error.message || '登录失败',
    };
  }
};
