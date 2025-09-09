const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 获取抽背历史记录云函数
 * 获取当前用户的抽背历史记录，包括自己抽背好友和被抽背的记录
 * @param {Object} event - 事件参数
 * @param {Number} event.pageSize - 每页记录数，默认10
 * @param {Number} event.pageNum - 页码，默认1
 * @param {String} event.sortBy - 排序字段，默认date
 * @param {String} event.sortOrder - 排序顺序，asc或desc，默认desc
 * @param {String} event.filterType - 过滤类型，all全部记录，sender我抽背的，receiver被抽背的
 * @param {Object} context - 上下文
 * @returns {Object} 返回操作结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  
  // 默认参数
  const { 
    pageSize = 10, 
    pageNum = 1, 
    sortBy = 'date', 
    sortOrder = 'desc', 
    filterType = 'all' 
  } = event;

  try {
    // 构建查询条件
    let query = {}
    
    if (filterType === 'sender') {
      // 我抽背的记录
      query = {
        userId: userId,
        role: '提问者',
        friendId: _.exists(true)
      };
    } else if (filterType === 'receiver') {
      // 被抽背的记录
      query = {
        friendId: userId,
        role: '提问者'
      };
    } else {
      // 全部记录（我抽背的和被抽背的）
      query = _.or([
        // 我作为提问者抽背好友的记录
        {
          userId: userId,
          role: '提问者',
          friendId: _.exists(true)
        },
        // 我作为答题者被抽背的记录
        {
          friendId: userId,
          role: '提问者'
        }
      ]);
    }

    // 计算跳过的记录数
    const skip = (pageNum - 1) * pageSize;
    
    // 构建排序对象
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // 查询抽背记录
    const quizRecords = await db.collection('quizzes')
      .where(query)
      .orderBy(sortBy, sortOrder)
      .skip(skip)
      .limit(pageSize)
      .get();
    
    // 获取总记录数
    const countResult = await db.collection('quizzes')
      .where(query)
      .count();
    
    // 提取所有相关的用户ID
    const userIds = new Set();
    quizRecords.data.forEach(record => {
      userIds.add(record.userId);
      if (record.friendId) {
        userIds.add(record.friendId);
      }
    });
    
    // 查询用户信息
    const userInfoPromises = Array.from(userIds).map(id => {
      return db.collection('users').doc(id).get().then(res => {
        return { id, ...res.data };
      }).catch(() => {
        return { id, nickName: '未知用户', avatarUrl: '' };
      });
    });
    
    const userInfos = await Promise.all(userInfoPromises);
    const userMap = {};
    userInfos.forEach(user => {
      userMap[user.id] = user;
    });
    
    // 处理抽背记录，添加用户信息
    const processedRecords = quizRecords.data.map(record => {
      const isSender = record.userId === userId && record.role === '提问者' && record.friendId;
      const isReceiver = record.friendId === userId && record.role === '提问者';
      
      let relatedUserId = '';
      let relatedUserName = '';
      let relatedUserAvatar = '';
      
      if (isSender && record.friendId) {
        // 我抽背的记录，显示好友信息
        const friendInfo = userMap[record.friendId] || {};
        relatedUserId = record.friendId;
        relatedUserName = friendInfo.nickName || '未知用户';
        relatedUserAvatar = friendInfo.avatarUrl || '';
      } else if (isReceiver) {
        // 被抽背的记录，显示提问者信息
        const askerInfo = userMap[record.userId] || {};
        relatedUserId = record.userId;
        relatedUserName = askerInfo.nickName || '未知用户';
        relatedUserAvatar = askerInfo.avatarUrl || '';
      }
      
      return {
        ...record,
        relatedUserId,
        relatedUserName,
        relatedUserAvatar,
        isSender,
        isReceiver,
        // 计算得分
        score: isReceiver ? (record.correctCount - record.wrongCount < 0 ? 0 : record.correctCount - record.wrongCount) : 0
      };
    });
    
    return {
      success: true,
      message: '获取成功',
      data: {
        list: processedRecords,
        total: countResult.total,
        pageSize,
        pageNum,
        hasMore: processedRecords.length === pageSize && skip + pageSize < countResult.total
      }
    };
  } catch (error) {
    return {
      success: false,
      message: '获取失败，请稍后重试',
      error: error.message
    };
  }
};