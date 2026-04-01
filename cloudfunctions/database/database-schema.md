# 云数据库集合配置

本目录包含云数据库集合的配置文件和初始化脚本。

## 集合列表

### 1. users - 用户信息集合

用于存储微信用户的基本信息。

**集合名称**: `users`

**字段定义**:

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| _id | ObjectId | 记录 ID（自动生成） | 否 |
| openid | string | 微信用户唯一标识 | 是 |
| unionid | string | 微信 UnionID（可选） | 否 |
| nickname | string | 用户昵称 | 是 |
| avatarUrl | string | 用户头像 URL | 是 |
| gender | number | 性别: 0=未知, 1=男, 2=女 | 是 |
| province | string | 省份 | 否 |
| city | string | 城市 | 否 |
| createTime | Date | 创建时间 | 是 |
| updateTime | Date | 更新时间 | 是 |
| lastLoginTime | Date | 最后登录时间 | 是 |

**索引配置**:
- `openid` - 唯一索引（用于快速查询用户）
- `createTime` - 普通索引（用于时间范围查询）
- `lastLoginTime` - 普通索引（用于查询活跃用户）

**权限配置**:
```json
{
  "read": true,
  "create": "cloudfunction",
  "update": "cloudfunction",
  "delete": "cloudfunction"
}
```

---

### 2. operation_logs - 操作日志集合

用于存储 H5 应用的用户操作日志。

**集合名称**: `operation_logs`

**字段定义**:

| 字段名 | 类型 | 说明 | 必填 |
|--------|------|------|------|
| _id | ObjectId | 记录 ID（自动生成） | 否 |
| userId | string | 用户 ID | 是 |
| openid | string | 微信用户唯一标识 | 是 |
| type | string | 操作类型 | 是 |
| page | string | 页面标识 | 是 |
| action | string | 操作名称 | 否 |
| data | object | 附加数据 | 否 |
| duration | number | 操作耗时（毫秒） | 否 |
| createTime | Date | 创建时间 | 是 |
| appVersion | string | 应用版本 | 否 |
| platform | string | 平台标识 | 是 |
| sessionId | string | 会话 ID | 否 |

**操作类型枚举**:
- `page_view` - 页面浏览
- `button_click` - 按钮点击
- `form_submit` - 表单提交
- `api_call` - API 调用
- `error` - 错误发生
- `custom` - 自定义事件

**索引配置**:
- `userId` - 普通索引（用于查询用户操作记录）
- `openid` - 普通索引（用于按用户查询）
- `type` - 普通索引（用于按类型统计）
- `page` - 普通索引（用于按页面统计）
- `createTime` - 普通索引（用于时间范围查询）

**权限配置**:
```json
{
  "read": "cloudfunction",
  "create": "cloudfunction",
  "update": false,
  "delete": false
}
```

---

## 初始化步骤

### 方法一：手动创建（推荐）

1. 登录微信公众平台
2. 进入「云开发」控制台
3. 点击「数据库」菜单
4. 创建集合 `users` 和 `operation_logs`
5. 根据上述字段定义设置权限

### 方法二：使用云函数初始化

运行初始化云函数来自动创建集合和索引。

---

## 数据统计查询示例

### 统计用户日活跃（DAU）
```javascript
db.collection('operation_logs').aggregate()
  .group({
    _id: {
      date: $.dateToString({
        format: '%Y-%m-%d',
        date: '$createTime'
      }),
      openid: '$openid'
    }
  })
  .group({
    _id: '$_id.date',
    count: $.sum(1)
  })
  .sort({ _id: -1 })
  .limit(30)
```

### 统计页面访问量
```javascript
db.collection('operation_logs').aggregate()
  .match({ type: 'page_view' })
  .group({
    _id: '$page',
    count: $.sum(1)
  })
  .sort({ count: -1 })
```

### 统计用户留存
```javascript
// 计算次日留存率
db.collection('operation_logs').aggregate()
  .group({
    _id: {
      date: $.dateToString({
        format: '%Y-%m-%d',
        date: '$createTime'
      }),
      openid: '$openid'
    }
  })
  .group({
    _id: '$_id.date',
    users: $.addToSet('$_id.openid')
  })
  .sort({ _id: -1 })
  .limit(7)
```
