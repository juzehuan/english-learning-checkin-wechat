// 记录抽背结果云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  traceUser: true
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
  try {
    const wxContext = cloud.getWXContext();
    const currentUserOpenid = wxContext.OPENID;
    const { correctCount = 0, wrongCount = 0, role = '提问者', friendId = null } = event;
    


    // 1. 参数验证
    if (correctCount + wrongCount > 10) {
      return {
        success: false,
        message: '正确数和错误数之和不能超过10'
      };
    }
    
    if (role === '提问者' && (!friendId || typeof friendId !== 'string' || friendId.length === 0 || friendId === currentUserOpenid)) {
      return {
        success: false,
        message: '请选择有效的好友'
      };
    }

    // 2. 记录抽背结果
    const quizRecord = await db.collection('quizzes').add({
      data: {
        userId: currentUserOpenid,
        friendId: role === '提问者' ? friendId : null,
        correctCount: correctCount,
        wrongCount: wrongCount,
        role: role,
        createTime: db.serverDate()
      }
    });

    // 3. 计算积分变化
    let scoreChange = 0;
    let targetUserOpenid = currentUserOpenid;
    
    if (role === '答题者') {
      // 答题者模式
      scoreChange = correctCount === 10 && wrongCount === 0 ? 2 : -wrongCount;
    } else if (role === '提问者') {
      // 提问者模式：给好友打分
      targetUserOpenid = friendId;
      scoreChange = Math.max(0, correctCount - wrongCount);
      
      // 全对额外奖励
      if (correctCount === 10 && wrongCount === 0) {
        scoreChange += 1;
      }
    }

    // 4. 更新目标用户积分
    let newScore = 0;
    if (scoreChange !== 0) {
      newScore = await updateUserScore(targetUserOpenid, scoreChange);
    }

    // 5. 如果是提问者，确保好友关系存在
    if (role === '提问者' && friendId) {
      await ensureFriendshipExists(currentUserOpenid, friendId);
    }

    // 成功返回
    return {
      success: true,
      message: '记录成功',
      quizId: quizRecord._id,
      scoreChange: scoreChange,
      newScore: newScore
    };
  } catch (error) {
    return {
      success: false,
      message: '记录失败：' + (error.message || '未知错误'),
      error: error.message || JSON.stringify(error)
    };
  }
};

/**
 * 更新用户积分
 * @param {string} openid - 用户openid
 * @param {number} scoreChange - 积分变化值
 * @returns {number} 更新后的积分
 */
async function updateUserScore(openid, scoreChange) {
  try {
    // 查询用户
    const userQuery = await db.collection('users').where({
      openid: openid
    }).get();
    
    let newScore = 0;
    
    if (userQuery.data && userQuery.data.length > 0) {
      // 用户存在，更新积分
      const user = userQuery.data[0];
      newScore = Math.max(0, (user.score || 0) + scoreChange);
      
      await db.collection('users').doc(user._id).update({
        data: {
          score: newScore,
          updateTime: db.serverDate()
        }
      });
    } else {
      // 用户不存在，创建用户
      newScore = Math.max(0, scoreChange);
      
      await db.collection('users').add({
        data: {
          openid: openid,
          score: newScore,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
    }
    
    return newScore;
  } catch (error) {
    throw new Error('更新积分失败');
  }
}

/**
 * 确保好友关系存在
 * @param {string} currentUserOpenid - 当前用户openid
 * @param {string} friendOpenid - 好友openid
 */
async function ensureFriendshipExists(currentUserOpenid, friendOpenid) {
  try {
    // 检查好友关系是否已存在
    const friendshipQuery = await db.collection('friendships').where({
      $or: [
        { userId: currentUserOpenid, friendId: friendOpenid, status: 'accepted' },
        { userId: friendOpenid, friendId: currentUserOpenid, status: 'accepted' }
      ]
    }).count();
    
    if (friendshipQuery.total === 0) {
      // 创建好友关系
      await db.collection('friendships').add({
        data: {
          userId: currentUserOpenid,
          friendId: friendOpenid,
          status: 'accepted',
          acceptTime: db.serverDate()
        }
      });
    } else {
    }
  } catch (error) {
      // 不抛出错误，确保主流程继续执行
    }
};