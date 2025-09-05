// 登录页面逻辑
Page({
  data: {
    canIUseGetUserProfile: false
  },

  onLoad: function() {
    // 检查是否支持 getUserProfile 接口
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      });
    }
  },

  /**
   * 微信登录
   */
  login: function() {
    wx.showLoading({
      title: '登录中...',
    });

    // 调用云函数进行登录
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        console.log("🚀 ~ res:", res)
        const { openid } = res.result;
        
        // 检查是否成功获取openid
        if (!openid) {
          wx.hideLoading();
          wx.showToast({
            title: '登录失败：无法获取用户身份信息',
            icon: 'none'
          });
          console.error('[云函数] [login] 未返回openid:', res);
          return;
        }
        
        // 使用 openid 查询或创建用户
        this.checkUserExists(openid);
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
              duration: 3000
            });
            console.error('[云函数] [login] 调用失败：', err);
          }
    });
  },

  /**
   * 获取用户信息并登录
   */
  getUserProfile: function() {
    const that = this;

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log("🚀 ~ res:", res)
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
            console.log("🚀 ~ res:", res)
            const { openid, user } = res.result;
            
            // 检查是否成功获取openid和用户信息
            if (!openid || !user) {
              wx.hideLoading();
              wx.showToast({
                title: '登录失败：无法获取完整用户信息',
                icon: 'none'
              });
              console.error('[云函数] [login] 未返回完整的用户信息:', res);
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
            console.error('[云函数] [login] 调用失败：', err);
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
   * 检查用户是否存在
   */
  checkUserExists: function(openid) {
    const db = wx.cloud.database();

    db.collection('users').where({
      openid: openid
    }).get({
      success: res => {
        if (res.data && res.data.length > 0) {
          // 用户已存在，获取用户信息
          const user = res.data[0];
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
        } else {
          // 用户不存在，引导用户授权获取信息并创建用户
          wx.hideLoading();
          wx.showModal({
            title: '提示',
            content: '请授权获取用户信息以创建账号',
            showCancel: false,
            success: () => {
              // 降级到 getUserProfile 方式
              this.getUserProfile();
            }
          });
        }
      },
      fail: err => {
          wx.hideLoading();
          
          // 显示具体的错误信息
          let errorMessage = '登录失败，请重试';
          if (err && err.errMsg) {
            errorMessage = err.errMsg;
            // 特殊错误码处理
            if (err.errCode === -502005) {
              errorMessage = '用户集合不存在，请联系管理员';
            } else if (err.errCode === -501001 || err.errCode === -501007) {
              errorMessage = '数据库权限不足，请联系管理员';
            }
          }
          
          wx.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 3000
          });
          console.error('[数据库] [查询用户] 失败：', err);
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