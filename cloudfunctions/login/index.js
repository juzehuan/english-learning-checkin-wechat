// 登录云函数
const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 登录云函数
 * 处理用户登录，查询或创建用户信息
 * @param {Object} event - 事件参数
 * @param {Object} context - 上下文
 * @returns {Object} 返回登录结果
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { userInfo, encryptedData, iv, signature, rawData, cloudID } = event;

  // 检查openid是否存在
  if (!openid) {
    console.error('无法获取用户openid');
    return {
      success: false,
      message: '登录失败：无法获取用户身份信息',
      error: { errCode: -1, errMsg: '无法获取用户openid' }
    };
  }

  console.log('接收到的用户认证数据:', {
    openid: '已获取', // 不打印完整openid以保护用户隐私
    userInfo,
    hasEncryptedData: !!encryptedData,
    hasIv: !!iv,
    hasSignature: !!signature,
    hasCloudID: !!cloudID
  });

  try {
    // 查找用户是否已存在
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    if (userResult.data && userResult.data.length > 0) {
      // 用户已存在，检查是否需要更新用户信息
      const user = userResult.data[0];
      
      // 如果传入了新的用户信息，并且与现有信息不同，则更新
      if (userInfo && (userInfo.nickName !== user.nickName || userInfo.avatarUrl !== user.avatarUrl)) {
        try {
          await db.collection('users').doc(user._id).update({
            data: {
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl,
              gender: userInfo.gender || 0,
              city: userInfo.city || '',
              province: userInfo.province || '',
              country: userInfo.country || '',
              language: userInfo.language || '',
              updateTime: db.serverDate()
            }
          });
          
          // 重新查询更新后的用户信息
          const updatedUser = await db.collection('users').doc(user._id).get();
          return {
            success: true,
            openid: openid,
            user: updatedUser.data
          };
        } catch (updateError) {
          console.error('更新用户信息失败:', updateError);
          // 更新失败时仍然返回原始用户信息
          return {
            success: true,
            openid: openid,
            user: user
          };
        }
      }
      
      // 用户已存在且信息不需要更新，直接返回用户信息
      return {
        success: true,
        openid: openid,
        user: user
      };
    } else {
      // 用户不存在，创建新用户
      const newUser = {
        openid: openid,
        nickName: userInfo?.nickName || '用户' + Date.now(),
        avatarUrl: userInfo?.avatarUrl || '',
        gender: userInfo?.gender || 0,
        city: userInfo?.city || '',
        province: userInfo?.province || '',
        country: userInfo?.country || '',
        language: userInfo?.language || '',
        score: 0,
        progress: {
          totalDays: 0,
          consecutiveDays: 0
        },
        friends: [],
        skipCardCount: 0,
        skipQuizCount: 0,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      };

      console.log('准备创建新用户:', newUser);
      
      try {
        const addResult = await db.collection('users').add({
          data: newUser
        });
        
        console.log('用户创建成功，结果:', addResult);

        // 查询刚创建的用户信息
        const createdUser = await db.collection('users').doc(addResult._id).get();
        console.log('查询到的新创建用户:', createdUser.data);

        return {
          success: true,
          openid: openid,
          user: createdUser.data
        };
      } catch (dbError) {
        console.error('用户创建或查询失败:', dbError);
        
        // 检查是否是集合不存在的错误
        if (dbError.errCode === -502005) {
          return {
            success: false,
            message: '用户集合不存在，请在云开发控制台创建users集合后重试',
            error: dbError
          };
        }
        
        // 检查是否是权限问题
        if (dbError.errCode === -501001 || dbError.errCode === -501007) {
          return {
            success: false,
            message: '数据库权限不足，请检查云开发控制台的权限配置',
            error: dbError
          };
        }
        
        // 其他数据库错误
        return {
          success: false,
          message: '用户创建失败，请稍后重试',
          error: dbError
        };
      }
    }
  } catch (error) {
    console.error('[云函数] [login] 错误：', error);
    
    // 检查是否是集合不存在的错误
    if (error.errCode === -502005) {
      return {
        success: false,
        message: '用户集合不存在，请在云开发控制台创建users集合后重试',
        error: error
      };
    }
    
    return {
      success: false,
      message: '登录失败',
      error: error
    };
  }
};