// 登录页面逻辑
// 导入API配置
const { API, api } = require('../../utils/apiConfig');

Page({
  data: {
  },

  onLoad: function() {
    // 现在只使用getUserProfile方法登录
  },

  /**
   * 获取用户信息并登录
   */
  getUserProfile: function() {
    const that = this;

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        wx.showLoading({
          title: '登录中...',
        });

        // 调用后端API进行登录，传递用户信息数据
        const userInfo = res.userInfo;
        
        // 发送微信openid和用户信息到后端
        // 注意：在实际环境中，这里应该先通过微信登录获取openid，然后再发送到后端
        // 简化处理，假设userInfo中包含openid
        api.post(API.USER.CREATE_OR_UPDATE, {
          openid: 'temp_openid_' + Date.now(), // 临时模拟openid，实际环境需要从wx.login获取
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          totalPoints: 0,
          consecutiveDays: 0,
          skipCards: 0,
          skipQuizCards: 0
        }).then(result => {
          if (result.success && result.user) {
            // 保存用户信息到本地
            wx.setStorage({
              key: 'userInfo',
              data: result.user,
              success: () => {
                // 更新全局用户信息
                getApp().globalData.userInfo = result.user;
                getApp().globalData.isLoggedIn = true;
                wx.hideLoading();
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }
            });
          } else {
            wx.hideLoading();
            wx.showToast({
              title: result.message || '登录失败',
              icon: 'none'
            });
          }
        }).catch(err => {
          wx.hideLoading();
          
          // 显示具体的错误信息
          let errorMessage = '登录失败，请重试';
          if (err && err.message) {
            errorMessage = err.message;
          }

          wx.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 5000 // 延长显示时间，让用户有足够时间阅读错误信息
          });
        });
      },
      fail: () => {
        wx.showToast({
          title: '请授权登录以使用小程序',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 查看用户协议
   */
  viewUserAgreement: function() {
    wx.navigateTo({
      url: '/pages/agreement/user'
    });
  },

  /**
   * 查看隐私政策
   */
  viewPrivacyPolicy: function() {
    wx.navigateTo({
      url: '/pages/agreement/privacy'
    });
  }
});