// 好友关系管理云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 好友关系管理云函数
 * 处理好友请求的发送、接受、拒绝、删除等操作
 * @param {Object} event - 事件参数
 * @param {String} event.action - 操作类型：sendRequest, acceptRequest, rejectRequest, deleteFriend, getFriends, getRequests
 * @param {String} event.targetUserId - 目标用户ID
 * @param {String} event.requestId - 好友请求ID（用于acceptRequest和rejectRequest）
 * @param {Object} context - 上下文
 * @returns {Object} 返回操作结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID; // 当前用户ID
  const { action, targetUserId, requestId, customMessage } = event;

  try {
    // 验证用户ID
    if (!userId) {
      return {
        success: false,
        message: '无法获取用户身份信息'
      };
    }

    // 根据操作类型执行不同的逻辑
    switch (action) {
      case 'sendRequest':
        return await handleSendRequest(userId, targetUserId, customMessage);
      case 'acceptRequest':
        return await handleAcceptRequest(userId, requestId);
      case 'rejectRequest':
        return await handleRejectRequest(userId, requestId);
      case 'deleteFriend':
        return await handleDeleteFriend(userId, targetUserId);
      case 'getFriends':
        return await handleGetFriends(userId);
      case 'getRequests':
        return await handleGetRequests(userId);
      case 'checkRelation':
        return await handleCheckRelation(userId, targetUserId);
      default:
        return {
          success: false,
          message: '未知的操作类型'
        };
    }
  } catch (error) {
    console.error('[云函数] [friendRelation] 错误：', error);
    return {
      success: false,
      message: '操作失败',
      error: error.message
    };
  }
};

/**
 * 发送好友请求
 * @param {String} userId - 当前用户ID
 * @param {String} targetUserId - 目标用户ID
 * @param {String} customMessage - 自定义请求消息
 * @returns {Object} 返回操作结果
 */
async function handleSendRequest(userId, targetUserId, customMessage) {
  // 检查目标用户是否存在
  const targetUserResult = await db.collection('users').doc(targetUserId).get();
  if (!targetUserResult.data) {
    return {
      success: false,
      message: '目标用户不存在'
    };
  }

  // 检查是否是发送给自己
  if (userId === targetUserId) {
    return {
      success: false,
      message: '不能添加自己为好友'
    };
  }

  // 检查是否已经是好友
  const relationResult = await db.collection('friendships')
    .where({
      $or: [
        { userId: userId, friendId: targetUserId, status: 'accepted' },
        { userId: targetUserId, friendId: userId, status: 'accepted' }
      ]
    })
    .get();
  
  if (relationResult.data && relationResult.data.length > 0) {
    return {
      success: false,
      message: '你们已经是好友了'
    };
  }

  // 检查是否已经发送过好友请求
  const requestResult = await db.collection('friendships')
    .where({
      userId: userId,
      friendId: targetUserId,
      status: 'pending'
    })
    .get();
  
  if (requestResult.data && requestResult.data.length > 0) {
    return {
      success: false,
      message: '好友请求已发送，请等待对方回应'
    };
  }

  // 创建好友请求
  const requestData = {
    userId: userId,
    friendId: targetUserId,
    status: 'pending', // pending: 待处理, accepted: 已接受, rejected: 已拒绝
    message: customMessage || '我想添加你为好友',
    requestTime: db.serverDate(),
    updateTime: db.serverDate()
  };

  const result = await db.collection('friendships').add({
    data: requestData
  });

  return {
    success: true,
    message: '好友请求发送成功',
    requestId: result._id
  };
}

/**
 * 接受好友请求
 * @param {String} userId - 当前用户ID
 * @param {String} requestId - 好友请求ID
 * @returns {Object} 返回操作结果
 */
