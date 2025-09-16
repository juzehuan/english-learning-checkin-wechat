
// 全局应用实例
// 导入API配置
const { API, api } = require('./utils/apiConfig');

App({
  onLaunch: function() {
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
        // 登录成功后，刷新用户信息
        that.refreshUserInfo();
      },
      fail: function() {
        // 用户未登录，跳转到登录页面
        wx.redirectTo({
          url: '/pages/login/login'
        });
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
    friendList: [],
    backendUrl: 'http://localhost:3000/api'
  }
});