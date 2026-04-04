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

  /**
   * 简化版登录：点一下按钮静默登录
   */
  async handleLogin() {
    this.setState({ loading: true, error: '' });

    try {
      // Step 1: 获取微信登录凭证
      console.log('开始登录...');

      const loginRes = await new Promise((resolve, reject) => {
        Taro.login({
          success: resolve,
          fail: reject,
        });
      });

      const { code } = loginRes as any;
      console.log('获取code成功:', code);

      if (!code) {
        this.setState({ loading: false, error: '获取登录凭证失败，请重试' });
        return;
      }

      Taro.showLoading({ title: '登录中…' });

      // Step 2: 调用云函数登录
      console.log('调用云函数...');
      let cloudResult: any;

      try {
        cloudResult = await Taro.cloud.callFunction({
          name: CLOUD_FUNCTION.LOGIN,
          data: { code },
        });
        console.log('云函数调用成功:', cloudResult);
      } catch (cloudErr: any) {
        console.error('云函数调用失败:', cloudErr);
        Taro.hideLoading();

        // 云函数调用失败，使用备用方案
        console.log('使用备用登录方案...');
        await this.fallbackLogin(code);
        return;
      }

      Taro.hideLoading();

      const result = cloudResult.result as any;
      console.log('云函数返回:', result);

      if (!result?.success) {
        this.setState({ loading: false, error: result?.error || '登录失败' });
        return;
      }

      // Step 3: 保存登录结果
      const loginData = result.data;
      Taro.setStorageSync('feleme_login_result', loginData);
      console.log('登录成功，跳转...');

      // Step 4: 跳转
      this.navigateToWebView(loginData);
    } catch (err: any) {
      Taro.hideLoading();
      console.error('登录异常:', err);

      const errMsg = err?.errMsg || err?.message || '';

      if (errMsg.includes('cloud')) {
        // 尝试备用登录
        console.log('云服务出错，尝试备用登录...');
        await this.fallbackLogin(null);
      } else {
        this.setState({ loading: false, error: errMsg || '登录失败，请重试' });
      }
    }
  }

  /**
   * 备用登录方案：不依赖云函数，直接生成临时token
   */
  async fallbackLogin(code: string | null) {
    try {
      console.log('执行备用登录...');

      // 获取 openid（如果可以）
      let openid = '';

      // 创建本地登录数据
      const loginData = {
        userId: 'local_' + Date.now(),
        openid: openid,
        nickname: '微信用户',
        avatarUrl: '',
        gender: 0,
        province: '',
        city: '',
        loginToken: 'local_token_' + Date.now(),
        loginTime: new Date().toISOString(),
        isLocalLogin: true, // 标记为本地登录
      };

      Taro.setStorageSync('feleme_login_result', loginData);
      console.log('备用登录成功，跳转...');

      this.navigateToWebView(loginData);
    } catch (err) {
      console.error('备用登录也失败:', err);
      this.setState({ loading: false, error: '登录失败，请检查网络后重试' });
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
      nickname: loginData.nickname || '微信用户',
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
          <Text className="welcome">一键登录</Text>
        </View>

        <View className="card info-card">
          <Text className="card-title">登录说明</Text>
          <View className="info-row">
            <Text className="info-icon">⚡</Text>
            <Text className="info-text">点击按钮即可完成登录</Text>
          </View>
          <View className="info-row">
            <Text className="info-icon">🔒</Text>
            <Text className="info-text">无需填写任何信息</Text>
          </View>
          <View className="info-row">
            <Text className="info-icon">☁️</Text>
            <Text className="info-text">数据安全存储在微信云端</Text>
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
            {loading ? '登录中…' : '微信一键登录'}
          </Button>
          <Button className="btn-back" onClick={this.goBack}>
            返回
          </Button>
        </View>
      </View>
    );
  }
}
