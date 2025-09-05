// 个人信息页面逻辑
Page({
  data: {
    userInfo: {},
    score: 0,
    progress: {
      totalDays: 0,
      consecutiveDays: 0
    },
    friendCount: 0,
    privileges: {
      skipCardCount: 0,
      skipQuizCount: 0
    }
  },

  onLoad: function() {
    this.setData({
      userInfo: getApp().globalData.userInfo
    });
    this.fetchUserDetail();
  },

  onShow: function() {
    // 每次显示页面时刷新数据
    this.fetchUserDetail();
  },

  /**
   * 获取用户详细信息
   */
  fetchUserDetail: function() {
    const db = wx.cloud.database();
    const userId = getApp().globalData.userInfo._id;

    db.collection('users').doc(userId).get({
      success: res => {
        const userData = res.data;
        this.setData({
          score: userData.score || 0,
          progress: userData.progress || { totalDays: 0, consecutiveDays: 0 },
          friendCount: userData.friends ? userData.friends.length : 0,
          privileges: {
            skipCardCount: userData.skipCardCount || 0,
            skipQuizCount: userData.skipQuizCount || 0
          }
        });
        
        // 更新全局用户信息
        getApp().globalData.userInfo = userData;
      },
      fail: err => {
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
        console.error('[数据库] [查询用户信息] 失败：', err);
      }
    });
  },

  /**
   * 跳转到好友管理页面
   */
  navigateToFriendManage: function() {
    wx.navigateTo({
      url: '/pages/friend/manage'
    });
  },

  /**
   * 跳转到统计页面
   */
  navigateToStatistics: function() {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  },

  /**
   * 查看积分规则
   */
  viewScoreRules: function() {
    wx.showModal({
      title: '积分规则',
      content: '📚 基础打卡：每日打卡+1分（最多7分/周）\n✅ 抽背全对（10/10）：+2分\n❌ 抽背错误：每错1个-1分\n⚠️ 缺卡惩罚：未打卡-2分',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 重新登录
   */
  reLogin: function() {
    wx.showModal({
      title: '重新登录',
      content: '确定要重新登录吗？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          getApp().globalData.userInfo = null;
          getApp().globalData.isLoggedIn = false;
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  /**
   * 设置页面
   */
  navigateToSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/index'
    });
  }
});