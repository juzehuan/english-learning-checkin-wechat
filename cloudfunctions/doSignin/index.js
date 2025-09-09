// 打卡云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 打卡云函数
 * 处理用户每日打卡，更新用户积分和连续学习天数
 * @param {Object} event - 事件参数
 * @param {Object} context - 上下文
 * @returns {Object} 返回打卡结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = event.userId || wxContext.OPENID;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // 1. 检查今天是否已经打卡
    const signinResult = await db.collection('signins').where({
      userId: userId,
      date: _.gte(today).and(_.lt(tomorrow))
    }).get();

    if (signinResult.data && signinResult.data.length > 0) {
      return {
        success: false,
        message: '今天已经打卡了'
      };
    }

    // 2. 获取用户信息
    const userResult = await db.collection('users').doc(userId).get();
    const user = userResult.data;
    
    // 3. 检查昨天是否打卡，判断连续天数
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySignin = await db.collection('signins').where({
      userId: userId,
      date: _.gte(yesterday).and(_.lt(today))
    }).get();

    // 计算新的连续天数
    let consecutiveDays = (user.progress?.consecutiveDays || 0);
    if (yesterdaySignin.data && yesterdaySignin.data.length > 0) {
      consecutiveDays += 1;
    } else {
      consecutiveDays = 1;
    }

    // 4. 计算新的总天数
    const totalDays = (user.progress?.totalDays || 0) + 1;

    // 5. 计算新积分（基础+1分）
    let newScore = (user.score || 0) + 1;
    
    // 6. 添加打卡记录
    await db.collection('signins').add({
      data: {
        userId: userId,
        date: db.serverDate(),
        type: 'normal', // normal 正常打卡，skip 免打卡
        createTime: db.serverDate()
      }
    });

    // 7. 更新用户信息
    const progress = {
      totalDays: totalDays,
      consecutiveDays: consecutiveDays
    };

    await db.collection('users').doc(userId).update({
      data: {
        score: newScore,
        progress: progress,
        updateTime: db.serverDate()
      }
    });

    // 8. 查询更新后的用户信息
    const updatedUser = await db.collection('users').doc(userId).get();

    return {
      success: true,
      message: '打卡成功',
      newScore: newScore,
      consecutiveDays: consecutiveDays,
      totalDays: totalDays,
      progress: progress,
      user: updatedUser.data
    };
  } catch (error) {
    return {
      success: false,
      message: '打卡失败',
      error: error
    };
  }
};