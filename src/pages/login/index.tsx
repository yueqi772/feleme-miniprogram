import { Component } from 'react';
import { View, Text, Button, Image } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import './index.scss';

export default class Login extends Component {
  state = { loading: false, error: '' };

  async handleLogin() {
    this.setState({ loading: true, error: '' });

    try {
      // Step 1: 获取微信登录凭证（code）
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      const { code } = loginRes as any;

      if (!code) {
        this.setState({ loading: false, error: '获取登录凭证失败，请重试' });
        return;
      }

      // Step 2: 获取用户基本信息（昵称、头像）
      const profileRes = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于展示您的个人信息',
          success: resolve,
          fail: reject,
        });
      });
      const userInfo = (profileRes as any).userInfo;

      // Step 3: 构建登录数据（实际生产中 code 应发往你的后端换 openid）
      const loginData = {
        code,
        nickname: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        gender: userInfo.gender, // 1=男, 2=女
        province: userInfo.province,
        city: userInfo.city,
        loginTime: Date.now(),
      };

      // Step 4: 存储登录态
      wx.setStorageSync('feleme_login', loginData);

      // Step 5: 跳转 WebView 页面，携带登录数据
      const encoded = encodeURIComponent(JSON.stringify(loginData));
      wx.redirectTo({
        url: `/pages/webview/index?loginData=${encoded}&from=miniprogram`,
      });
    } catch (err: any) {
      console.error('登录失败', err);
      const msg = err?.errMsg || '';
      if (msg.includes('auth deny') || msg.includes('cancel')) {
        this.setState({ loading: false, error: '您已拒绝授权，可重新点击登录' });
      } else {
        this.setState({ loading: false, error: err?.errMsg || '登录失败，请重试' });
      }
    }
  }

  render() {
    const { loading, error } = this.state;
    return (
      <View className="page">
        <View className="header">
          <View className="logo-ring large">
            <Text className="logo-emoji">🌿</Text>
          </View>
          <Text className="app-name">职场清醒笔记</Text>
          <Text className="welcome">欢迎使用</Text>
        </View>

        <View className="card info-card">
          <Text className="card-title">登录说明</Text>
          <View className="info-row">
            <Text className="info-icon">🔒</Text>
            <Text className="info-text">我们仅获取您的昵称和头像</Text>
          </View>
          <View className="info-row">
            <Text className="info-icon">🚫</Text>
            <Text className="info-text">不会获取手机号、位置等敏感信息</Text>
          </View>
          <View className="info-row">
            <Text className="info-icon">📴</Text>
            <Text className="info-text">数据仅存储在本地和您的账号下</Text>
          </View>
        </View>

        {error && (
          <View className="error-tip">
            <Text className="error-text">{error}</Text>
          </View>
        )}

        <View className="footer">
          <Button
            className="btn-wechat"
            loading={loading}
            onClick={this.handleLogin}
          >
            {loading ? '登录中…' : '微信授权登录'}
          </Button>
          <Button className="btn-back" onClick={() => wx.navigateBack()}>
            返回
          </Button>
        </View>
      </View>
    );
  }
}
