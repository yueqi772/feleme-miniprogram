/**
 * React Hook - 微信小程序 WebView 桥接
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// 默认配置
const defaultConfig = {
  debug: false,
  autoTrack: true,
};

/**
 * 使用微信小程序桥接的 Hook
 *
 * @param {Object} config - 配置项
 * @returns {Object} 桥接状态和方法
 */
export function useMiniProgramBridge(config = {}) {
  const bridgeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isMiniProgram, setIsMiniProgram] = useState(false);
  const [loginData, setLoginData] = useState(null);
  const [error, setError] = useState(null);

  const mergedConfig = { ...defaultConfig, ...config };

  // 初始化桥接
  useEffect(() => {
    // 动态导入桥接 SDK
    import('./miniProgramBridge').then(({ default: MiniProgramBridge }) => {
      const bridge = new MiniProgramBridge({
        debug: mergedConfig.debug,
        onReady: (data) => {
          setIsReady(true);
          setLoginData(data);
        },
        onLoginSuccess: (data) => {
          setLoginData(data);
        },
        onLoginFail: (err) => {
          setError(err);
        },
      });

      bridgeRef.current = bridge;
      setIsMiniProgram(bridge.isMiniProgram);

      // 设置自动追踪
      if (mergedConfig.autoTrack) {
        bridge.setupAutoTrack();
      }

      // 清理函数
      return () => {
        bridge.destroy();
      };
    }).catch((err) => {
      console.error('加载桥接 SDK 失败:', err);
      setError(err);
    });
  }, [mergedConfig.debug, mergedConfig.autoTrack]);

  /**
   * 追踪页面浏览
   */
  const trackPageView = useCallback((page, extras = {}) => {
    bridgeRef.current?.trackPageView(page, extras);
  }, []);

  /**
   * 追踪按钮点击
   */
  const trackButtonClick = useCallback((page, buttonName, extras = {}) => {
    bridgeRef.current?.trackButtonClick(page, buttonName, extras);
  }, []);

  /**
   * 追踪表单提交
   */
  const trackFormSubmit = useCallback((page, formId, extras = {}) => {
    bridgeRef.current?.trackFormSubmit(page, formId, extras);
  }, []);

  /**
   * 追踪 API 调用
   */
  const trackApiCall = useCallback((page, apiName, duration, extras = {}) => {
    bridgeRef.current?.trackApiCall(page, apiName, duration, extras);
  }, []);

  /**
   * 追踪错误
   */
  const trackError = useCallback((page, error, extras = {}) => {
    bridgeRef.current?.trackError(page, error, extras);
  }, []);

  /**
   * 追踪自定义事件
   */
  const trackCustom = useCallback((page, eventName, data = {}, extras = {}) => {
    bridgeRef.current?.trackCustom(page, eventName, data, extras);
  }, []);

  /**
   * 保存操作日志
   */
  const saveOperationLog = useCallback((type, page, action, data = {}, extras = {}) => {
    bridgeRef.current?.saveOperationLog(type, page, action, data, extras);
  }, []);

  /**
   * 获取用户信息
   */
  const getUserInfo = useCallback(async () => {
    if (bridgeRef.current?.loginData) {
      return bridgeRef.current.loginData;
    }
    return bridgeRef.current?.getUserInfo();
  }, []);

  /**
   * 检查是否已登录
   */
  const isLoggedIn = useCallback(() => {
    return bridgeRef.current?.isLoggedIn() ?? false;
  }, []);

  /**
   * 请求重新登录
   */
  const requestLogin = useCallback(() => {
    bridgeRef.current?.requestLogin();
  }, []);

  /**
   * 显示 Toast
   */
  const showToast = useCallback((message, icon = 'none', duration = 2000) => {
    bridgeRef.current?.showToast(message, icon, duration);
  }, []);

  /**
   * 小程序内部导航
   */
  const navigate = useCallback((url) => {
    bridgeRef.current?.navigate(url);
  }, []);

  return {
    // 状态
    isReady,
    isMiniProgram,
    loginData,
    error,

    // 追踪方法
    trackPageView,
    trackButtonClick,
    trackFormSubmit,
    trackApiCall,
    trackError,
    trackCustom,
    saveOperationLog,

    // 用户方法
    getUserInfo,
    isLoggedIn,
    requestLogin,

    // UI 方法
    showToast,
    navigate,

    // 原始桥接实例
    bridge: bridgeRef.current,
  };
}

/**
 * 追踪 Hook 的辅助 Hook
 * 用于自动追踪页面浏览
 */
export function usePageTracking(pageName, dependencies = []) {
  const { trackPageView, trackError } = useMiniProgramBridge();

  useEffect(() => {
    // 追踪页面浏览
    trackPageView(pageName);

    // 监听错误
    const handleError = (event) => {
      trackError(pageName, event.error || event);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, dependencies);
}

/**
 * 追踪按钮点击的 Hook
 */
export function useButtonTracking(pageName, buttonName) {
  const { trackButtonClick } = useMiniProgramBridge();

  return useCallback(() => {
    trackButtonClick(pageName, buttonName);
  }, [pageName, buttonName, trackButtonClick]);
}

/**
 * 追踪表单提交的 Hook
 */
export function useFormTracking(pageName, formId) {
  const { trackFormSubmit } = useMiniProgramBridge();

  const handleSubmit = useCallback(
    (formData) => {
      trackFormSubmit(pageName, formId, { formData });
      return formData;
    },
    [pageName, formId, trackFormSubmit]
  );

  return { handleSubmit };
}

/**
 * 追踪 API 调用的 Hook
 */
export function useApiTracking(pageName, apiName) {
  const { trackApiCall } = useMiniProgramBridge();

  const wrapApi = useCallback(
    async (apiFunc) => {
      const startTime = Date.now();
      try {
        const result = await apiFunc();
        const duration = Date.now() - startTime;
        trackApiCall(pageName, apiName, duration, { success: true });
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        trackApiCall(pageName, apiName, duration, { success: false, error: error.message });
        throw error;
      }
    },
    [pageName, apiName, trackApiCall]
  );

  return { wrapApi };
}
