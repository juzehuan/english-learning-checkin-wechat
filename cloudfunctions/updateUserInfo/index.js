// 更新用户信息云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 更新用户信息云函数
 * 处理用户头像和昵称的更新
 * @param {Object} event - 事件参数
 * @param {Object} context - 上下文
 * @returns {Object} 返回更新结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { userInfo } = event;

  // 检查openid是否存在
  if (!openid) {
    return {
      success: false,
      message: '更新失败：无法获取用户身份信息',
      error: { errCode: -1, errMsg: '无法获取用户openid' }
    };
  }

  // 检查是否提供了用户信息
  if (!userInfo || (!userInfo.nickName && !userInfo.avatarUrl)) {
    return {
      success: false,
      message: '更新失败：请提供要更新的昵称或头像',
      error: { errCode: -2, errMsg: '缺少用户信息' }
    };
  }

  try {
    // 查找用户是否已存在
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    if (userResult.data && userResult.data.length > 0) {
      // 用户已存在，更新用户信息
      const user = userResult.data[0];
      const updateData = {
        updateTime: db.serverDate()
      };

      // 如果提供了昵称，则更新昵称
      if (userInfo.nickName) {
        updateData.nickName = userInfo.nickName;
      }

      // 如果提供了头像，则更新头像
      if (userInfo.avatarUrl) {
        updateData.avatarUrl = userInfo.avatarUrl;
      }

      // 如果提供了其他信息，也一并更新
      if (userInfo.gender !== undefined) {
        updateData.gender = userInfo.gender;
      }
      if (userInfo.city) {
        updateData.city = userInfo.city;
      }
      if (userInfo.province) {
        updateData.province = userInfo.province;
      }
      if (userInfo.country) {
        updateData.country = userInfo.country;
      }
      if (userInfo.language) {
        updateData.language = userInfo.language;
      }

      try {
        await db.collection('users').doc(user._id).update({
          data: updateData
        });
        
        // 重新查询更新后的用户信息
        const updatedUser = await db.collection('users').doc(user._id).get();
        return {
          success: true,
          message: '用户信息更新成功',
          user: updatedUser.data
        };
      } catch (updateError) {
        return {
          success: false,
          message: '更新失败，请稍后重试',
          error: updateError
        };
      }
    } else {
      // 用户不存在
      return {
        success: false,
        message: '用户不存在，请先登录',
        error: { errCode: -3, errMsg: '用户不存在' }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: '服务器繁忙，请稍后重试',
      error: error
    };
  }
};