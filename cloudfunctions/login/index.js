/**
 * 微信云函数 - 用户登录
 * 功能：
 * 1. 通过 wx.cloud.callContainer 获取 openid
 * 2. 保存用户信息到云数据库
 * 3. 返回用户 ID 和登录凭证
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 通过 code 向微信接口换取 openid
 * @param {string} code - 微信登录凭证
 */
async function getOpenidByCode(code) {
  const appid = cloud.getWXContext().APPID;
  const secret = process.env.WECHAT_APP_SECRET;

  // 优先使用云托管获取 openid（推荐方式）
  try {
    const result = await cloud.callContainer({
      config: {
        env: cloud.DYNAMIC_CURRENT_ENV,
      },
      service: 'weixin', // 微信接口服务
      path: '/getOpenid',
      method: 'POST',
      header: {
        'content-type': 'application/json',
      },
      data: {
        appid,
        code,
      },
    });
    return result.openid;
  } catch (e) {
    console.log('云托管调用失败，尝试直接请求微信接口');
  }

  // 备用方案：直接请求微信接口（需要在云函数环境配置中设置 secret）
  // 注意：secret 不应在客户端暴露，此处仅作备用
  const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

  const httpResult = await cloud.httpRequest({
    url: wxUrl,
    method: 'GET',
  });

  const data = httpResult.data;
  if (data.errcode) {
    throw new Error(`获取 openid 失败: ${data.errmsg}`);
  }

  return data.openid;
}

/**
 * 保存或更新用户信息
 * @param {object} userInfo - 用户信息
 */
async function saveUserInfo(userInfo) {
  const { openid, nickname, avatarUrl, gender, province, city, unionid } = userInfo;

  // 查询是否已存在该用户
  const existUsers = await db.collection('users').where({
    openid: openid,
  }).limit(1).get();

  const now = new Date();
  const userData = {
    openid,
    unionid: unionid || '',
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
    // 用户已存在，更新信息
    userId = existUsers.data[0]._id;
    await db.collection('users').doc(userId).update({
      data: {
        nickname: userData.nickname,
        avatarUrl: userData.avatarUrl,
        gender: userData.gender,
        province: userData.province,
        city: userData.city,
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
  const { code, nickname, avatarUrl, gender, province, city } = event;

  try {
    // Step 1: 获取 openid
    let openid = cloud.getWXContext().OPENID;

    if (!openid && code) {
      openid = await getOpenidByCode(code);
    }

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

    // Step 3: 生成登录会话 token（简化版，实际可用 JWT）
    const loginToken = Buffer.from(JSON.stringify({
      openid,
      userId: userInfo.userId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天过期
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
