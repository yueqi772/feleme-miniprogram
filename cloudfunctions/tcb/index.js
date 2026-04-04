/**
 * 云函数：tcb（诊断版）
 *
 * 用于测试数据库是否正常工作
 * 使用方式：在开发者工具控制台执行：
 *   wx.cloud.callFunction({ name: 'tcb', data: { collection: 'test', action: 'add', data: { msg: 'hello' } } })
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DB = cloud.database();

exports.main = async (event, context) => {
  const { collection, action, data } = event;

  console.log('=== [tcb] 收到请求 ===');
  console.log('collection:', collection);
  console.log('action:', action);
  console.log('data:', JSON.stringify(data));

  if (!collection) {
    return { success: false, error: '缺少 collection 参数', hint: '传入 { collection: "test", action: "add", data: { msg: "hello" } }' };
  }

  const col = DB.collection('feleme_' + collection);

  try {
    // 测试写入
    if (action === 'add' && data) {
      const res = await col.add({ data: { ...data, _test: true, createdAt: Date.now() } });
      console.log('写入成功, _id:', res._id);
      return { success: true, action: 'add', id: res._id, collection: 'feleme_' + collection };
    }

    // 测试读取
    if (action === 'list') {
      const res = await col.limit(5).get();
      return { success: true, action: 'list', count: res.data.length, collection: 'feleme_' + collection };
    }

    return { success: false, error: `未知 action: ${action}` };
  } catch (err) {
    console.error('=== [tcb] 错误 ===');
    console.error(err);
    return { success: false, error: err.message, code: err.code, collection: 'feleme_' + collection };
  }
};
