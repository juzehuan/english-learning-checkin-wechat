// 首页逻辑
// 导入API配置
const { API, api } = require('../../utils/apiConfig');

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
    const userInfo = getApp().globalData.userInfo;
    if (!userInfo || !userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    api.get(API.USER.GET_BY_OPENID + userInfo.openid)
      .then(res => {
        if (res.success && res.user) {
          this.setData({
            userInfo: res.user, // 更新用户信息
            score: res.user.totalPoints || 0,
            totalDays: res.user.totalDays || 0,
            consecutiveDays: res.user.consecutiveDays || 0
          });
          
          // 同时更新全局用户信息
          getApp().globalData.userInfo = res.user;
        }
      })
      .catch(err => {
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      });
  },

  /**
   * 获取周报数据
   */
  fetchWeeklyReport: function() {
    const userInfo = getApp().globalData.userInfo;
    if (!userInfo || !userInfo.openid) {
      return;
    }
    
    api.get(API.QUIZ.GET_HISTORY + userInfo.openid + '/history')
      .then(res => {
        if (res.success && res.quizRecords) {
          const quizzes = res.quizRecords;
          // 计算周报数据
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
        }
      })
      .catch(err => {
        console.error('获取周报数据失败:', err);
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
   * 跳转到抽背页面
   */
  navigateToQuiz: function() {
    wx.switchTab({
      url: '/pages/quiz/quiz'
    });
  },

  /**
   * 跳转到抽背历史记录页面
   */
  navigateToQuizHistory: function() {
    wx.navigateTo({
      url: '/pages/quizHistory/quizHistory'
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