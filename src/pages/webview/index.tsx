import { Component } from 'react';
import { View, WebView } from '@tarojs/components';
import { useDidShow, useRouter } from '@tarojs/taro';
import Taro from '@tarojs/taro';
import './index.scss';

// ⚠️ 发布时请替换为你的实际 H5 域名
const H5_URL = 'https://yueqi772.github.io/feleme-web/';
// 本地开发时使用（需先启动 H5 开发服务器）：
// const H5_URL = 'http://127.0.0.1:5173/';

export default class WebViewPage extends Component {
  state = { src: H5_URL, loaded: false };

  componentDidMount() {
    const router = useRouter();
    const { loginData } = router.params;
    if (loginData) {
      try {
        const data = JSON.parse(decodeURIComponent(loginData));
        const targetUrl = `${H5_URL}?__mp_login=1&nickname=${encodeURIComponent(data.nickname || '')}&avatar=${encodeURIComponent(data.avatarUrl || '')}&gender=${data.gender || 0}&province=${encodeURIComponent(data.province || '')}&city=${encodeURIComponent(data.city || '')}&from=miniprogram`;
        this.setState({ src: targetUrl });
      } catch (e) {
        console.error('解析登录数据失败', e);
      }
    }
  }

  onLoad(e: any) {
    console.log('WebView 加载完成', e);
    this.setState({ loaded: true });
  }

  onError(e: any) {
    console.error('WebView 加载失败', e);
  }

  // 监听 H5 页面通过 postMessage 发来的消息
  onMessage(e: any) {
    const { data } = e.detail;
    console.log('收到 H5 页面消息:', data);
    if (data?.type === 'MP_READY') {
      // H5 页面已准备好，发送登录数据
      const loginData = wx.getStorageSync('feleme_login');
      if (loginData) {
        // 通过 URL 参数方式传递（H5 读取方便）
        // postMessage 已在上面 URL 方式替代，这里仅作备用
        console.log('登录数据已通过 URL 传递');
      }
    }
    if (data?.type === 'H5_REQUEST_LOGIN') {
      // H5 页面请求重新登录
      wx.redirectTo({ url: '/pages/login/index' });
    }
  }

  render() {
    const { src, loaded } = this.state;
    return (
      <View className="webview-container">
        {!loaded && (
          <View className="loading-mask">
            <View className="spinner" />
            <Text className="loading-text">正在加载…</Text>
          </View>
        )}
        <WebView
          src={src}
          onLoad={this.onLoad}
          onError={this.onError}
          onMessage={this.onMessage}
        />
      </View>
    );
  }
}
