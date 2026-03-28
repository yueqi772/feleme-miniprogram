import { Component } from 'react';
import { View, Text, Button, Image } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';
import './index.scss';

export default class Index extends Component {
  componentDidMount() {}

  componentDidShow() {
    // 检查是否已有登录态
    const loginData = wx.getStorageSync('feleme_login');
    if (loginData) {
      // 已有登录态，直接跳转网页
      const encoded = encodeURIComponent(JSON.stringify(loginData));
      wx.redirectTo({ url: `/pages/webview/index?loginData=${encoded}` });
    }
  }

  handleStart() {
    wx.redirectTo({ url: '/pages/login/index' });
  }

  render() {
    return (
      <View className="page">
        <View className="hero">
          <View className="logo-ring">
            <Text className="logo-emoji">🌿</Text>
          </View>
          <Text className="title">职场清醒笔记</Text>
          <Text className="subtitle">职场情绪管理与自我认知工具</Text>
        </View>

        <View className="features">
          {[
            { icon: '🧠', title: '精准识别', desc: 'AI 驱动的职场情绪分析' },
            { icon: '🌳', title: '情绪树洞', desc: '安全私密的情绪倾诉空间' },
            { icon: '💬', title: '话术练习', desc: '真实场景对话模拟训练' },
          ].map(f => (
            <View className="feature-item" key={f.title}>
              <Text className="feature-icon">{f.icon}</Text>
              <View className="feature-text">
                <Text className="feature-title">{f.title}</Text>
                <Text className="feature-desc">{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="footer">
          <Button className="btn-primary" onClick={this.handleStart}>
            微信授权登录
          </Button>
          <Text className="agreement">登录即表示同意《用户协议》和《隐私政策》</Text>
        </View>
      </View>
    );
  }
}
