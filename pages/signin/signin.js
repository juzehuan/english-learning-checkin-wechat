// 打卡页面逻辑
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
    if (!app.globalData.userInfo) {
      this.handleNotLoggedIn();
      return;
    }

    const db = wx.cloud.database();
    const _ = db.command;
    const userId = app.globalData.userInfo._id;
    const today = new Date(this.data.todayDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    db.collection('signins').where({
      userId: userId,
      date: _.gte(today).and(_.lt(tomorrow))
    }).get({
      success: res => {
        if (res.data && res.data.length > 0) {
          this.setData({
            isSigned: true
          });
        }
      },
      fail: err => {
      }
    });
  },

  /**
   * 获取用户进度
   */
  fetchUserProgress: function() {
    // 检查用户是否登录
    const app = getApp();
    if (!app.globalData.userInfo) {
      this.handleNotLoggedIn();
      return;
    }

    const db = wx.cloud.database();
    db.collection('users').doc(app.globalData.userInfo._id).get({
      success: res => {
        this.setData({
          consecutiveDays: res.data.progress?.consecutiveDays || 0,
          skipCardCount: res.data.skipCardCount || 0,
          canUseSkipCard: (res.data.skipCardCount || 0) > 0
        });
      },
      fail: err => {
      }
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
    if (!app.globalData.userInfo) {
      this.handleNotLoggedIn();
      return;
    }

    wx.showLoading({
      title: '打卡中...',
    });

    const db = wx.cloud.database();
    const userId = app.globalData.userInfo._id;

    // 调用云函数进行打卡
    wx.cloud.callFunction({
      name: 'doSignin',
      data: {
        userId: userId,
        date: new Date()
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          this.setData({
            isSigned: true,
            consecutiveDays: res.result.consecutiveDays
          });
          wx.showToast({
            title: '打卡成功！+1分',
            icon: 'success'
          });
          // 更新全局用户信息
          getApp().globalData.userInfo.score = res.result.newScore;
          getApp().globalData.userInfo.progress = res.result.progress;
        } else {
          wx.showToast({
            title: res.result.message || '打卡失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '打卡失败',
          icon: 'none'
        });
      }
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
    if (!app.globalData.userInfo) {
      this.handleNotLoggedIn();
      return;
    }

    wx.showLoading({
      title: '处理中...',
    });

    const db = wx.cloud.database();
    const userId = app.globalData.userInfo._id;

    wx.cloud.callFunction({
      name: 'useSkipCard',
      data: {
        userId: userId
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          this.setData({
            isSigned: true,
            skipCardCount: res.result.skipCardCount,
            canUseSkipCard: res.result.skipCardCount > 0
          });
          wx.showToast({
            title: '免打卡特权使用成功',
            icon: 'success'
          });
          // 更新全局用户信息
          getApp().globalData.userInfo.skipCardCount = res.result.skipCardCount;
        } else {
          wx.showToast({
            title: res.result.message || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    });
  }
});