# 职场清醒笔记 - 微信小程序

> 将现有 H5 应用嵌入微信小程序，通过小程序登录态桥接实现静默登录。

## 架构

```
用户 → 小程序(index页) → 小程序(login页) 
                                   ↓ wx.login() + wx.getUserProfile()
                                   ↓ 携带登录数据
                              WebView页 → 加载 H5 并传递登录参数
                                            ↓
                                      H5 页面
                                      读取 URL 参数
                                      自动完成登录
```

## 目录结构

```
feleme-miniprogram/
├── app.json / app.js / app.wxss   # 小程序全局配置
├── pages/
│   ├── index/     # 首页（功能介绍 + 引导登录）
│   ├── login/     # 登录页（wx.login + wx.getUserProfile）
│   └── webview/   # WebView（加载 H5，传递登录数据）
├── static/        # tabBar 图标（需自行准备 PNG 图标）
└── README.md
```

## 配置步骤

### 1. 注册小程序
在 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序，获取 AppID

### 2. 修改 project.config.json
将 `appid` 替换为你的小程序 AppID：
```json
"appid": "wx1234567890abcdef"
```

### 3. 修改 H5 部署地址
编辑 `pages/webview/index.js`，将 `H5_BASE` 替换为你的 H5 实际地址：
```js
const H5_BASE = 'https://your-domain.com/';
```

### 4. 准备 tabBar 图标
在 `static/` 目录放入 4 个 PNG 图标（推荐尺寸 81×81）：
- `tab-home.png` / `tab-home-active.png`
- `tab-web.png` / `tab-web-active.png`

### 5. 导入微信开发者工具
1. 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 新建项目 → 选择本目录 → 填入 AppID → 确认
3. 等待编译完成即可预览

### 6. 发布
- 在开发者工具中点击「上传」发布体验版/正式版
- 在微信公众平台后台提交审核

## 登录流程详解

### 小程序端（login/index.js）

```js
// Step 1: 获取登录凭证 code
const { code } = await wx.login()

// Step 2: 获取用户昵称+头像（需用户主动授权）
const { userInfo } = await wx.getUserProfile({ desc: '用于展示' })

// Step 3: 组装数据（注意：code 需发往你的后端换 openid）
const loginData = { code, nickname, avatarUrl, gender, province, city }

// Step 4: 跳转 WebView，URL 携带登录数据
wx.redirectTo({ url: `/pages/webview/index?loginData=${encodeURIComponent(JSON.stringify(loginData))}` })
```

### H5 端（接收参数）

URL 格式：
```
https://your-domain.com/?__mp_login=1&nickname=xxx&avatar=xxx&from=miniprogram
```

H5 读取 `src/auth/miniprogram.ts` 中的 `handleMiniProgramLogin()` 自动完成登录。

## H5 端适配说明

H5 项目（feleme-web）需做以下改造：

1. `src/auth/AuthContext.tsx`：已在初始化时自动读取 URL 参数完成登录
2. `src/pages/ProfilePage.tsx`：已添加「打开小程序登录」按钮提示

## 注意事项

- **域名要求**：WebView 必须是已备案的 HTTPS 域名
- **调试模式**：开发者工具中关闭「域名校验」可本地调试
- **code 安全**：生产环境中 `code` 应发往你的后端服务器换取 `openid`，不应在前端存储
