// 统计页面逻辑
// 导入API配置
const { api, API } = require('../../utils/apiConfig');

Page({
  data: {
    weeklyData: [],
    monthlyData: [],
    totalQuizCount: 0,
    totalCorrect: 0,
    totalWrong: 0,
    averageAccuracy: 0,
    fullMarkCount: 0,
    loading: true,
    activeTab: 'week'
  },

  onLoad: function() {
    this.fetchStatisticsData();
  },

  /**
   * 获取统计数据
   */
  fetchStatisticsData: function() {
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      this.setData({ loading: false });
      return;
    }

    wx.showLoading({
      title: '加载中...',
    });

    // 调用后端API获取统计数据
    api.get(API.STATISTICS.GET_BY_USER, {
      openid: app.globalData.userInfo.openid
    }).then(res => {
      wx.hideLoading();
      if (res.success) {
        const quizzes = res.quizzes || [];
        this.processStatistics(quizzes);
      } else {
        wx.showToast({
          title: res.message || '获取数据失败',
          icon: 'none'
        });
      }
      this.setData({ loading: false });
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
      console.error('[API] [查询统计数据] 失败：', err);
      this.setData({ loading: false });
    });
  },

  /**
   * 处理统计数据
   */
  processStatistics: function(quizzes) {
    const now = new Date();
    const weeklyData = [];
    const monthlyData = [];
    let totalQuizCount = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let fullMarkCount = 0;

    // 按周分组统计
    const weekGroups = {};
    // 按月分组统计
    const monthGroups = {};

    quizzes.forEach(quiz => {
      const date = new Date(quiz.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const week = this.getWeekOfYear(date);
      
      // 累计总数
      totalQuizCount++;
      totalCorrect += quiz.correctCount || 0;
      totalWrong += quiz.wrongCount || 0;
      if (quiz.correctCount === 10 && quiz.wrongCount === 0) {
        fullMarkCount++;
      }

      // 按周统计
      const weekKey = `${year}-W${week}`;
      if (!weekGroups[weekKey]) {
        weekGroups[weekKey] = {
          week: weekKey,
          count: 0,
          correct: 0,
          wrong: 0
        };
      }
      weekGroups[weekKey].count++;
      weekGroups[weekKey].correct += quiz.correctCount || 0;
      weekGroups[weekKey].wrong += quiz.wrongCount || 0;

      // 按月统计
      const monthKey = `${year}-${month}`;
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = {
          month: monthKey,
          count: 0,
          correct: 0,
          wrong: 0
        };
      }
      monthGroups[monthKey].count++;
      monthGroups[monthKey].correct += quiz.correctCount || 0;
      monthGroups[monthKey].wrong += quiz.wrongCount || 0;
    });

    // 转换为数组并排序
    for (const key in weekGroups) {
      const data = weekGroups[key];
      weeklyData.push({
        week: data.week,
        accuracy: Math.round((data.correct / (data.correct + data.wrong)) * 100),
        count: data.count
      });
    }

    for (const key in monthGroups) {
      const data = monthGroups[key];
      monthlyData.push({
        month: data.month,
        accuracy: Math.round((data.correct / (data.correct + data.wrong)) * 100),
        count: data.count
      });
    }

    // 按时间排序
    weeklyData.sort((a, b) => a.week.localeCompare(b.week));
    monthlyData.sort((a, b) => a.month.localeCompare(b.month));

    // 计算平均正确率
    const averageAccuracy = totalQuizCount > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0;

    this.setData({
      weeklyData: weeklyData,
      monthlyData: monthlyData,
      totalQuizCount: totalQuizCount,
      totalCorrect: totalCorrect,
      totalWrong: totalWrong,
      averageAccuracy: averageAccuracy,
      fullMarkCount: fullMarkCount
    });
  },

  /**
   * 获取日期所在的周数
   */
  getWeekOfYear: function(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // 调整周日为7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); // 调整到周四
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  },

  /**
   * 切换到周视图
   */
  switchToWeekView: function() {
    this.setData({
      activeTab: 'week'
    });
  },

  /**
   * 切换到月视图
   */
  switchToMonthView: function() {
    this.setData({
      activeTab: 'month'
    });
  }
});