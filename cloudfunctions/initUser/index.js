/**
 * 云函数：initUser
 *
 * 用户首次登录时初始化记录：
 * - 在 userProfile 集合中创建/更新用户档案
 * - 读取并返回用户的累计数据摘要（testHistory 数量等）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DB = cloud.database();
const _ = DB.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, error: '无法获取用户身份' };
  }

  const { nickname, avatarUrl, gender, province, city } = event;

  const userCol = DB.collection('feleme_userProfile');
  const testCol = DB.collection('feleme_testHistory');
  const diaryCol = DB.collection('feleme_diaries');
  const practiceCol = DB.collection('feleme_practice');

  try {
    // 查询是否已有档案
    const existing = await userCol.where({ openid }).get();

    let profile;
    if (existing.data.length > 0) {
      // 更新登录信息
      profile = existing.data[0];
      await userCol.doc(profile._id).update({
        data: {
          lastLoginAt: Date.now(),
          nickname: nickname || profile.nickname || '微信用户',
          avatarUrl: avatarUrl || profile.avatarUrl || '',
        },
      });
      profile = { ...profile, lastLoginAt: Date.now() };
    } else {
      // 首次登录，创建档案
      const res = await userCol.add({
        data: {
          openid,
          nickname: nickname || '微信用户',
          avatarUrl: avatarUrl || '',
          gender: gender || 0,
          province: province || '',
          city: city || '',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        },
      });
      profile = { _id: res._id, openid, nickname: nickname || '微信用户' };
    }

    // 获取用户统计数据
    const [tests, diaries, practices] = await Promise.all([
      testCol.where({ openid }).count(),
      diaryCol.where({ openid }).count(),
      practiceCol.where({ openid }).count(),
    ]);

    return {
      success: true,
      data: {
        ...profile,
        stats: {
          testCount: tests.total,
          diaryCount: diaries.total,
          practiceCount: practices.total,
        },
      },
    };
  } catch (err) {
    console.error('[initUser] error:', err);
    return { success: false, error: err.message || '初始化失败' };
  }
};
