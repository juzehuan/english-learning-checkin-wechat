// 打卡页面逻辑
// 导入API配置
const { API, api } = require('../../utils/apiConfig');

Page({
  data: {
    isSigned: false,
    todayDate: '',
    consecutiveDays: 0,
    canUseSkipCard: false,
    skipCardCount: 0
  },

  onLoad: function() {
    // 设置今天日期
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    this.setData({
      todayDate: `${year}-${month}-${day}`
    });
    
    this.checkTodaySignin();
    this.fetchUserProgress();
  },

  /**
   * 检查今天是否已打卡
   */
  checkTodaySignin: function() {
    // 检查用户是否登录
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      this.handleNotLoggedIn();
      return;
    }

    // 调用后端API检查今日是否已打卡
    const userId = app.globalData.userInfo.openid;
    const today = this.data.todayDate;
    
    api.get(API.SIGNIN.GET_HISTORY + userId + '/history?date=' + today)
      .then(res => {
        if (res.success && res.signinRecords && res.signinRecords.length > 0) {
          this.setData({
            isSigned: true
          });
        }
      })
      .catch(err => {
        console.error('检查打卡状态失败:', err);
      });
  },

  /**
   * 获取用户进度
   */
  fetchUserProgress: function() {
    // 检查用户是否登录
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      this.handleNotLoggedIn();
      return;
    }

    // 调用后端API获取用户信息
    api.get(API.USER.GET_BY_OPENID + app.globalData.userInfo.openid)
      .then(res => {
        if (res.success && res.user) {
          this.setData({
            consecutiveDays: res.user.consecutiveDays || 0,
            skipCardCount: res.user.skipCards || 0,
            canUseSkipCard: (res.user.skipCards || 0) > 0
          });
        }
      })
      .catch(err => {
        console.error('获取用户进度失败:', err);
      });
  },

  /**
   * 处理用户未登录的情况
   */
  handleNotLoggedIn: function() {
    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });
    // 跳转到登录页面
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }, 1500);
  },

  /**
   * 使用免打卡特权
   */
  useSkipCard: function() {
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      this.handleNotLoggedIn();
      return;
    }
    
    if (!this.data.canUseSkipCard) {
      wx.showToast({
        title: '您没有免打卡卡',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '使用免打卡卡...',
    });
    
    api.post(API.SIGNIN.USE_SKIP_CARD, {
      openid: app.globalData.userInfo.openid
    }).then(res => {
      wx.hideLoading();
      
      if (res.success) {
        // 使用成功
        this.setData({
          isSigned: true,
          skipCardCount: res.user.skipCards || 0,
          canUseSkipCard: (res.user.skipCards || 0) > 0
        });
        
        // 更新全局用户信息
        getApp().globalData.userInfo = res.user;
        
        wx.showToast({
          title: res.message || '已成功使用免打卡卡',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '使用失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    });
  },
  
  /**
   * 执行打卡操作
   */
  doSignin: function() {
    if (this.data.isSigned) {
      wx.showToast({
        title: '今天已经打卡了',
        icon: 'none'
      });
      return;
    }

    // 检查用户是否登录
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      this.handleNotLoggedIn();
      return;
    }

    wx.showLoading({
      title: '打卡中...',
    });

    // 调用后端API进行打卡
    api.post(API.SIGNIN.DAILY_SIGNIN, {
      openid: app.globalData.userInfo.openid
    }).then(res => {
      wx.hideLoading();
      
      if (res.success) {
        // 打卡成功
        this.setData({
          isSigned: true,
          consecutiveDays: res.signinRecord.consecutiveDays || 0
        });
        
        // 更新全局用户信息
        getApp().globalData.userInfo = res.user;
        
        wx.showToast({
          title: res.message || '打卡成功！',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '打卡失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    });
  },

  /**
   * 使用免打卡特权
   */
  useSkipCard: function() {
    if (!this.data.canUseSkipCard) {
      wx.showToast({
        title: '您没有免打卡特权',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认使用免打卡特权',
      content: '使用后可跳过今天的打卡任务，是否确认使用？',
      success: res => {
        if (res.confirm) {
          this.processSkipCard();
        }
      }
    });
  },

  /**
   * 处理免打卡特权使用
   */
  processSkipCard: function() {
    // 检查用户是否登录
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      this.handleNotLoggedIn();
      return;
    }

    wx.showLoading({
      title: '处理中...',
    });

    // 调用后端API使用免打卡特权
    api.post(API.SIGNIN.USE_SKIP_CARD, {
      openid: app.globalData.userInfo.openid
    }).then(res => {
      wx.hideLoading();
      
      if (res.success) {
        // 使用成功
        this.setData({
          isSigned: true,
          skipCardCount: res.user.skipCards || 0,
          canUseSkipCard: (res.user.skipCards || 0) > 0
        });
        
        // 更新全局用户信息
        getApp().globalData.userInfo = res.user;
        
        wx.showToast({
          title: res.message || '已成功使用免打卡特权',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '操作失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
    });
  }
});