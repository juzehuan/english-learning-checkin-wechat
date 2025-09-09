// 登录页面逻辑
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

        // 调用云函数进行登录，传递完整的用户信息数据
        wx.cloud.callFunction({
          name: 'login',
          data: {
            userInfo: res.userInfo,
            encryptedData: res.encryptedData,
            iv: res.iv,
            signature: res.signature,
            rawData: res.rawData,
            cloudID: res.cloudID
          },
          success: res => {
            const { openid, user } = res.result;

            // 检查是否成功获取openid和用户信息
            if (!openid || !user) {
              wx.hideLoading();
              wx.showToast({
                title: '登录失败：无法获取完整用户信息',
                icon: 'none'
              });
              return;
            }

            // 保存用户信息到本地
            wx.setStorage({
              key: 'userInfo',
              data: user,
              success: () => {
                // 更新全局用户信息
                getApp().globalData.userInfo = user;
                getApp().globalData.isLoggedIn = true;
                wx.hideLoading();
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }
            });
          },
          fail: err => {
            wx.hideLoading();

            // 显示具体的错误信息
            let errorMessage = '登录失败，请重试';
            if (err && err.result && err.result.message) {
              errorMessage = err.result.message;
            } else if (err && err.errMsg) {
              errorMessage = err.errMsg;
            }

            wx.showToast({
              title: errorMessage,
              icon: 'none',
              duration: 5000 // 延长显示时间，让用户有足够时间阅读错误信息
            });
          }
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