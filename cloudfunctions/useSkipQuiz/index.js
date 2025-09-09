// 使用免抽背特权云函数
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

/**
 * 使用免抽背特权
 * 该函数用于处理用户使用免抽背特权的逻辑
 * @param {Object} event - 包含userId参数
 * @returns {Object} - 返回操作结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = event.userId || wxContext.OPENID;

  try {
    // 获取当前日期
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. 检查用户是否已记录今日抽背
    const todayQuiz = await db.collection('quizzes')
      .where({
        userId: userId,
        date: _.gte(today).and(_.lt(tomorrow))
      })
      .get();

    if (todayQuiz.data && todayQuiz.data.length > 0) {
      return {
        success: false,
        message: '今日已经记录抽背结果，无法使用免抽背特权'
      };
    }

    // 2. 获取用户信息
    const userInfo = await db.collection('users').doc(userId).get();
    const skipQuizCardCount = userInfo.data.skipQuizCardCount || 0;

    // 3. 检查免抽背特权数量
    if (skipQuizCardCount <= 0) {
      return {
        success: false,
        message: '您没有免抽背特权'
      };
    }

    // 4. 扣减免抽背特权并记录免抽背信息
    await db.runTransaction(async transaction => {
      // 更新用户信息，扣减免抽背特权
      await transaction.update({
        collection: 'users',
        doc: userId,
        data: {
          skipQuizCardCount: skipQuizCardCount - 1,
          updatedAt: db.serverDate()
        }
      });

      // 添加免抽背记录
      await transaction.add({
        collection: 'quizzes',
        data: {
          userId: userId,
          date: now,
          correctCount: 10,
          wrongCount: 0,
          role: '答题者',
          isSkip: true,
          createdAt: db.serverDate()
        }
      });
    });

    // 5. 查询更新后的用户信息
    const updatedUserInfo = await db.collection('users').doc(userId).get();

    return {
      success: true,
      message: '免抽背特权使用成功',
      skipQuizCardCount: updatedUserInfo.data.skipQuizCardCount || 0
    };
  } catch (error) {
    return {
      success: false,
      message: '操作失败，请稍后重试',
      error: error.message
    };
  }
};