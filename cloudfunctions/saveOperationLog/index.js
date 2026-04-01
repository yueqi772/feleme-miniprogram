/**
 * 微信云函数 - 保存操作日志
 * 功能：
 * 1. 接收 H5 应用发送的操作日志
 * 2. 验证登录凭证
 * 3. 保存操作日志到云数据库
 */
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

// 操作类型枚举
const OPERATION_TYPES = {
  PAGE_VIEW: 'page_view',           // 页面浏览
  BUTTON_CLICK: 'button_click',     // 按钮点击
  FORM_SUBMIT: 'form_submit',       // 表单提交
  API_CALL: 'api_call',             // API 调用
  ERROR: 'error',                   // 错误发生
  CUSTOM: 'custom',                 // 自定义事件
};

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

/**
 * 校验操作日志数据
 * @param {object} log - 操作日志
 */
function validateLog(log) {
  if (!log || typeof log !== 'object') {
    return { valid: false, error: '日志数据格式错误' };
  }

  if (!log.type || !Object.values(OPERATION_TYPES).includes(log.type)) {
    return { valid: false, error: '不支持的操作类型' };
  }

  if (!log.page || typeof log.page !== 'string') {
    return { valid: false, error: '页面信息缺失' };
  }

  return { valid: true };
}

/**
 * 批量保存操作日志
 * @param {Array} logs - 日志数组
 * @param {object} userInfo - 用户信息
 */
async function batchSaveLogs(logs, userInfo) {
  const now = new Date();
  const insertData = logs.map((log) => ({
    ...log,
    userId: userInfo.userId,
    openid: userInfo.openid,
    createTime: now,
    // 额外信息
    appVersion: log.appVersion || '1.0.0',
    platform: 'miniprogram_h5',
    sessionId: log.sessionId || '',
  }));

  // 批量插入
  const result = await db.collection('operation_logs').add({
    data: insertData,
  });

  return {
    insertedCount: result.ids ? result.ids.length : insertData.length,
    ids: result.ids || [],
  };
}

/**
 * 保存单条操作日志
 * @param {object} log - 日志数据
 * @param {object} userInfo - 用户信息
 */
async function saveSingleLog(log, userInfo) {
  const now = new Date();

  const result = await db.collection('operation_logs').add({
    data: {
      ...log,
      userId: userInfo.userId,
      openid: userInfo.openid,
      createTime: now,
      // 额外信息
      appVersion: log.appVersion || '1.0.0',
      platform: 'miniprogram_h5',
      sessionId: log.sessionId || '',
    },
  });

  return {
    insertedId: result._id,
  };
}

exports.main = async (event, context) => {
  const { token, logs } = event;

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

    const userInfo = {
      userId: payload.userId,
      openid: payload.openid,
    };

    // Step 2: 判断是批量还是单条
    if (Array.isArray(logs) && logs.length > 0) {
      // 批量保存
      const results = [];
      for (const log of logs) {
        const validation = validateLog(log);
        if (!validation.valid) {
          results.push({
            success: false,
            error: validation.error,
          });
          continue;
        }

        try {
          const result = await saveSingleLog(log, userInfo);
          results.push({
            success: true,
            id: result.insertedId,
          });
        } catch (err) {
          results.push({
            success: false,
            error: err.message,
          });
        }
      }

      return {
        success: true,
        data: {
          total: logs.length,
          successCount: results.filter((r) => r.success).length,
          results,
        },
      };
    } else if (logs && typeof logs === 'object') {
      // 单条保存
      const validation = validateLog(logs);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      const result = await saveSingleLog(logs, userInfo);

      return {
        success: true,
        data: {
          insertedId: result.insertedId,
        },
      };
    } else {
      return {
        success: false,
        error: '日志数据格式错误',
      };
    }
  } catch (error) {
    console.error('保存操作日志失败:', error);
    return {
      success: false,
      error: error.message || '保存失败',
    };
  }
};

// 导出操作类型常量，供外部使用
exports.OPERATION_TYPES = OPERATION_TYPES;
