const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 好友关系管理云函数
 * 支持处理好友请求、管理好友关系
 * @param {Object} event - 事件参数
 * @param {String} event.action - 操作类型：sendRequest, acceptRequest, rejectRequest, deleteFriend, getFriends, getRequests, checkRelation
 * @param {String} event.targetUserId - 目标用户ID (用于sendRequest, deleteFriend, checkRelation)
 * @param {String} event.requestId - 好友请求ID (用于acceptRequest, rejectRequest)
 * @param {String} event.customMessage - 自定义请求消息
 * @param {Object} context - 上下文
 * @returns {Object} 返回操作结果
 */
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const currentUserOpenid = wxContext.OPENID; // 当前用户openid
    
    // 验证用户身份
    if (!currentUserOpenid) {
      return {
        success: false,
        message: '无法获取用户身份信息'
      };
    }
    
    const { action, targetUserId, requestId, customMessage } = event;
    
    // 根据操作类型执行不同的逻辑
    switch (action) {
      case 'sendRequest':
        return await handleSendRequest(currentUserOpenid, targetUserId, customMessage);
      case 'acceptRequest':
        return await handleAcceptRequest(currentUserOpenid, requestId);
      case 'rejectRequest':
        return await handleRejectRequest(currentUserOpenid, requestId);
      case 'deleteFriend':
        return await handleDeleteFriend(currentUserOpenid, targetUserId);
      case 'getFriends':
        return await handleGetFriends(currentUserOpenid);
      case 'getRequests':
        return await handleGetRequests(currentUserOpenid);
      case 'checkRelation':
        return await handleCheckRelation(currentUserOpenid, targetUserId);
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
      message: '操作失败，请稍后重试',
      error: error.message
    };
  }
};

/**
 * 获取用户信息
 * 支持通过openid或数据库_id查询
 * @param {String} userId - 用户ID（openid或数据库_id）
 * @returns {Object|null} 用户信息对象或null
 */
