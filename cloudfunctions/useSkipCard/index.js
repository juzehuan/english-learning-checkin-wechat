// 使用免打卡特权云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 使用免打卡特权云函数
 * 处理用户使用免打卡特权
 * @param {Object} event - 事件参数
 * @param {Object} context - 上下文
 * @returns {Object} 返回操作结果
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
    const skipCardCount = user.skipCardCount || 0;

    // 3. 检查是否有足够的免打卡特权
    if (skipCardCount <= 0) {
      return {
        success: false,
        message: '您没有免打卡特权'
      };
    }

    // 4. 检查昨天是否打卡，判断连续天数
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

    // 5. 计算新的总天数
    const totalDays = (user.progress?.totalDays || 0) + 1;

    // 6. 添加打卡记录（标记为免打卡）
    await db.collection('signins').add({
      data: {
        userId: userId,
        date: db.serverDate(),
        type: 'skip', // skip 表示使用免打卡特权
        createTime: db.serverDate()
      }
    });

    // 7. 更新用户信息，扣除免打卡特权
    const newSkipCardCount = skipCardCount - 1;
    const progress = {
      totalDays: totalDays,
      consecutiveDays: consecutiveDays
    };

    await db.collection('users').doc(userId).update({
      data: {
        skipCardCount: newSkipCardCount,
        progress: progress,
        updateTime: db.serverDate()
      }
    });

    // 8. 查询更新后的用户信息
    const updatedUser = await db.collection('users').doc(userId).get();

    return {
      success: true,
      message: '免打卡特权使用成功',
      skipCardCount: newSkipCardCount,
      consecutiveDays: consecutiveDays,
      totalDays: totalDays,
      user: updatedUser.data
    };
  } catch (error) {
    console.error('[云函数] [useSkipCard] 错误：', error);
    return {
      success: false,
      message: '操作失败',
      error: error
    };
  }
};