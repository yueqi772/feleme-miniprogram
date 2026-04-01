import { Component } from 'react';
import { View, WebView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

// H5 部署地址
const H5_URL = 'https://yueqi772.github.io/feleme-web/';

// 云函数配置
const CLOUD_FUNCTION = {
  SAVE_OPERATION_LOG: 'saveOperationLog',
};

// 操作类型枚举
const OPERATION_TYPES = {
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  FORM_SUBMIT: 'form_submit',
  API_CALL: 'api_call',
  ERROR: 'error',
  CUSTOM: 'custom',
};

export default class WebViewPage extends Component {
  state = {
    src: H5_URL,
    loaded: false,
    loginData: null as any,
  };

  componentDidMount() {
    // 从页面参数获取登录数据
    const loginResult = Taro.getStorageSync('feleme_login_result');

    // 从 URL 参数解析（如果存在）
    const params = Taro.getCurrentInstance()?.router?.params;

    if (params) {
      const {
        __mp_login,
        userId,
        openid,
        nickname,
        avatar,
        gender,
        province,
        city,
        loginToken,
      } = params;

      if (__mp_login === '1' && loginToken) {
        // 优先使用 URL 参数
        const loginData = {
          userId,
          openid,
          nickname: decodeURIComponent(nickname || ''),
          avatarUrl: decodeURIComponent(avatar || ''),
          gender: parseInt(gender || '0', 10),
          province: decodeURIComponent(province || ''),
          city: decodeURIComponent(city || ''),
          loginToken,
        };

        this.setState({ loginData });

        // 构建目标 URL
        const targetUrl = this.buildWebViewUrl(loginData);
        this.setState({ src: targetUrl });
      } else if (loginResult?.loginToken) {
        // 备用：使用本地存储
        this.setState({ loginData: loginResult });
        const targetUrl = this.buildWebViewUrl(loginResult);
        this.setState({ src: targetUrl });
      }
    } else if (loginResult?.loginToken) {
      // 直接使用本地存储
      this.setState({ loginData: loginResult });
      const targetUrl = this.buildWebViewUrl(loginResult);
      this.setState({ src: targetUrl });
    }
  }

  /**
   * 构建 WebView URL
   */
  buildWebViewUrl(loginData: any) {
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

    return `${H5_URL}?${params.toString()}`;
  }

  /**
   * WebView 加载完成
   */
  onLoad(e: any) {
    console.log('WebView 加载完成', e);
    this.setState({ loaded: true });

    // 通知 H5 页面小程序已准备就绪
    Taro.miniProgram.postMessage({
      data: {
        type: 'MP_READY',
        loaded: true,
        loginData: this.state.loginData,
      },
    });
  }

  /**
   * WebView 加载错误
   */
  onError(e: any) {
    console.error('WebView 加载失败', e);
    this.setState({ loaded: true });
    Taro.showToast({ title: '页面加载失败', icon: 'none' });
  }

  /**
   * 监听 H5 页面通过 postMessage 发来的消息
   */
  onMessage(e: any) {
    const { data } = e.detail || {};
    console.log('收到 H5 页面消息:', data);

    if (!data) return;

    switch (data.type) {
      case 'MP_READY':
        // H5 页面已准备好，发送登录数据
        if (this.state.loginData) {
          Taro.miniProgram.postMessage({
            data: {
              type: 'LOGIN_DATA',
              loginData: this.state.loginData,
            },
          });
        }
        break;

      case 'H5_REQUEST_LOGIN':
        // H5 页面请求重新登录
        Taro.redirectTo({ url: '/pages/login/index' });
        break;

      case 'SAVE_OPERATION_LOG':
        // H5 页面请求保存操作日志
        this.handleSaveOperationLog(data.logs);
        break;

      case 'GET_USER_INFO':
        // H5 页面请求获取用户信息
        Taro.miniProgram.postMessage({
          data: {
            type: 'USER_INFO',
            userInfo: this.state.loginData,
          },
        });
        break;

      case 'TOAST':
        // 显示 Toast
        Taro.showToast({
          title: data.message || '',
          icon: data.icon || 'none',
          duration: data.duration || 2000,
        });
        break;

      case 'NAVIGATE':
        // 小程序内部导航
        if (data.url) {
          Taro.navigateTo({ url: data.url });
        }
        break;

      default:
        console.log('未处理的消息类型:', data.type);
    }
  }

  /**
   * 保存操作日志到云数据库
   */
  async handleSaveOperationLog(logs: any) {
    if (!this.state.loginData?.loginToken) {
      console.error('未登录，无法保存操作日志');
      Taro.miniProgram.postMessage({
        data: {
          type: 'SAVE_OPERATION_LOG_RESULT',
          success: false,
          error: '未登录',
        },
      });
      return;
    }

    try {
      const result = await Taro.cloud.callFunction({
        name: CLOUD_FUNCTION.SAVE_OPERATION_LOG,
        data: {
          token: this.state.loginData.loginToken,
          logs,
        },
      });

      const res = result.result as any;

      Taro.miniProgram.postMessage({
        data: {
          type: 'SAVE_OPERATION_LOG_RESULT',
          success: res.success,
          data: res.data,
          error: res.error,
        },
      });
    } catch (error: any) {
      console.error('保存操作日志失败:', error);
      Taro.miniProgram.postMessage({
        data: {
          type: 'SAVE_OPERATION_LOG_RESULT',
          success: false,
          error: error.message || '保存失败',
        },
      });
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

// 导出操作类型供外部使用
export { OPERATION_TYPES };
