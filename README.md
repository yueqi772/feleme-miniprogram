# 职场清醒笔记 - 微信小程序

> 将现有 H5 应用嵌入微信小程序，通过小程序登录态桥接实现静默登录，支持云函数存储用户数据和操作日志。

## 架构

```
用户 → 小程序(index页) → 小程序(login页)
                                   ↓ wx.login() + wx.getUserProfile()
                                   ↓ 调用云函数 login
                                   ↓ 保存用户信息到云数据库
                                   ↓ 携带登录数据 + token
                              WebView页 → 加载 H5 并传递登录参数
                                            ↓
                                      H5 页面
                                      读取 URL 参数
                                      自动完成登录
                                            ↓
                                      WebView 桥接
                                      记录操作日志
                                            ↓
                                      调用云函数 saveOperationLog
                                            ↓
                                      保存到云数据库 operation_logs
```

## 目录结构

```
feleme-miniprogram/
├── app.json / app.js / app.wxss   # 小程序全局配置
├── pages/
│   ├── index/     # 首页（功能介绍 + 引导登录）
│   ├── login/     # 登录页（wx.login + wx.getUserProfile + 云函数）
│   └── webview/   # WebView（加载 H5，桥接通信）
├── cloudfunctions/              # 云函数目录
│   ├── login/                  # 用户登录云函数
│   ├── saveOperationLog/        # 保存操作日志云函数
│   ├── getUserInfo/             # 获取用户信息云函数
│   └── database/                # 数据库集合配置
│       └── database-schema.md   # 数据库 Schema 文档
├── web-sdk/                     # H5 桥接 SDK
│   ├── miniProgramBridge.js     # 核心桥接 SDK
│   ├── useMiniProgramBridge.js  # React Hook
│   └── README.md               # SDK 使用文档
└── README.md
```

## 功能特性

### 1. 云函数登录
- 通过微信云函数处理用户登录
- 自动换取 openid
- 保存用户信息到云数据库
- 生成登录凭证（token）

### 2. WebView 桥接
- H5 与小程序双向通信
- 支持登录态传递
- 支持操作日志记录
- 支持 Toast、导航等 UI 操作

### 3. 操作日志
- 页面浏览追踪
- 按钮点击追踪
- 表单提交追踪
- API 调用追踪
- 错误追踪
- 自定义事件追踪

### 4. 数据分析支持
- 用户行为数据存储
- 批量日志写入
- 时间范围查询
- 用户维度统计

## 配置步骤

### 1. 注册小程序
在 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序，获取 AppID

### 2. 修改 project.config.json
将 `appid` 替换为你的小程序 AppID：
```json
"appid": "wx1234567890abcdef"
```

### 3. 初始化云开发环境
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入「云开发」控制台
3. 创建环境（记录环境 ID）

### 4. 创建云函数
1. 在开发者工具中右键 `cloudfunctions` 文件夹
2. 选择「上传并部署：云端安装依赖」
3. 对每个云函数文件夹重复此操作

### 5. 创建数据库集合
1. 进入云开发控制台 → 「数据库」
2. 创建集合 `users`
3. 创建集合 `operation_logs`
4. 参考 `cloudfunctions/database/database-schema.md` 设置索引和权限

### 6. 修改 H5 部署地址
编辑 `src/pages/webview/index.tsx`，将 `H5_URL` 替换为你的 H5 实际地址：
```typescript
const H5_URL = 'https://your-domain.com/';
```

### 7. 准备 tabBar 图标
在 `static/` 目录放入 4 个 PNG 图标（推荐尺寸 81×81）：
- `tab-home.png` / `tab-home-active.png`
- `tab-web.png` / `tab-web-active.png`

### 8. 导入微信开发者工具
1. 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 新建项目 → 选择本目录 → 填入 AppID → 确认
3. 等待编译完成即可预览

### 9. 发布
- 在开发者工具中点击「上传」发布体验版/正式版
- 在微信公众平台后台提交审核

