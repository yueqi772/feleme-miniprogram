/**
 * 云函数：tcb — 通用数据库 CRUD
 *
 * 支持操作：
 *   add    — 添加文档
 *   list   — 查询列表（支持 openid 过滤）
 *   get    — 按 query 查询单条
 *   update — 按 query 更新（$set / $inc）
 *   upsert — 按 query 查找，不存在则插入，存在则更新
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DB = cloud.database();
const _ = DB.command;

exports.main = async (event, context) => {
  const { collection, action, data, query, openid, limit = 20, skip = 0 } = event;

  if (!collection) {
    return { success: false, error: '缺少 collection 参数' };
  }

  const col = DB.collection('feleme_' + collection);

  console.log(`【tcb】${collection}/${action}`, JSON.stringify(data || query || {}));

  try {
    // ─── 添加 ────────────────────────────────────
    if (action === 'add' && data) {
      const res = await col.add({ data: { ...data, createdAt: Date.now() } });
      return { success: true, action: 'add', id: res._id };
    }

    // ─── 列表 ────────────────────────────────────
    if (action === 'list') {
      let q = col.limit(limit).skip(skip).orderBy('createdAt', 'desc');
      if (openid) q = q.where({ openid });
      const res = await q.get();
      return { success: true, action: 'list', list: res.data, count: res.data.length };
    }

    // ─── 单条查询 ────────────────────────────────
    if (action === 'get' && query) {
      const res = await col.where(query).limit(1).get();
      return { success: true, action: 'get', data: res.data[0] || null };
    }

    // ─── 更新 ────────────────────────────────────
    if (action === 'update' && query && data) {
      // 支持 { likes_delta: 1 } 风格的增量更新
      const setData = {};
      const incData = {};
      for (const [k, v] of Object.entries(data)) {
        if (String(k).endsWith('_delta')) {
          incData[k.replace(/_delta$/, '')] = v;
        } else {
          setData[k] = v;
        }
      }
      const updateData = {};
      if (Object.keys(setData).length) updateData.$set = setData;
      if (Object.keys(incData).length) updateData.$inc = incData;
      const res = await col.where(query).update({ data: updateData });
      return { success: true, action: 'update', updated: res.updated };
    }

    // ─── 覆盖写入（先查后删再插） ─────────────────
    if (action === 'upsert' && query && data) {
      const existing = await col.where(query).limit(1).get();
      if (existing.data.length > 0) {
        const oldId = existing.data[0]._id;
        await col.doc(oldId).remove();
      }
      const res = await col.add({ data: { ...query, ...data, createdAt: Date.now() } });
      return { success: true, action: 'upsert', id: res._id };
    }

    return { success: false, error: `不支持的 action: ${action}` };

  } catch (err) {
    console.error('【tcb】错误:', err);
    return { success: false, error: err.message, code: err.code };
  }
};
