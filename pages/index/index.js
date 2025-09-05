// 首页逻辑
Page({
  data: {
    userInfo: {},
    score: 0,
    totalDays: 0,
    consecutiveDays: 0,
    weeklyReport: {}
  },

  onLoad: function() {
    this.setData({
      userInfo: getApp().globalData.userInfo
    });
    this.fetchUserStats();
    this.fetchWeeklyReport();
  },

  onShow: function() {
    // 每次显示页面时刷新数据
    this.fetchUserStats();
    this.fetchWeeklyReport();
  },

  /**
   * 获取用户统计数据
   */
  fetchUserStats: function() {
    const db = wx.cloud.database();
    const that = this;
    
    db.collection('users').doc(getApp().globalData.userInfo._id).get({
      success: res => {
        this.setData({
          score: res.data.score || 0,
          totalDays: res.data.progress?.totalDays || 0,
          consecutiveDays: res.data.progress?.consecutiveDays || 0
        });
      },
      fail: err => {
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
        console.error('[数据库] [查询记录] 失败：', err);
      }
    });
  },

  /**
   * 获取周报数据
   */
  fetchWeeklyReport: function() {
    const db = wx.cloud.database();
    const _ = db.command;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    db.collection('quizzes').where({
      userId: getApp().globalData.userInfo._id,
      date: _.gte(startOfWeek)
    }).get({
      success: res => {
        const quizzes = res.data;
        let totalCorrect = 0;
        let totalWrong = 0;
        let quizCount = 0;
        let fullMarkCount = 0;

        quizzes.forEach(item => {
          totalCorrect += item.correctCount || 0;
          totalWrong += item.wrongCount || 0;
          quizCount++;
          if (item.correctCount === 10 && item.wrongCount === 0) {
            fullMarkCount++;
          }
        });

        this.setData({
          weeklyReport: {
            quizCount: quizCount,
            totalCorrect: totalCorrect,
            totalWrong: totalWrong,
            fullMarkCount: fullMarkCount,
            accuracy: quizCount > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0
          }
        });
      },
      fail: err => {
        console.error('[数据库] [查询周报] 失败：', err);
      }
    });
  },

  /**
   * 跳转到打卡页面
   */
  navigateToSignin: function() {
    wx.switchTab({
      url: '/pages/signin/signin'
    });
  },

  /**
   * 跳转到抽背记录页面
   */
  navigateToQuiz: function() {
    wx.switchTab({
      url: '/pages/quiz/quiz'
    });
  },

  /**
   * 跳转到统计页面
   */
  navigateToStatistics: function() {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  }
});