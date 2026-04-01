# 微信小程序 WebView 桥接 SDK

该目录包含用于 H5 页面与微信小程序 WebView 通信的 SDK。

## 目录结构

```
web-sdk/
├── miniProgramBridge.js        # 核心桥接 SDK
├── useMiniProgramBridge.js     # React Hook（可选）
└── README.md                   # 本文档
```

## 快速开始

### 1. 基础使用（原生 JS）

```html
<!-- 在 HTML 中引入 SDK -->
<script src="./miniProgramBridge.js"></script>

<script>
  // 初始化桥接
  const bridge = new MiniProgramBridge({
    debug: true,
    onReady: (loginData) => {
      console.log('登录成功:', loginData);
    }
  });

  // 追踪页面浏览
  bridge.trackPageView('/home');

  // 追踪按钮点击
  document.getElementById('btn').addEventListener('click', () => {
    bridge.trackButtonClick('/home', '点击登录');
  });
</script>
```

### 2. React 项目使用

```jsx
import { useMiniProgramBridge } from './useMiniProgramBridge';

function MyPage() {
  const { loginData, trackPageView, trackButtonClick, isMiniProgram } = useMiniProgramBridge();

  useEffect(() => {
    trackPageView('/my-page');
  }, []);

  return (
    <div>
      <h1>我的页面</h1>
      {isMiniProgram && <p>运行在小程序中</p>}
      <button onClick={() => trackButtonClick('/my-page', '提交按钮')}>
        提交
      </button>
    </div>
  );
}
```

### 3. Vue 项目使用

```vue
<template>
  <div>
    <h1>我的页面</h1>
    <button @click="handleClick">提交</button>
  </div>
</template>

<script>
import { onMounted } from 'vue';

export default {
  name: 'MyPage',
  setup() {
    let bridge = null;

    onMounted(async () => {
      const { default: MiniProgramBridge } = await import('./miniProgramBridge');
      bridge = new MiniProgramBridge({
        debug: true,
        onReady: (data) => console.log('登录数据:', data)
      });
      bridge.trackPageView('/my-page');
    });

    const handleClick = () => {
      bridge?.trackButtonClick('/my-page', '提交按钮');
    };

    return { handleClick };
  }
};
</script>
```

## API 文档

### MiniProgramBridge 类

#### 构造函数

```javascript
new MiniProgramBridge(config)
```

**配置项：**

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| debug | boolean | false | 是否输出调试日志 |
| sessionId | string | 自动生成 | 会话 ID |
| appVersion | string | '1.0.0' | 应用版本号 |
| autoTrackPageView | boolean | true | 是否自动追踪页面浏览 |
| autoTrackClick | boolean | false | 是否自动追踪点击 |
| batchSize | number | 10 | 批量发送的日志数量 |
| batchInterval | number | 3000 | 批量发送的时间间隔（毫秒） |
| onLoginSuccess | function | - | 登录成功回调 |
| onLoginFail | function | - | 登录失败回调 |
| onReady | function | - | 桥接就绪回调 |

#### 方法

##### trackPageView(page, extras)
追踪页面浏览。

```javascript
bridge.trackPageView('/home');
bridge.trackPageView('/product/123', { productName: '商品A' });
```

##### trackButtonClick(page, buttonName, extras)
追踪按钮点击。

```javascript
bridge.trackButtonClick('/home', '点击登录');
```

##### trackFormSubmit(page, formId, extras)
追踪表单提交。

```javascript
bridge.trackFormSubmit('/register', 'form-001', { fields: 5 });
```

##### trackApiCall(page, apiName, duration, extras)
追踪 API 调用。

```javascript
bridge.trackApiCall('/home', 'getUserInfo', 120, { success: true });
```

##### trackError(page, error, extras)
追踪错误。

```javascript
bridge.trackError('/home', new Error('加载失败'));
```

##### trackCustom(page, eventName, data, extras)
追踪自定义事件。

```javascript
bridge.trackCustom('/game', 'levelComplete', { level: 5, score: 1000 });
```

##### saveOperationLog(type, page, action, data, extras)
保存操作日志（底层方法）。

```javascript
bridge.saveOperationLog('page_view', '/home', 'view');
```

##### getUserInfo()
获取用户信息（Promise）。

```javascript
const userInfo = await bridge.getUserInfo();
console.log(userInfo.nickname);
```

##### isLoggedIn()
检查是否已登录。

```javascript
if (bridge.isLoggedIn()) {
  console.log('已登录');
}
```

##### requestLogin()
请求重新登录（跳转回小程序登录页）。

```javascript
bridge.requestLogin();
```

##### showToast(message, icon, duration)
显示 Toast。

```javascript
bridge.showToast('操作成功', 'success', 2000);
```

##### navigate(url)
小程序内部导航。

```javascript
bridge.navigate('/pages/profile/index');
```

##### setupAutoTrack()
设置自动追踪（页面浏览和错误）。

```javascript
bridge.setupAutoTrack();
```

##### destroy()
销毁实例，清理定时器。

```javascript
bridge.destroy();
```

#### 属性

##### isReady
桥接是否就绪。

```javascript
if (bridge.isReady) {
  // 可以开始追踪
}
```

##### isMiniProgram
是否运行在小程序中。

```javascript
if (bridge.isMiniProgram) {
  // 运行在小程序 WebView 中
}
```

##### loginData
登录数据。

```javascript
console.log(bridge.loginData);
// {
//   userId: 'xxx',
//   openid: 'xxx',
//   nickname: '用户昵称',
//   avatar: '头像URL',
//   loginToken: 'xxx'
// }
```

## 操作类型枚举

```javascript
import { OPERATION_TYPES } from 'miniProgramBridge';

// 使用
bridge.saveOperationLog(OPERATION_TYPES.PAGE_VIEW, '/home', 'view');
```

| 类型 | 说明 |
|------|------|
| PAGE_VIEW | 页面浏览 |
| BUTTON_CLICK | 按钮点击 |
| FORM_SUBMIT | 表单提交 |
| API_CALL | API 调用 |
| ERROR | 错误发生 |
| CUSTOM | 自定义事件 |

## 消息类型

H5 与小程序之间通过以下消息类型通信：

| 消息类型 | 方向 | 说明 |
|----------|------|------|
| MP_READY | 小程序→H5 | 小程序已准备就绪 |
| LOGIN_DATA | 双向 | 登录数据 |
| SAVE_OPERATION_LOG | H5→小程序 | 保存操作日志 |
| SAVE_OPERATION_LOG_RESULT | 小程序→H5 | 保存结果 |
| GET_USER_INFO | H5→小程序 | 获取用户信息 |
| USER_INFO | 小程序→H5 | 用户信息 |
| H5_REQUEST_LOGIN | H5→小程序 | 请求重新登录 |
| TOAST | H5→小程序 | 显示提示 |
| NAVIGATE | H5→小程序 | 内部导航 |

## 批量日志

SDK 默认会批量发送日志以减少网络请求：

- 达到 `batchSize`（默认10条）时自动发送
- 每隔 `batchInterval`（默认3秒）检查并发送
- 页面卸载时自动发送剩余日志

## 注意事项

1. **跨域限制**：postMessage 只能在同源环境下使用
2. **异步处理**：某些方法返回 Promise，请注意异步处理
3. **错误处理**：建议在外层添加 try-catch
4. **调试模式**：生产环境请关闭 `debug` 选项
5. **自动追踪**：建议在 onReady 回调后再开始追踪

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- iOS Safari 11+
- Android Chrome 60+

## License

MIT
