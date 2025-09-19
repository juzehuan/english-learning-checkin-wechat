
// 全局应用实例
// 导入API配置
const { API, api } = require('./utils/apiConfig');

App({
  onLaunch: function() {
    // 初始化微信云开发环境
    wx.cloud.init({
      env: 'prod-0g4esjft4f388f06', // 与apiConfig.js中的环境ID保持一致
      traceUser: true
    });
    
    // 检查用户登录状态
    this.checkUserLogin();
  },

  /**
   * 检查用户登录状态
   */
  checkUserLogin: function() {
    const that = this;
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        that.globalData.userInfo = res.data;
        that.globalData.isLoggedIn = true;
        // 不再自动刷新用户信息，避免每次登录都更新
      },
      fail: function() {
        // 用户未登录，设置全局登录状态为false，但不强制跳转登录页面
        // 用户可以先浏览首页内容，需要使用功能时再引导登录
        that.globalData.isLoggedIn = false;
      }
    });
  },

  /**
   * 刷新用户信息
   */
  refreshUserInfo: function() {
    const userInfo = this.globalData.userInfo;
    if (userInfo && userInfo.openid) {
      api.get(API.USER.GET_BY_OPENID + userInfo.openid)
        .then(res => {
          if (res.success && res.user) {
            // 更新全局用户信息
            this.globalData.userInfo = res.user;
            // 保存到本地存储
            wx.setStorage({
              key: 'userInfo',
              data: res.user
            });
          }
        })
        .catch(err => {
          console.error('刷新用户信息失败:', err);
        });
    }
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    friendList: []
  }
});