// 首页逻辑
// 导入API配置
const { API, api } = require('../../utils/apiConfig');

Page({
  data: {
    userInfo: {},
    score: 0,
    totalDays: 0,
    consecutiveDays: 0,
    weeklyReport: {},
    isLoggedIn: false
  },

  onLoad: function() {
    // 初始化全局数据
    const app = getApp();
    // 确保globalData有默认值
    if (app.globalData.isLoggedIn === undefined) {
      app.globalData.isLoggedIn = false;
    }
    if (!app.globalData.userInfo) {
      app.globalData.userInfo = {};
    }
    
    this.setData({
      userInfo: app.globalData.userInfo,
      isLoggedIn: app.globalData.isLoggedIn
    });
    
    // 只有登录状态下才获取用户数据
    if (app.globalData.isLoggedIn) {
      this.fetchUserStats();
      this.fetchWeeklyReport();
    }
  },

  onShow: function() {
    const app = getApp();
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      userInfo: app.globalData.userInfo
    });
    
    // 只有登录状态下才刷新数据
    if (app.globalData.isLoggedIn) {
      this.fetchUserStats();
      this.fetchWeeklyReport();
    }
  },

  /**
   * 获取用户统计数据
   */
  fetchUserStats: function() {
    const userInfo = getApp().globalData.userInfo;
    if (!userInfo || !userInfo.openid) {
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
    this.checkLoginAndNavigate('/pages/signin/signin', 'switchTab');
  },

  /**
   * 跳转到抽背页面
   */
  navigateToQuiz: function() {
    this.checkLoginAndNavigate('/pages/quiz/quiz', 'switchTab');
  },

  /**
   * 跳转到抽背历史记录页面
   */
  navigateToQuizHistory: function() {
    this.checkLoginAndNavigate('/pages/quizHistory/quizHistory', 'navigateTo');
  },

  /**
   * 跳转到统计页面
   */
  navigateToStatistics: function() {
    this.checkLoginAndNavigate('/pages/statistics/statistics', 'navigateTo');
  },

  /**
   * 检查登录状态并导航
   * @param {string} url - 目标页面路径
   * @param {string} method - 导航方法：'navigateTo' 或 'switchTab'
   */
  checkLoginAndNavigate: function(url, method) {
    const app = getApp();
    if (!app.globalData.isLoggedIn) {
      // 未登录时，先显示提示，然后跳转到登录页面
      wx.showModal({
        title: '提示',
        content: '使用此功能需要先登录',
        showCancel: false,
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    // 已登录时，正常导航
    if (method === 'switchTab') {
      wx.switchTab({
        url: url
      });
    } else {
      wx.navigateTo({
        url: url
      });
    }
  },
  
  /**
   * 跳转到登录页面
   */
  goToLogin: function() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  }
});