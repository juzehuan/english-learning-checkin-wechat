// 登录页面逻辑
// 导入API配置
const { API, api } = require('../../utils/apiConfig');

Page({
  data: {
    isAgreed: false, // 协议同意状态
    showModal: false, // 弹窗显示状态
    modalTitle: '', // 弹窗标题
    modalType: '' // 弹窗类型：'user'表示用户协议，'privacy'表示隐私政策
  },

  onLoad: function() {
    // 现在只使用getUserProfile方法登录
  },

  /**
   * 切换协议同意状态
   */
  toggleAgreement: function() {
    this.setData({
      isAgreed: !this.data.isAgreed
    });
  },

  /**
   * 获取用户信息并登录
   */
  getUserProfile: function() {
    // 检查是否同意协议
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先阅读并同意用户协议和隐私政策',
        icon: 'none'
      });
      return;
    }
    const that = this;

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        wx.showLoading({
          title: '登录中...',
        });

        // 1. 获取用户基本信息
        const userInfo = res.userInfo;

        // 2. 调用微信登录获取code，用于交换openid
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              // 3. 发送code到后端，由后端向微信服务器换取openid
              api.post(API.USER.WX_LOGIN, {
                code: loginRes.code,
                userInfo: userInfo
              }).then(loginResult => {
                if (loginResult.success && loginResult.openid) {
                  // 4. 先尝试通过openid查询用户是否已存在
                  api.get(API.USER.GET_BY_OPENID + loginResult.openid)
                    .then(userResult => {
                      if (userResult.success && userResult.user) {
                        // 用户已存在，直接使用现有用户信息
                        return Promise.resolve({ success: true, user: userResult.user });
                      } else {
                        // 用户不存在，创建新用户
                        return api.post(API.USER.CREATE_OR_UPDATE, {
                          openid: loginResult.openid,
                          nickname: userInfo.nickName,
                          avatarUrl: userInfo.avatarUrl,
                          totalPoints: 0,
                          consecutiveDays: 0,
                          skipCards: 0,
                          skipQuizCards: 0
                        });
                      }
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
                } else {
                  wx.hideLoading();
                  wx.showToast({
                    title: loginResult.message || '获取openid失败',
                    icon: 'none'
                  });
                }
              }).catch(err => {
                console.log("🚀 ~ err:", err)
                wx.hideLoading();
                wx.showToast({
                  title: '微信登录失败，请重试',
                  icon: 'none'
                });
              });
            } else {
              wx.hideLoading();
              wx.showToast({
                title: '获取登录code失败',
                icon: 'none'
              });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({
              title: '微信登录失败，请重试',
              icon: 'none'
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
   * 查看用户协议（弹窗形式）
   */
  viewUserAgreement: function() {
    this.setData({
      showModal: true,
      modalTitle: '用户协议',
      modalType: 'user'
    });
  },

  /**
   * 查看隐私政策（弹窗形式）
   */
  viewPrivacyPolicy: function() {
    this.setData({
      showModal: true,
      modalTitle: '隐私政策',
      modalType: 'privacy'
    });
  },

  /**
   * 关闭协议弹窗
   */
  closeModal: function() {
    this.setData({
      showModal: false
    });
  }
});