## 云函数说明

### login 云函数
处理用户登录，返回用户信息和登录凭证。

**请求参数：**
```typescript
{
  code: string,        // 微信登录凭证
  nickname: string,    // 用户昵称
  avatarUrl: string,   // 头像 URL
  gender: number,      // 性别
  province: string,     // 省份
  city: string,         // 城市
}
```

**返回数据：**
```typescript
{
  success: boolean,
  data: {
    userId: string,
    openid: string,
    nickname: string,
    avatarUrl: string,
    loginToken: string,
    loginTime: Date,
  }
}
```

### saveOperationLog 云函数
保存用户操作日志到数据库。

**请求参数：**
```typescript
{
  token: string,        // 登录凭证
  logs: Array<{
    type: string,      // 操作类型
    page: string,       // 页面标识
    action: string,     // 操作名称
    data?: object,      // 附加数据
    duration?: number,  // 操作耗时
    sessionId?: string, // 会话 ID
  }>
}
```

**操作类型：**
- `page_view` - 页面浏览
- `button_click` - 按钮点击
- `form_submit` - 表单提交
- `api_call` - API 调用
- `error` - 错误发生
- `custom` - 自定义事件

## H5 端集成

### 1. 引入 SDK
```html
<script src="./miniProgramBridge.js"></script>
```

### 2. 初始化
```javascript
const bridge = new MiniProgramBridge({
  debug: true,
  onReady: (loginData) => {
    console.log('登录成功:', loginData);
  }
});
```

### 3. 追踪使用
```javascript
// 追踪页面浏览
bridge.trackPageView('/home');

// 追踪按钮点击
bridge.trackButtonClick('/home', '提交按钮');

// 追踪表单提交
bridge.trackFormSubmit('/register', 'form-001');

// 追踪错误
try {
  await fetch('/api/data');
} catch (error) {
  bridge.trackError('/home', error);
}

// 追踪自定义事件
bridge.trackCustom('/game', 'levelComplete', { level: 5 });
```

详细文档请参考 `web-sdk/README.md`

## 数据库集合

### users 集合
存储用户基本信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| openid | string | 微信用户唯一标识 |
| unionid | string | UnionID（可选） |
| nickname | string | 用户昵称 |
| avatarUrl | string | 头像 URL |
| gender | number | 性别 |
| province | string | 省份 |
| city | string | 城市 |
| createTime | Date | 创建时间 |
| updateTime | Date | 更新时间 |
| lastLoginTime | Date | 最后登录时间 |

### operation_logs 集合
存储操作日志。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID |
| openid | string | 微信用户唯一标识 |
| type | string | 操作类型 |
| page | string | 页面标识 |
| action | string | 操作名称 |
| data | object | 附加数据 |
| duration | number | 操作耗时（毫秒） |
| createTime | Date | 创建时间 |
| appVersion | string | 应用版本 |
| platform | string | 平台标识 |
| sessionId | string | 会话 ID |

详细 Schema 请参考 `cloudfunctions/database/database-schema.md`

## 注意事项

- **域名要求**：WebView 必须是已备案的 HTTPS 域名
- **调试模式**：开发者工具中关闭「域名校验」可本地调试
- **云函数配置**：需要在云开发控制台配置环境
- **数据库权限**：云函数默认有最高权限，客户端需通过云函数操作

## 常见问题

### Q: 云函数调用失败？
1. 检查云函数是否已部署
2. 检查环境 ID 是否正确
3. 查看云函数日志排查错误

### Q: H5 收不到登录数据？
1. 检查 URL 参数是否正确传递
2. 检查 H5 SDK 是否正确加载
3. 检查 onReady 回调是否触发

### Q: 操作日志保存失败？
1. 检查登录凭证是否有效
2. 检查云函数是否正常响应
3. 查看浏览器控制台日志

### Q: 如何统计数据？
参考 `cloudfunctions/database/database-schema.md` 中的查询示例。
