/**
 * 微信小程序 WebView 桥接 SDK
 *
 * 该 SDK 用于在 H5 页面中与微信小程序 WebView 进行通信，
 * 实现登录态传递、操作日志记录等功能。
 *
 * @version 1.0.0
 * @date 2026-04-01
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.MiniProgramBridge = factory());
})(this, (function () {
  'use strict';

  // 操作类型枚举
  const OPERATION_TYPES = {
    PAGE_VIEW: 'page_view',           // 页面浏览
    BUTTON_CLICK: 'button_click',     // 按钮点击
    FORM_SUBMIT: 'form_submit',       // 表单提交
    API_CALL: 'api_call',             // API 调用
    ERROR: 'error',                   // 错误发生
    CUSTOM: 'custom',                 // 自定义事件
  };

  // 默认配置
  const DEFAULT_CONFIG = {
    debug: false,
    sessionId: '',
    appVersion: '1.0.0',
    autoTrackPageView: true,
    autoTrackClick: false,
    batchSize: 10,
    batchInterval: 3000,
    onLoginSuccess: null,
    onLoginFail: null,
    onReady: null,
  };

  /**
   * 微信小程序 WebView 桥接类
   */
  class MiniProgramBridge {
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.isReady = false;
      this.isMiniProgram = false;
      this.loginData = null;
      this.messageQueue = [];
      this.pendingCallbacks = {};
      this.batchQueue = [];
      this.batchTimer = null;
      this.sessionId = this.config.sessionId || this.generateSessionId();
      this.messageId = 0;

      this.init();
    }

    /**
     * 初始化
     */
    init() {
      // 检测运行环境
      this.isMiniProgram = this.checkMiniProgram();

      if (this.isMiniProgram) {
        this.setupMessageListener();
        this.parseUrlParams();
        this.startBatchTimer();
        this.log('MiniProgramBridge 已初始化');
      } else {
        this.log('运行在非小程序环境');
      }
    }

    /**
     * 检测是否在小程序环境
     */
    checkMiniProgram() {
      const userAgent = navigator.userAgent.toLowerCase();
      const isWx = userAgent.includes('micromessenger');
      const isMiniProgram = isWx && window.__wxjs_environment === 'miniprogram';

      // 额外检查：通过 URL 参数判断
      const urlParams = new URLSearchParams(window.location.search);
      const fromMp = urlParams.get('from') === 'miniprogram';

      return isMiniProgram || fromMp || isWx;
    }

    /**
     * 解析 URL 参数获取登录数据
     */
    parseUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);

      if (urlParams.get('__mp_login') === '1') {
        this.loginData = {
          userId: urlParams.get('userId') || '',
          openid: urlParams.get('openid') || '',
          nickname: urlParams.get('nickname') || '',
          avatar: urlParams.get('avatar') || '',
          gender: parseInt(urlParams.get('gender') || '0', 10),
          province: urlParams.get('province') || '',
          city: urlParams.get('city') || '',
          loginToken: urlParams.get('loginToken') || '',
        };

        // 触发登录成功回调
        if (this.config.onLoginSuccess) {
          this.config.onLoginSuccess(this.loginData);
        }

        this.log('登录数据已解析', this.loginData);
        this.isReady = true;

        // 触发就绪回调
        if (this.config.onReady) {
          this.config.onReady(this.loginData);
        }

        // 处理排队的消息
        this.flushMessageQueue();
      }
    }

    /**
     * 设置消息监听
     */
    setupMessageListener() {
      // 等待微信 JSSDK 加载完成
      if (typeof wx !== 'undefined' && wx.miniProgram) {
        this.bindMessageListener();
      } else {
        // 延迟等待微信 JSSDK 加载
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            if (typeof wx !== 'undefined' && wx.miniProgram) {
              this.bindMessageListener();
            } else {
              // 尝试通过 webview2app 方式监听
              window.addEventListener('message', (event) => {
                this.handleMessage(event.data);
              });
            }
          }, 100);
        });
      }
    }

    /**
     * 绑定消息监听器
     */
    bindMessageListener() {
      // 监听小程序发来的消息
      wx.miniProgram.addEventListener('message', (res) => {
        this.handleMessage(res.data);
      });

      // 监听 webview 的滚动事件
      wx.miniProgram.addEventListener('viewscroll', (res) => {
        this.handleMessage({ type: 'VIEW_SCROLL', data: res.data });
      });
    }

    /**
     * 处理收到的消息
     */
    handleMessage(data) {
      if (!data || !data.type) return;

      this.log('收到小程序消息:', data);

      switch (data.type) {
        case 'MP_READY':
          this.isReady = true;
          // 通知小程序 H5 已就绪
          if (this.loginData) {
            this.postMessage({
              type: 'LOGIN_DATA',
              loginData: this.loginData,
            });
          }
          break;

        case 'LOGIN_DATA':
          this.loginData = data.loginData;
          if (this.config.onLoginSuccess) {
            this.config.onLoginSuccess(data.loginData);
          }
          break;

        case 'USER_INFO':
          if (this.pendingCallbacks['GET_USER_INFO']) {
            this.pendingCallbacks['GET_USER_INFO'](data.userInfo);
            delete this.pendingCallbacks['GET_USER_INFO'];
          }
          break;

        case 'SAVE_OPERATION_LOG_RESULT':
          if (this.pendingCallbacks[data.messageId]) {
            this.pendingCallbacks[data.messageId](data);
            delete this.pendingCallbacks[data.messageId];
          }
          break;

        case 'TOAST':
          // 已被小程序处理
          break;

        case 'NAVIGATE':
          // 已被小程序处理
          break;

        default:
          this.log('未知消息类型:', data.type);
      }
    }

    /**
     * 发送消息到小程序
     */
    postMessage(data, callback) {
      const messageId = ++this.messageId;

      if (callback) {
        this.pendingCallbacks[messageId] = callback;
        data.messageId = messageId;
      }

      if (!this.isMiniProgram) {
        this.log('非小程序环境，消息将被忽略:', data);
        return;
      }

      if (typeof wx !== 'undefined' && wx.miniProgram) {
        wx.miniProgram.postMessage({ data });
      } else {
        // 备用：使用 window.postMessage
        window.postMessage({ data }, window.location.origin);
      }
    }

    /**
     * 发送消息到小程序（Promise 版本）
     */
    postMessageAsync(data) {
      return new Promise((resolve, reject) => {
        this.postMessage(data, (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || '操作失败'));
          }
        });
      });
    }

    /**
     * 清空消息队列
     */
    flushMessageQueue() {
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.postMessage(msg.data, msg.callback);
      }
    }

    /**
     * 保存操作日志
     */
    saveOperationLog(type, page, action, data = {}, extras = {}) {
      const log = {
        type,
        page,
        action,
        data,
        sessionId: this.sessionId,
        appVersion: this.config.appVersion,
        timestamp: Date.now(),
        url: window.location.href,
        ...extras,
      };

      // 添加到批量队列
      this.batchQueue.push(log);

      // 如果达到批量大小，立即发送
      if (this.batchQueue.length >= this.config.batchSize) {
        this.flushBatch();
      }
    }

    /**
     * 页面浏览日志
     */
    trackPageView(page, extras = {}) {
      this.saveOperationLog(
        OPERATION_TYPES.PAGE_VIEW,
        page,
        'view',
        {},
        extras
      );
    }

    /**
     * 按钮点击日志
     */
    trackButtonClick(page, buttonName, extras = {}) {
      this.saveOperationLog(
        OPERATION_TYPES.BUTTON_CLICK,
        page,
        buttonName,
        {},
        extras
      );
    }

    /**
     * 表单提交日志
     */
    trackFormSubmit(page, formId, extras = {}) {
      this.saveOperationLog(
        OPERATION_TYPES.FORM_SUBMIT,
        page,
        formId,
        {},
        extras
      );
    }

    /**
     * API 调用日志
     */
    trackApiCall(page, apiName, duration, extras = {}) {
      this.saveOperationLog(
        OPERATION_TYPES.API_CALL,
        page,
        apiName,
        { duration },
        extras
      );
    }

    /**
     * 错误日志
     */
    trackError(page, error, extras = {}) {
      this.saveOperationLog(
        OPERATION_TYPES.ERROR,
        page,
        'error',
        {
          message: error.message || String(error),
          stack: error.stack || '',
        },
        extras
      );
    }

    /**
     * 自定义事件日志
     */
    trackCustom(page, eventName, data = {}, extras = {}) {
      this.saveOperationLog(
        OPERATION_TYPES.CUSTOM,
        page,
        eventName,
        data,
        extras
      );
    }

    /**
     * 清空批量队列
     */
    flushBatch() {
      if (this.batchQueue.length === 0) return;

      const logs = [...this.batchQueue];
      this.batchQueue = [];

      const messageId = ++this.messageId;

      this.postMessage(
        {
          type: 'SAVE_OPERATION_LOG',
          logs,
          messageId,
        },
        (response) => {
          if (!response.success) {
            // 失败时重新加入队列
            this.batchQueue.unshift(...logs);
            this.log('操作日志保存失败，已重新加入队列');
          } else {
            this.log('批量保存成功:', logs.length);
          }
        }
      );
    }

    /**
     * 启动批量定时器
     */
    startBatchTimer() {
      if (this.batchTimer) return;

      this.batchTimer = setInterval(() => {
        this.flushBatch();
      }, this.config.batchInterval);
    }

    /**
     * 停止批量定时器
     */
    stopBatchTimer() {
      if (this.batchTimer) {
        clearInterval(this.batchTimer);
        this.batchTimer = null;
      }
    }

    /**
     * 获取用户信息
     */
    getUserInfo() {
      if (this.loginData) {
        return Promise.resolve(this.loginData);
      }

      return new Promise((resolve, reject) => {
        this.postMessage(
          { type: 'GET_USER_INFO' },
          (response) => {
            if (response.userInfo) {
              this.loginData = response.userInfo;
              resolve(response.userInfo);
            } else {
              reject(new Error('未登录'));
            }
          }
        );
      });
    }

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
      return !!this.loginData?.loginToken;
    }

    /**
     * 请求重新登录
     */
    requestLogin() {
      this.postMessage({ type: 'H5_REQUEST_LOGIN' });
    }

    /**
     * 显示 Toast
     */
    showToast(message, icon = 'none', duration = 2000) {
      this.postMessage({
        type: 'TOAST',
        message,
        icon,
        duration,
      });
    }

    /**
     * 小程序内部导航
     */
    navigate(url) {
      this.postMessage({
        type: 'NAVIGATE',
        url,
      });
    }

    /**
     * 生成会话 ID
     */
    generateSessionId() {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 日志输出
     */
    log(...args) {
      if (this.config.debug) {
        console.log('[MiniProgramBridge]', ...args);
      }
    }

    /**
     * 自动追踪初始化
     */
    setupAutoTrack() {
      if (this.config.autoTrackPageView) {
        // 追踪页面浏览
        this.trackPageView(window.location.pathname);

        // 监听路由变化（适用于 SPA）
        if (typeof history !== 'undefined' && history.pushState) {
          const originalPushState = history.pushState;
          history.pushState = (...args) => {
            originalPushState.apply(history, args);
            setTimeout(() => {
              this.trackPageView(window.location.pathname);
            }, 100);
          };

          window.addEventListener('popstate', () => {
            this.trackPageView(window.location.pathname);
          });
        }
      }

      if (this.config.autoTrackClick) {
        // 追踪按钮点击
        document.addEventListener('click', (e) => {
          const target = e.target;
          if (
            target.tagName === 'BUTTON' ||
            target.tagName === 'A' ||
            target.classList.contains('clickable')
          ) {
            this.trackButtonClick(
              window.location.pathname,
              target.textContent?.trim() || target.id || 'unknown'
            );
          }
        });
      }

      // 追踪页面错误
      window.addEventListener('error', (e) => {
        this.trackError(window.location.pathname, e.error || e);
      });
    }

    /**
     * 销毁实例
     */
    destroy() {
      this.stopBatchTimer();
      this.flushBatch();
      this.messageQueue = [];
      this.pendingCallbacks = {};
    }
  }

  // 工厂函数
  MiniProgramBridge.create = function (config) {
    return new MiniProgramBridge(config);
  };

  // 导出枚举
  MiniProgramBridge.OPERATION_TYPES = OPERATION_TYPES;

  return MiniProgramBridge;
}));
