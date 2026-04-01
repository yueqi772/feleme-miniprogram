import { Component } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

// 云函数配置
const CLOUD_FUNCTION = {
  LOGIN: 'login', // 登录云函数名称
};

export default class Login extends Component {
  state = { loading: false, error: '' };

  componentDidMount() {
    // 检查是否已登录
    const loginResult = Taro.getStorageSync('feleme_login_result');
    if (loginResult && loginResult.loginToken) {
      // 已登录，直接跳转
      this.navigateToWebView(loginResult);
    }
  }

  async handleLogin() {
    this.setState({ loading: true, error: '' });

    try {
      // Step 1: 获取微信登录凭证（code）
      const loginRes = await new Promise((resolve, reject) => {
        Taro.login({
          success: resolve,
          fail: reject,
        });
      });
      const { code } = loginRes as any;

      if (!code) {
        this.setState({ loading: false, error: '获取登录凭证失败，请重试' });
        return;
      }

      // Step 2: 获取用户基本信息（昵称、头像）
      const profileRes = await new Promise((resolve, reject) => {
        Taro.getUserProfile({
          desc: '用于展示您的个人信息',
          success: resolve,
          fail: reject,
        });
      });
      const userInfo = (profileRes as any).userInfo;

      // Step 3: 调用云函数登录
      Taro.showLoading({ title: '登录中…' });

      const cloudResult = await Taro.cloud.callFunction({
        name: CLOUD_FUNCTION.LOGIN,
        data: {
          code,
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          gender: userInfo.gender,
          province: userInfo.province,
          city: userInfo.city,
        },
      });

      Taro.hideLoading();

      const result = cloudResult.result as any;

      if (!result.success) {
        this.setState({ loading: false, error: result.error || '登录失败' });
        return;
      }

      // Step 4: 保存登录结果
      const loginData = result.data;
      Taro.setStorageSync('feleme_login_result', loginData);

      // Step 5: 跳转 WebView 页面
      this.navigateToWebView(loginData);
    } catch (err: any) {
      Taro.hideLoading();
      console.error('登录失败', err);

      // 判断错误类型
      const errMsg = err?.errMsg || err?.message || '';

      if (errMsg.includes('auth deny') || errMsg.includes('cancel') || errMsg.includes('authorize')) {
        this.setState({ loading: false, error: '您已拒绝授权，可重新点击登录' });
      } else if (errMsg.includes('cloud')) {
        this.setState({ loading: false, error: '云服务连接失败，请检查网络' });
      } else {
        this.setState({ loading: false, error: errMsg || '登录失败，请重试' });
      }
    }
  }

  /**
   * 跳转到 WebView 页面
   */
  navigateToWebView(loginData: any) {
    const params = new URLSearchParams({
      __mp_login: '1',
      userId: loginData.userId || '',
      openid: loginData.openid || '',
      nickname: loginData.nickname || '',
      avatar: loginData.avatarUrl || '',
      gender: String(loginData.gender || 0),
      province: loginData.province || '',
      city: loginData.city || '',
      loginToken: loginData.loginToken || '',
      from: 'miniprogram',
      _t: String(Date.now()),
    });

    Taro.redirectTo({
      url: `/pages/webview/index?${params.toString()}`,
    });
  }

  goBack() {
    Taro.navigateBack();
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
            <Text className="info-icon">☁️</Text>
            <Text className="info-text">数据安全存储在微信云端</Text>
          </View>
          <View className="info-row">
            <Text className="info-icon">📴</Text>
            <Text className="info-text">不会获取手机号、位置等敏感信息</Text>
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
          <Button className="btn-back" onClick={this.goBack}>
            返回
          </Button>
        </View>
      </View>
    );
  }
}
