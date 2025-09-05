// 记录抽背结果云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 记录抽背结果云函数
 * 保存抽背记录并计算积分
 * @param {Object} event - 事件参数
 * @param {Object} context - 上下文
 * @returns {Object} 返回操作结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { correctCount = 0, wrongCount = 0, role = '答题者', friendId = null } = event;

  try {
    // 验证输入
    if (correctCount + wrongCount > 10) {
      return {
        success: false,
        message: '正确数和错误数之和不能超过10'
      };
    }

    // 1. 记录抽背结果
    const quizResult = await db.collection('quizzes').add({
      data: {
        userId: userId,
        friendId: friendId,
        correctCount: correctCount,
        wrongCount: wrongCount,
        role: role,
        date: db.serverDate(),
        createTime: db.serverDate()
      }
    });

    // 2. 计算积分变化
    let scoreChange = 0;
    let targetUserId = userId; // 默认是当前用户
    
    if (role === '答题者') {
      // 答题者模式：自己获得积分
      // 全对（10/10）+2分
      if (correctCount === 10 && wrongCount === 0) {
        scoreChange = 2;
      } else {
        // 每错1个-1分
        scoreChange = -wrongCount;
      }
    } else if (role === '提问者' && friendId && friendId !== userId) {
      // 提问者模式：给好友打分，分数加到好友身上
      targetUserId = friendId;
      // 计算好友得分：正确数 - 错误数，至少0分
      scoreChange = correctCount - wrongCount;
      if (scoreChange < 0) scoreChange = 0;
      
      // 全对额外奖励
      if (correctCount === 10 && wrongCount === 0) {
        scoreChange += 1;
      }
    }

    // 3. 更新目标用户积分
    let newScore = 0;
    if (scoreChange !== 0) {
      try {
        const userResult = await db.collection('users').doc(targetUserId).get();
        newScore = (userResult.data.score || 0) + scoreChange;
        
        // 确保积分不为负数
        if (newScore < 0) newScore = 0;
        
        await db.collection('users').doc(targetUserId).update({
          data: {
            score: newScore,
            updateTime: db.serverDate()
          }
        });
      } catch (userError) {
        console.error('[云函数] [recordQuiz] 更新用户积分失败：', userError);
        // 继续执行，不影响抽背记录的保存
      }
    }

    // 4. 如果有好友ID，记录好友关系（可选）
    if (friendId && friendId !== userId) {
      // 检查好友关系是否已存在
      const userInfo = await db.collection('users').doc(userId).get();
      const friends = userInfo.data.friends || [];
      
      if (!friends.includes(friendId)) {
        friends.push(friendId);
        await db.collection('users').doc(userId).update({
          data: {
            friends: friends,
            updateTime: db.serverDate()
          }
        });
      }
    }

    return {
      success: true,
      message: '记录成功',
      quizId: quizResult._id,
      scoreChange: scoreChange,
      newScore: newScore
    };
  } catch (error) {
    console.error('[云函数] [recordQuiz] 错误：', error);
    return {
      success: false,
      message: '记录失败',
      error: error
    };
  }
};