async function handleAcceptRequest(userId, requestId) {
  // 检查好友请求是否存在
  const requestResult = await db.collection('friendships').doc(requestId).get();
  if (!requestResult.data) {
    return {
      success: false,
      message: '好友请求不存在'
    };
  }

  const requestData = requestResult.data;
  
  // 检查是否有权限处理此请求
  if (requestData.friendId !== userId) {
    return {
      success: false,
      message: '你无权处理此好友请求'
    };
  }

  // 检查请求状态
  if (requestData.status !== 'pending') {
    return {
      success: false,
      message: '好友请求状态异常'
    };
  }

  // 使用事务确保数据一致性
  const transaction = await db.startTransaction();
  
  try {
    // 更新好友请求状态为已接受
    await transaction.collection('friendships').doc(requestId).update({
      data: {
        status: 'accepted',
        acceptTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 为好友创建反向关系
    await transaction.collection('friendships').add({
      data: {
        userId: userId,
        friendId: requestData.userId,
        status: 'accepted',
        requestTime: requestData.requestTime,
        acceptTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 提交事务
    await transaction.commit();

    return {
      success: true,
      message: '已成功添加好友'
    };
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    console.error('[事务] [接受好友请求] 失败：', error);
    return {
      success: false,
      message: '添加好友失败，请重试'
    };
  }
}

/**
 * 拒绝好友请求
 * @param {String} userId - 当前用户ID
 * @param {String} requestId - 好友请求ID
 * @returns {Object} 返回操作结果
 */
async function handleRejectRequest(userId, requestId) {
  // 检查好友请求是否存在
  const requestResult = await db.collection('friendships').doc(requestId).get();
  if (!requestResult.data) {
    return {
      success: false,
      message: '好友请求不存在'
    };
  }

  const requestData = requestResult.data;
  
  // 检查是否有权限处理此请求
  if (requestData.friendId !== userId) {
    return {
      success: false,
      message: '你无权处理此好友请求'
    };
  }

  // 检查请求状态
  if (requestData.status !== 'pending') {
    return {
      success: false,
      message: '好友请求状态异常'
    };
  }

  // 更新好友请求状态为已拒绝
  await db.collection('friendships').doc(requestId).update({
    data: {
      status: 'rejected',
      rejectTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });

  return {
    success: true,
    message: '已拒绝好友请求'
  };
}

/**
 * 删除好友
 * @param {String} userId - 当前用户ID
 * @param {String} targetUserId - 目标用户ID
 * @returns {Object} 返回操作结果
 */
async function handleDeleteFriend(userId, targetUserId) {
  // 使用事务确保数据一致性
  const transaction = await db.startTransaction();
  
  try {
    // 删除当前用户的好友关系
    await transaction.collection('friendships')
      .where({
        $or: [
          { userId: userId, friendId: targetUserId, status: 'accepted' },
          { userId: targetUserId, friendId: userId, status: 'accepted' }
        ]
      })
      .remove();

    // 提交事务
    await transaction.commit();

    return {
      success: true,
      message: '已成功删除好友'
    };
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    console.error('[事务] [删除好友] 失败：', error);
    return {
      success: false,
      message: '删除好友失败，请重试'
    };
  }
}

/**
 * 获取好友列表
 * @param {String} userId - 当前用户ID
 * @returns {Object} 返回好友列表
 */
async function handleGetFriends(userId) {
  // 获取已接受的好友关系
  const relationResult = await db.collection('friendships')
    .where({
      $or: [
        { userId: userId, status: 'accepted' },
        { friendId: userId, status: 'accepted' }
      ]
    })
    .orderBy('acceptTime', 'desc')
    .get();

  // 提取好友ID列表
  const friendIds = relationResult.data.map(item => {
    return item.userId === userId ? item.friendId : item.userId;
  });

  // 如果没有好友，直接返回空列表
  if (friendIds.length === 0) {
    return {
      success: true,
      friends: []
    };
  }

  // 获取好友的详细信息
  const friendsResult = await db.collection('users')
    .where({
      _id: _.in(friendIds)
    })
    .field({
      _id: true,
      nickName: true,
      avatarUrl: true,
      score: true,
      progress: true
    })
    .get();

  return {
    success: true,
    friends: friendsResult.data,
    total: friendsResult.data.length
  };
}

/**
 * 获取好友请求列表
 * @param {String} userId - 当前用户ID
 * @returns {Object} 返回好友请求列表
 */
async function handleGetRequests(userId) {
  // 获取发送给当前用户的待处理好友请求
  const requestsResult = await db.collection('friendships')
    .where({
      friendId: userId,
      status: 'pending'
    })
    .orderBy('requestTime', 'desc')
    .get();

  // 获取发送好友请求的用户信息
  const requestUserIds = requestsResult.data.map(item => item.userId);
  
  if (requestUserIds.length === 0) {
    return {
      success: true,
      requests: []
    };
  }

  const usersResult = await db.collection('users')
    .where({
      _id: _.in(requestUserIds)
    })
    .field({
      _id: true,
      nickName: true,
      avatarUrl: true
    })
    .get();

  // 构建用户ID到用户信息的映射
  const userMap = {};
  usersResult.data.forEach(user => {
    userMap[user._id] = user;
  });

  // 合并好友请求和用户信息
  const requests = requestsResult.data.map(request => ({
    ...request,
    userInfo: userMap[request.userId]
  }));

  return {
    success: true,
    requests: requests,
    total: requests.length
  };
}

/**
 * 检查用户间的关系
 * @param {String} userId - 当前用户ID
 * @param {String} targetUserId - 目标用户ID
 * @returns {Object} 返回关系状态
 */
async function handleCheckRelation(userId, targetUserId) {
  // 检查是否是自己
  if (userId === targetUserId) {
    return {
      success: true,
      relation: 'self'
    };
  }

  // 检查是否已经是好友
  const friendResult = await db.collection('friendships')
    .where({
      $or: [
        { userId: userId, friendId: targetUserId, status: 'accepted' },
        { userId: targetUserId, friendId: userId, status: 'accepted' }
      ]
    })
    .get();
  
  if (friendResult.data && friendResult.data.length > 0) {
    return {
      success: true,
      relation: 'friend'
    };
  }

  // 检查是否有未处理的好友请求
  const requestResult = await db.collection('friendships')
    .where({
      $or: [
        { userId: userId, friendId: targetUserId, status: 'pending' },
        { userId: targetUserId, friendId: userId, status: 'pending' }
      ]
    })
    .get();
  
  if (requestResult.data && requestResult.data.length > 0) {
    const request = requestResult.data[0];
    return {
      success: true,
      relation: request.userId === userId ? 'request_sent' : 'request_received',
      requestId: request._id
    };
  }

  // 没有任何关系
  return {
    success: true,
    relation: 'none'
  };
}