async function getUserInfo(userId) {
  try {
    // 尝试通过openid查询
    let userResult = await db.collection('users')
      .where({ openid: userId })
      .limit(1)
      .get();
    
    // 如果通过openid未找到，尝试通过数据库_id查询
    if (!userResult.data || userResult.data.length === 0) {
      try {
        userResult = await db.collection('users').doc(userId).get();
        return userResult.data;
      } catch (error) {
        return null;
      }
    }
    
    return userResult.data[0];
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 发送好友请求
 * @param {String} currentUserOpenid - 当前用户openid
 * @param {String} targetUserId - 目标用户ID（openid或数据库_id）
 * @param {String} customMessage - 自定义请求消息
 * @returns {Object} 返回操作结果
 */
async function handleSendRequest(currentUserOpenid, targetUserId, customMessage) {
  // 检查参数
  if (!targetUserId) {
    return {
      success: false,
      message: '请输入好友ID'
    };
  }
  
  // 获取当前用户信息
  const currentUser = await getUserInfo(currentUserOpenid);
  if (!currentUser) {
    return {
      success: false,
      message: '当前用户信息不存在'
    };
  }
  
  // 获取目标用户信息
  const targetUser = await getUserInfo(targetUserId);
  if (!targetUser) {
    return {
      success: false,
      message: '目标用户不存在'
    };
  }
  
  // 检查是否是自己
  if (currentUserOpenid === targetUser.openid) {
    return {
      success: false,
      message: '不能添加自己为好友'
    };
  }
  
  // 检查是否已经是好友
  const friendResult = await db.collection('friendships')
    .where({
      $or: [
        { userId: currentUserOpenid, friendId: targetUser.openid, status: 'accepted' },
        { userId: targetUser.openid, friendId: currentUserOpenid, status: 'accepted' }
      ]
    })
    .get();
  
  if (friendResult.data && friendResult.data.length > 0) {
    return {
      success: false,
      message: '你们已经是好友了'
    };
  }
  
  // 检查是否已经发送过好友请求
  const requestResult = await db.collection('friendships')
    .where({
      $or: [
        { userId: currentUserOpenid, friendId: targetUser.openid, status: 'pending' },
        { userId: targetUser.openid, friendId: currentUserOpenid, status: 'pending' }
      ]
    })
    .get();
  
  if (requestResult.data && requestResult.data.length > 0) {
    const request = requestResult.data[0];
    if (request.userId === currentUserOpenid) {
      return {
        success: false,
        message: '您已发送好友请求，请等待对方回应'
      };
    } else {
      return {
        success: false,
        message: '对方已向您发送好友请求，请在好友请求中查看'
      };
    }
  }
  
  // 创建好友请求
  const result = await db.collection('friendships').add({
    data: {
      userId: currentUserOpenid,
      friendId: targetUser.openid,
      status: 'pending',
      message: customMessage || '我想添加你为好友',
      requestTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });
  
  return {
    success: true,
    message: '好友请求发送成功',
    requestId: result._id
  };
}

/**
 * 接受好友请求
 * @param {String} currentUserOpenid - 当前用户openid
 * @param {String} requestId - 好友请求ID
 * @returns {Object} 返回操作结果
 */
async function handleAcceptRequest(currentUserOpenid, requestId) {
  // 检查参数
  if (!requestId) {
    return {
      success: false,
      message: '请求ID不能为空'
    };
  }
  
  // 查找请求记录
  try {
    const requestResult = await db.collection('friendships').doc(requestId).get();
    const request = requestResult.data;
    
    // 检查请求是否有效
    if (!request || request.status !== 'pending' || request.friendId !== currentUserOpenid) {
      return {
        success: false,
        message: '无效的好友请求'
      };
    }
    
    // 开始事务
    const transaction = await db.startTransaction();
    
    try {
      // 更新请求状态为接受
      await transaction.collection('friendships').doc(requestId).update({
        data: {
          status: 'accepted',
          acceptTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      
      // 创建反向好友关系
      await transaction.collection('friendships').add({
        data: {
          userId: currentUserOpenid,
          friendId: request.userId,
          status: 'accepted',
          requestTime: request.requestTime,
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
      throw error;
    }
  } catch (error) {
    console.error('接受好友请求失败:', error);
    return {
      success: false,
      message: '处理失败，请稍后重试'
    };
  }
}

/**
 * 拒绝好友请求
 * @param {String} currentUserOpenid - 当前用户openid
 * @param {String} requestId - 好友请求ID
 * @returns {Object} 返回操作结果
 */
async function handleRejectRequest(currentUserOpenid, requestId) {
  // 检查参数
  if (!requestId) {
    return {
      success: false,
      message: '请求ID不能为空'
    };
  }
  
  // 查找请求记录
  try {
    const requestResult = await db.collection('friendships').doc(requestId).get();
    const request = requestResult.data;
    
    // 检查请求是否有效
    if (!request || request.status !== 'pending' || request.friendId !== currentUserOpenid) {
      return {
        success: false,
        message: '无效的好友请求'
      };
    }
    
    // 更新请求状态为拒绝
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
  } catch (error) {
    console.error('拒绝好友请求失败:', error);
    return {
      success: false,
      message: '处理失败，请稍后重试'
    };
  }
}

/**
 * 删除好友
 * @param {String} currentUserOpenid - 当前用户openid
 * @param {String} targetUserId - 目标用户ID（openid或数据库_id）
 * @returns {Object} 返回操作结果
 */
async function handleDeleteFriend(currentUserOpenid, targetUserId) {
  // 检查参数
  if (!targetUserId) {
    return {
      success: false,
      message: '请输入好友ID'
    };
  }
  
  // 获取好友用户信息
  const targetUser = await getUserInfo(targetUserId);
  if (!targetUser) {
    return {
      success: false,
      message: '好友用户不存在'
    };
  }
  
  // 检查是否是自己
  if (currentUserOpenid === targetUser.openid) {
    return {
      success: false,
      message: '不能删除自己'
    };
  }
  
  // 开始事务
  const transaction = await db.startTransaction();
  
  try {
    // 删除当前用户的好友关系
    await transaction.collection('friendships').where({
      $or: [
        { userId: currentUserOpenid, friendId: targetUser.openid, status: 'accepted' },
        { userId: targetUser.openid, friendId: currentUserOpenid, status: 'accepted' }
      ]
    }).remove();
    
    // 提交事务
    await transaction.commit();
    
    return {
      success: true,
      message: '已成功删除好友'
    };
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    console.error('删除好友失败:', error);
    return {
      success: false,
      message: '删除失败，请稍后重试'
    };
  }
}

/**
 * 获取好友列表
 * @param {String} currentUserOpenid - 当前用户openid
 * @returns {Object} 返回好友列表
 */
async function handleGetFriends(currentUserOpenid) {
  try {
    // 查询当前用户的好友关系
    const relationResult = await db.collection('friendships')
      .where({
        $or: [
          { userId: currentUserOpenid, status: 'accepted' },
          { friendId: currentUserOpenid, status: 'accepted' }
        ]
      })
      .orderBy('acceptTime', 'desc')
      .get();
    
    // 提取好友openid列表
    const friendOpenids = relationResult.data.map(item => {
      return item.userId === currentUserOpenid ? item.friendId : item.userId;
    });
    
    // 如果没有好友，直接返回空列表
    if (friendOpenids.length === 0) {
      return {
        success: true,
        friends: [],
        total: 0
      };
    }
    
    // 获取好友的详细信息
    const friendsResult = await db.collection('users')
      .where({ openid: _.in(friendOpenids) })
      .field({
        _id: true,
        nickName: true,
        avatarUrl: true,
        score: true,
        progress: true,
        openid: true
      })
      .get();
    
    return {
      success: true,
      friends: friendsResult.data,
      total: friendsResult.data.length
    };
  } catch (error) {
    console.error('获取好友列表失败:', error);
    return {
      success: false,
      message: '获取好友列表失败，请稍后重试'
    };
  }
}

/**
 * 获取好友请求列表
 * @param {String} currentUserOpenid - 当前用户openid
 * @returns {Object} 返回好友请求列表
 */
async function handleGetRequests(currentUserOpenid) {
  try {
    console.log('[handleGetRequests] 开始获取好友请求，当前用户openid:', currentUserOpenid);
    
    // 先获取当前用户信息，得到用户ID
    const currentUser = await getUserInfo(currentUserOpenid);
    const currentUserId = currentUser?._id || currentUserOpenid;
    
    console.log('[handleGetRequests] 当前用户信息:', currentUser);
    console.log('[handleGetRequests] 当前用户ID:', currentUserId);
    
    // 查询当前用户收到的好友请求 - 同时匹配friendId为OpenID或用户ID的请求
    const requestsResult = await db.collection('friendships')
      .where({
        friendId: _.or([currentUserOpenid, currentUserId]),
        status: 'pending'
      })
      .orderBy('requestTime', 'desc')
      .get();
    
    console.log('[handleGetRequests] 查询结果:', requestsResult.data);
    console.log('[handleGetRequests] 请求数量:', requestsResult.data.length);
    
    // 提取请求用户ID列表
    const requestUserIds = requestsResult.data.map(request => request.userId);
    
    console.log('[handleGetRequests] 请求用户ID列表:', requestUserIds);
    
    // 构建用户ID到用户信息的映射 - 使用getUserInfo函数，它支持通过ID或openid查询
    const userMap = {};
    const userInfoPromises = requestUserIds.length > 0 ? requestUserIds.map(async (userId) => {
      const userInfo = await getUserInfo(userId);
      if (userInfo) {
        userMap[userId] = userInfo;
      }
      return userInfo;
    }) : [];
    
    // 等待所有用户信息查询完成
    if (userInfoPromises.length > 0) {
      await Promise.all(userInfoPromises);
    }
    
    console.log('[handleGetRequests] 用户信息映射:', userMap);
    
    // 合并好友请求和用户信息
    const requests = requestsResult.data.map(request => ({
      ...request,
      userInfo: userMap[request.userId] || { nickName: '未知用户', avatarUrl: '/images/avatar.png' }
    }));
    
    console.log('[handleGetRequests] 最终返回的请求列表:', requests);
    
    return {
      success: true,
      requests: requests,
      total: requests.length,
      debugInfo: {
        currentUserOpenid,
        currentUserId,
        requestCount: requestsResult.data.length,
        userInfoCount: Object.keys(userMap).length
      }
    };
  } catch (error) {
    console.error('获取好友请求失败:', error);
    return {
      success: false,
      message: '获取好友请求失败，请稍后重试',
      error: error.message,
      debugInfo: {
        currentUserOpenid
      }
    };
  }
}

/**
 * 检查用户间的关系
 * @param {String} currentUserOpenid - 当前用户openid
 * @param {String} targetUserId - 目标用户ID（openid或数据库_id）
 * @returns {Object} 返回关系状态
 */
async function handleCheckRelation(currentUserOpenid, targetUserId) {
  try {
    // 检查参数
    if (!targetUserId) {
      return {
        success: false,
        message: '请输入目标用户ID'
      };
    }
    
    // 获取目标用户信息
    const targetUser = await getUserInfo(targetUserId);
    if (!targetUser) {
      return {
        success: false,
        message: '目标用户不存在'
      };
    }
    
    // 检查是否是自己
    if (currentUserOpenid === targetUser.openid) {
      return {
        success: true,
        relation: 'self'
      };
    }
    
    // 检查是否已经是好友
    const friendResult = await db.collection('friendships')
      .where({
        $or: [
          { userId: currentUserOpenid, friendId: targetUser.openid, status: 'accepted' },
          { userId: targetUser.openid, friendId: currentUserOpenid, status: 'accepted' }
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
          { userId: currentUserOpenid, friendId: targetUser.openid, status: 'pending' },
          { userId: targetUser.openid, friendId: currentUserOpenid, status: 'pending' }
        ]
      })
      .get();
    
    if (requestResult.data && requestResult.data.length > 0) {
      const request = requestResult.data[0];
      return {
        success: true,
        relation: request.userId === currentUserOpenid ? 'request_sent' : 'request_received',
        requestId: request._id
      };
    }
    
    // 没有任何关系
    return {
      success: true,
      relation: 'none'
    };
  } catch (error) {
    console.error('检查关系失败:', error);
    return {
      success: false,
      message: '检查关系失败，请稍后重试'
    };
  }
}