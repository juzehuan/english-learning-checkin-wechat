
// 全局应用实例
App({
  onLaunch: function() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV, // 使用当前环境
        traceUser: true
      });
    }

    // 检查用户是否登录
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
      },
      fail: function() {
        // 用户未登录，跳转到登录页面
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    });
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    friendList: []
  }
});