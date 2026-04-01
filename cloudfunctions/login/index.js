/**
 * 微信云函数 - 用户登录（简化版）
 *
 * 简化登录流程：
 * 1. 直接获取 openid（云函数环境自带）
 * 2. 保存/更新用户信息
 * 3. 返回登录凭证
 *
 * 无需前端传递 code，无需用户授权
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 保存或更新用户信息
 * @param {object} userInfo - 用户信息
 */
async function saveUserInfo(userInfo) {
  const { openid, nickname, avatarUrl, gender, province, city } = userInfo;

  // 查询是否已存在该用户
  const existUsers = await db.collection('users').where({
    openid: openid,
  }).limit(1).get();

  const now = new Date();

  // 构建用户数据，缺失字段使用默认值
  const userData = {
    openid,
    nickname: nickname || '微信用户',
    avatarUrl: avatarUrl || '',
    gender: gender || 0,
    province: province || '',
    city: city || '',
    lastLoginTime: now,
    updateTime: now,
  };

  let userId;

  if (existUsers.data && existUsers.data.length > 0) {
    // 用户已存在，更新登录信息
    userId = existUsers.data[0]._id;

    // 如果新登录没有昵称头像，保留原有的
    const existingUser = existUsers.data[0];
    if (!nickname && existingUser.nickname) {
      userData.nickname = existingUser.nickname;
    }
    if (!avatarUrl && existingUser.avatarUrl) {
      userData.avatarUrl = existingUser.avatarUrl;
    }

    await db.collection('users').doc(userId).update({
      data: {
        lastLoginTime: userData.lastLoginTime,
        updateTime: userData.updateTime,
      },
    });
  } else {
    // 新用户，创建记录
    userData.createTime = now;
    const addResult = await db.collection('users').add({
      data: userData,
    });
    userId = addResult._id;
  }

  return {
    userId,
    openid,
    ...userData,
  };
}

exports.main = async (event, context) => {
  const { nickname, avatarUrl, gender, province, city } = event;

  try {
    // Step 1: 直接获取 openid（云函数环境自带）
    const openid = cloud.getWXContext().OPENID;

    if (!openid) {
      return {
        success: false,
        error: '无法获取用户标识',
      };
    }

    // Step 2: 保存用户信息到数据库
    const userInfo = await saveUserInfo({
      openid,
      nickname,
      avatarUrl,
      gender,
      province,
      city,
    });

    // Step 3: 生成登录凭证
    const loginToken = Buffer.from(JSON.stringify({
      openid,
      userId: userInfo.userId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天有效期
    })).toString('base64');

    return {
      success: true,
      data: {
        userId: userInfo.userId,
        openid,
        nickname: userInfo.nickname,
        avatarUrl: userInfo.avatarUrl,
        loginToken,
        loginTime: userInfo.lastLoginTime,
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
