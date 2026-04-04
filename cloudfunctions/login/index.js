/**
 * 微信云函数：login
 *
 * 功能：接受微信登录凭证 code，换取用户 openid
 * openid 是用户在每个小程序的唯一标识，可用于标识登录用户
 *
 * 部署方式：
 * 1. 在微信开发者工具中，右键 cloudfunctions/login 文件夹
 * 2. 选择「上传并部署」
 *
 * 注意：
 * - 云函数名（目录名）必须与 pages/login/index.js 中调用的一致
 * - 云环境需先在「云开发控制台」开通
 */

const cloud = require('wx-server-sdk');

cloud.init({
  // 云函数运行环境的云开发环境 ID
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  // event 包含从小程序端传来的参数
  const { code } = event;

  if (!code) {
    return { success: false, error: '缺少 code 参数' };
  }

  console.log('收到登录请求, code:', code);

  try {
    // 获取微信上下文（包含 openid 等用户标识）
    const wxContext = cloud.getWXContext();

    // openid 是用户在当前小程序中的唯一标识
    const openid = wxContext.OPENID;

    if (!openid) {
      // 部分环境可能需要在云开发控制台配置合法登录用户
      return {
        success: false,
        error: '无法获取用户身份，请确认云开发环境已正确配置',
      };
    }

    console.log('登录成功，openid:', openid);

    return {
      success: true,
      data: {
        openid,
        // unionid 需要用户在微信开放平台绑定同主体公众号才能获取
        unionid: wxContext.UNIONID || '',
        // 本次登录会话标识（可用于后端 session）
        session_key: wxContext.SESSION_KEY || '',
      },
    };
  } catch (err) {
    console.error('云函数执行失败', err);
    return { success: false, error: err.message || '服务器错误' };
  }
};
