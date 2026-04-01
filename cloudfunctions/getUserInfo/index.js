/**
 * 微信云函数 - 获取用户信息
 * 功能：
 * 1. 通过登录凭证验证用户
 * 2. 返回用户详细信息
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 验证登录 token
 * @param {string} token - 登录凭证
 */
function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);

    // 检查是否过期
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (e) {
    return null;
  }
}

exports.main = async (event, context) => {
  const { token, userId } = event;

  try {
    // Step 1: 验证登录凭证
    const payload = verifyToken(token);

    if (!payload) {
      return {
        success: false,
        error: '登录凭证无效或已过期',
        code: 'INVALID_TOKEN',
      };
    }

    // Step 2: 查询用户信息
    let userInfo;

    if (userId) {
      // 通过 userId 查询
      const result = await db.collection('users').doc(userId).get();
      userInfo = result.data;
    } else {
      // 通过 openid 查询
      const result = await db.collection('users').where({
        openid: payload.openid,
      }).limit(1).get();

      userInfo = result.data && result.data.length > 0 ? result.data[0] : null;
    }

    if (!userInfo) {
      return {
        success: false,
        error: '用户不存在',
        code: 'USER_NOT_FOUND',
      };
    }

    // Step 3: 返回用户信息（不包含敏感字段）
    return {
      success: true,
      data: {
        userId: userInfo._id,
        openid: userInfo.openid,
        nickname: userInfo.nickname,
        avatarUrl: userInfo.avatarUrl,
        gender: userInfo.gender,
        province: userInfo.province,
        city: userInfo.city,
        createTime: userInfo.createTime,
        lastLoginTime: userInfo.lastLoginTime,
      },
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      success: false,
      error: error.message || '获取用户信息失败',
    };
  }
};
