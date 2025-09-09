// 积分结算云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 积分结算云函数
 * 该函数用于每周自动计算用户积分，更新用户信息
 * @returns {Object} - 返回结算结果
 */
exports.main = async (event, context) => {
  try {
    // 获取当前日期
    const now = new Date();
    
    // 计算上周的日期范围
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - now.getDay() - 7); // 上周一
    lastWeekStart.setHours(0, 0, 0, 0);
    
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 7); // 下周一凌晨（不包含）
    lastWeekEnd.setHours(0, 0, 0, 0);

    // 1. 获取所有用户
    const usersRes = await db.collection('users').get();
    const users = usersRes.data;

    // 2. 遍历用户进行积分结算
    for (const user of users) {
      const userId = user._id;
      
      // 3. 获取用户上周的抽背记录
      const quizzesRes = await db.collection('quizzes')
        .where({
          userId: userId,
          date: _.gte(lastWeekStart).and(_.lt(lastWeekEnd))
        })
        .get();
      
      const quizzes = quizzesRes.data;
      
      // 4. 计算抽背得分
      let weeklyQuizScore = 0;
      quizzes.forEach(quiz => {
        // 仅计算答题者的得分
        if (quiz.role === '答题者' && !quiz.isSkip) {
          // 全对+2分
          if (quiz.correctCount === 10 && quiz.wrongCount === 0) {
            weeklyQuizScore += 2;
          } else {
            // 每错1个扣1分（最小为0）
            weeklyQuizScore = Math.max(0, weeklyQuizScore - quiz.wrongCount);
          }
        }
      });
      
      // 5. 获取用户上周的打卡记录
      const signinsRes = await db.collection('signins')
        .where({
          userId: userId,
          date: _.gte(lastWeekStart).and(_.lt(lastWeekEnd))
        })
        .get();
      
      const signinDays = signinsRes.data.length;
      // 基础分：每日打卡+1分，最多7分/周
      const weeklySigninScore = Math.min(signinDays, 7);
      
      // 6. 计算缺卡惩罚：未打卡天数*2分
      const missedDays = Math.max(0, 7 - signinDays);
      const penaltyScore = missedDays * 2;
      
      // 7. 计算本周总得分
      const weeklyTotalScore = weeklySigninScore + weeklyQuizScore - penaltyScore;
      
      // 8. 更新用户积分和周报告
      await db.collection('users').doc(userId).update({
        data: {
          score: _.inc(weeklyTotalScore),
          lastWeekScore: weeklyTotalScore,
          weeklyReports: _.push({
            weekStart: lastWeekStart,
            weekEnd: lastWeekEnd,
            signinDays: signinDays,
            quizCount: quizzes.length,
            totalScore: weeklyTotalScore,
            createdAt: db.serverDate()
          }),
          updatedAt: db.serverDate()
        }
      });
    }

    return {
      success: true,
      message: '积分结算完成',
      totalUsers: users.length
    };
  } catch (error) {
    return {
      success: false,
      message: '积分结算失败',
      error: error.message
    };
  }
};