// 好友关系数据迁移脚本
// 此脚本用于将users集合中的friends字段数据迁移到新的friendships集合

const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 好友关系数据迁移函数
 * 从users集合的friends字段迁移到friendships集合
 * @param {Object} event - 事件参数
 * @param {Boolean} event.dryRun - 是否仅测试不实际执行迁移
 * @param {Number} event.batchSize - 每批次处理的用户数量
 * @param {Object} context - 上下文
 * @returns {Object} 返回迁移结果
 */
exports.main = async (event, context) => {
  const { dryRun = true, batchSize = 100 } = event;
  let processedCount = 0;
  let migratedCount = 0;
  let errorCount = 0;
  const errors = [];
  const startTime = Date.now();

  try {
    console.log(`开始执行好友关系数据迁移，dryRun: ${dryRun}, batchSize: ${batchSize}`);

    // 检查friendships集合是否存在
    try {
      await db.collection('friendships').count();
      console.log('friendships集合已存在');
    } catch (err) {
      if (err.errCode === -502005) {
        console.log('friendships集合不存在，请先在云开发控制台创建集合');
        return {
          success: false,
          message: 'friendships集合不存在，请先在云开发控制台创建集合'
        };
      }
      throw err;
    }

    // 分批获取用户数据
    let hasMore = true;
    let lastId = null;

    while (hasMore) {
      console.log(`处理批次，lastId: ${lastId || 'null'}`);

      // 构建查询条件
      let query = db.collection('users');
      if (lastId) {
        query = query.where({
          _id: _.gt(lastId)
        });
      }

      // 查询用户数据，包含friends字段
      const usersResult = await query
        .field({
          _id: true,
          friends: true
        })
        .orderBy('_id', 'asc')
        .limit(batchSize)
        .get();

      const users = usersResult.data;
      if (users.length === 0) {
        hasMore = false;
        break;
      }

      // 更新最后处理的用户ID
      lastId = users[users.length - 1]._id;

      // 处理每用户的好友关系
      for (const user of users) {
        processedCount++;
        
        try {
          // 检查用户是否有好友
          if (!user.friends || !Array.isArray(user.friends) || user.friends.length === 0) {
            console.log(`用户 ${user._id} 没有好友关系，跳过`);
            continue;
          }

          // 记录此用户需要迁移的好友数量
          const userFriendCount = user.friends.length;
          let userMigratedCount = 0;

          // 遍历用户的好友列表
          for (const friendId of user.friends) {
            // 跳过无效的好友ID
            if (!friendId || typeof friendId !== 'string') {
              console.log(`用户 ${user._id} 有无效的好友ID: ${friendId}，跳过`);
              continue;
            }

            // 检查好友关系是否已存在
            const relationResult = await db.collection('friendships')
              .where({
                $or: [
                  { userId: user._id, friendId: friendId, status: 'accepted' },
                  { userId: friendId, friendId: user._id, status: 'accepted' }
                ]
              })
              .count();

            if (relationResult.total > 0) {
              console.log(`用户 ${user._id} 与 ${friendId} 的好友关系已存在，跳过`);
              continue;
            }

            // 构建好友关系数据
            const now = db.serverDate();
            const friendshipData = {
              userId: user._id,
              friendId: friendId,
              status: 'accepted',
              requestTime: now,
              acceptTime: now,
              updateTime: now
            };

            if (dryRun) {
              console.log(`[DRY RUN] 将要创建好友关系: 用户 ${user._id} -> 好友 ${friendId}`);
            } else {
              // 实际创建好友关系
              await db.collection('friendships').add({
                data: friendshipData
              });
              console.log(`成功创建好友关系: 用户 ${user._id} -> 好友 ${friendId}`);
            }

            userMigratedCount++;
            migratedCount++;
          }

          console.log(`用户 ${user._id} 处理完成，共${userFriendCount}个好友，成功迁移${userMigratedCount}个`);

        } catch (userErr) {
          errorCount++;
          const errorMsg = `处理用户 ${user._id} 时出错: ${userErr.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // 为了避免云函数超时，每处理一批休息1秒
      if (users.length === batchSize) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log(`好友关系数据迁移完成`);
    console.log(`总处理用户数: ${processedCount}`);
    console.log(`成功迁移好友关系数: ${migratedCount}`);
    console.log(`迁移失败数: ${errorCount}`);
    console.log(`总耗时: ${duration}秒`);

    if (dryRun) {
      console.log('注意：本次执行是测试模式，未实际修改数据库');
    }

    return {
      success: true,
      message: '好友关系数据迁移完成',
      dryRun: dryRun,
      statistics: {
        processedUsers: processedCount,
        migratedRelations: migratedCount,
        errorCount: errorCount,
        durationSeconds: duration
      },
      errors: errors
    };

  } catch (error) {
    console.error('好友关系数据迁移失败:', error);
    return {
      success: false,
      message: '好友关系数据迁移失败',
      error: error.message,
      processedCount: processedCount,
      migratedCount: migratedCount,
      errorCount: errorCount,
      errors: errors
    };
  }
};

/**
 * 迁移后清理函数
 * 可选：从users集合中移除friends字段
 * @param {Object} event - 事件参数
 * @param {Boolean} event.dryRun - 是否仅测试不实际执行清理
 * @param {Object} context - 上下文
 * @returns {Object} 返回清理结果
 */
exports.cleanup = async (event, context) => {
  const { dryRun = true } = event;
  let processedCount = 0;
  let cleanedCount = 0;
  let errorCount = 0;

  try {
    console.log(`开始执行好友关系数据清理，dryRun: ${dryRun}`);

    // 查询所有有friends字段的用户
    const usersResult = await db.collection('users')
      .where({
        friends: _.exists(true)
      })
      .field({
        _id: true
      })
      .get();

    const users = usersResult.data;
    processedCount = users.length;

    // 批量更新用户，移除friends字段
    if (users.length > 0) {
      for (const user of users) {
        try {
          if (dryRun) {
            console.log(`[DRY RUN] 将要从用户 ${user._id} 移除friends字段`);
          } else {
            await db.collection('users').doc(user._id).update({
              data: {
                friends: _.remove()
              }
            });
            console.log(`成功从用户 ${user._id} 移除friends字段`);
          }
          cleanedCount++;
        } catch (userErr) {
          errorCount++;
          console.error(`从用户 ${user._id} 移除friends字段时出错:`, userErr);
        }
      }
    }

    console.log(`好友关系数据清理完成`);
    console.log(`总处理用户数: ${processedCount}`);
    console.log(`成功清理用户数: ${cleanedCount}`);
    console.log(`清理失败数: ${errorCount}`);

    if (dryRun) {
      console.log('注意：本次执行是测试模式，未实际修改数据库');
    }

    return {
      success: true,
      message: '好友关系数据清理完成',
      dryRun: dryRun,
      statistics: {
        processedUsers: processedCount,
        cleanedUsers: cleanedCount,
        errorCount: errorCount
      }
    };

  } catch (error) {
    console.error('好友关系数据清理失败:', error);
    return {
      success: false,
      message: '好友关系数据清理失败',
      error: error.message,
      processedCount: processedCount,
      cleanedCount: cleanedCount,
      errorCount: errorCount
    };
  }
};