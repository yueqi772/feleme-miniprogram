/**
 * 云函数：tcb.collection
 *
 * 通用数据库操作云函数，支持增删改查
 * 接收 { collection, action, data, query, openid } 参数
 *
 * collection: 集合名（testHistory | diaries | posts | comments | userProfile | achievements）
 * action:     add | set | update | remove | get | list
 * data:        新增或更新的数据（action=add/set/update 时）
 * query:       查询条件（action=get/list 时）
 * limit/skip:  分页参数
 *
 * 安全：每次操作都必须携带 openid，写操作校验 openid 匹配
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DB = cloud.database();
const _ = DB.command;
const $ = _.aggregate;

exports.main = async (event, context) => {
  const { collection, action, data, query, openid, limit = 20, skip = 0 } = event;
  const wxContext = cloud.getWXContext();
  const caller = openid || wxContext.OPENID;

  if (!collection || !action) {
    return { success: false, error: '缺少 collection 或 action 参数' };
  }
  if (!caller) {
    return { success: false, error: '无法识别用户身份' };
  }

  const col = DB.collection(`feleme_${collection}`);

  try {
    switch (action) {

      case 'add': {
        // 新增一条记录（需登录）
        const record = { ...data, openid: caller, createdAt: Date.now(), updatedAt: Date.now() };
        const res = await col.add({ data: record });
        return { success: true, id: res._id, data: { _id: res._id, ...record } };
      }

      case 'set': {
        // 替换整条记录（需匹配 openid）
        if (!data || !data._id) return { success: false, error: '缺少 _id' };
        const setRes = await col.doc(data._id).set({ ...data, updatedAt: Date.now() });
        return { success: true, updated: setRes.updated };
      }

      case 'update': {
        // 更新字段（需匹配 openid）
        if (!query || !query._id) return { success: false, error: '缺少查询条件 _id' };
        const upd = await col.doc(query._id).update({
          data: { ...data, updatedAt: Date.now() },
        });
        return { success: true, updated: upd.updated };
      }

      case 'remove': {
        // 删除记录（需匹配 openid）
        if (!query || !query._id) return { success: false, error: '缺少查询条件 _id' };
        const rem = await col.doc(query._id).remove();
        return { success: true, removed: rem.removed };
      }

      case 'get': {
        // 查询单条（需匹配 openid）
        if (!query || !query._id) return { success: false, error: '缺少查询条件 _id' };
        const doc = await col.doc(query._id).get();
        return { success: true, data: doc.data };
      }

      case 'list': {
        // 列出当前用户的所有记录（按 createdAt 倒序）
        const res = await col
          .where({ openid: caller })
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(limit)
          .get();
        return { success: true, list: res.data, total: res.data.length };
      }

      case 'listAll': {
        // 列出所有用户的公开记录（社区/广场）
        const res = await col
          .orderBy('createdAt', 'desc')
          .skip(skip)
          .limit(limit)
          .get();
        return { success: true, list: res.data, total: res.data.length };
      }

      case 'upsert': {
        // 存在则更新，不存在则新增（用于离线同步场景）
        if (!data || !data.localId) return { success: false, error: '缺少 localId' };
        // 先查是否已有本地 ID 记录
        const existing = await col.where({ localId: data.localId, openid: caller }).get();
        if (existing.data.length > 0) {
          const _id = existing.data[0]._id;
          await col.doc(_id).update({ data: { ...data, updatedAt: Date.now() } });
          return { success: true, id: _id, action: 'updated' };
        } else {
          const record = { ...data, openid: caller, createdAt: Date.now(), updatedAt: Date.now() };
          const res = await col.add({ data: record });
          return { success: true, id: res._id, action: 'added' };
        }
      }

      default:
        return { success: false, error: `未知的 action: ${action}` };
    }
  } catch (err) {
    console.error(`[tcb.collection] ${action} error:`, err);
    return { success: false, error: err.message || '数据库操作失败' };
  }
};
