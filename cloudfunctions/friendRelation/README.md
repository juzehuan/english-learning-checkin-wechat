# 好友关系管理云函数

本云函数实现了完整的好友关系管理功能，使用独立的`friendships`集合代替原有的用户表中的`friends`字段。

## 功能概述

- **发送好友请求**
- **接受好友请求**
- **拒绝好友请求**
- **删除好友**
- **获取好友列表**
- **获取好友请求列表**
- **检查用户间关系**

## 数据结构设计

### friendships 集合
```json
{
  "_id": "请求ID",
  "userId": "发送请求的用户ID",
  "friendId": "接收请求的用户ID",
  "status": "请求状态（pending/accepted/rejected）",
  "message": "好友请求消息",
  "requestTime": "请求发送时间",
  "acceptTime": "请求接受时间（仅accepted状态有）",
  "rejectTime": "请求拒绝时间（仅rejected状态有）",
  "updateTime": "最后更新时间"
}
```

## 调用方式

### 1. 发送好友请求

```javascript
wx.cloud.callFunction({
  name: 'friendRelation',
  data: {
    action: 'sendRequest',
    targetUserId: '目标用户ID',
    customMessage: '自定义请求消息（可选）'
  },
  success: res => {
    console.log('好友请求发送成功', res.result);
  },
  fail: err => {
    console.error('发送好友请求失败', err);
  }
});
```

### 2. 接受好友请求

```javascript
wx.cloud.callFunction({
  name: 'friendRelation',
  data: {
    action: 'acceptRequest',
    requestId: '好友请求ID'
  },
  success: res => {
    console.log('好友请求接受成功', res.result);
  },
  fail: err => {
    console.error('接受好友请求失败', err);
  }
});
```

### 3. 拒绝好友请求

```javascript
wx.cloud.callFunction({
  name: 'friendRelation',
  data: {
    action: 'rejectRequest',
    requestId: '好友请求ID'
  },
  success: res => {
    console.log('好友请求拒绝成功', res.result);
  },
  fail: err => {
    console.error('拒绝好友请求失败', err);
  }
});
```

### 4. 删除好友

```javascript
wx.cloud.callFunction({
  name: 'friendRelation',
  data: {
    action: 'deleteFriend',
    targetUserId: '好友用户ID'
  },
  success: res => {
    console.log('删除好友成功', res.result);
  },
  fail: err => {
    console.error('删除好友失败', err);
  }
});
```

### 5. 获取好友列表

```javascript
wx.cloud.callFunction({
  name: 'friendRelation',
  data: {
    action: 'getFriends'
  },
  success: res => {
    if (res.result.success) {
      console.log('好友列表', res.result.friends);
    }
  },
  fail: err => {
    console.error('获取好友列表失败', err);
  }
});
```

### 6. 获取好友请求列表

```javascript
wx.cloud.callFunction({
  name: 'friendRelation',
  data: {
    action: 'getRequests'
  },
  success: res => {
    if (res.result.success) {
      console.log('好友请求列表', res.result.requests);
    }
  },
  fail: err => {
    console.error('获取好友请求列表失败', err);
  }
});
```

### 7. 检查用户间关系

```javascript
wx.cloud.callFunction({
  name: 'friendRelation',
  data: {
    action: 'checkRelation',
    targetUserId: '目标用户ID'
  },
  success: res => {
    if (res.result.success) {
      console.log('用户关系状态', res.result.relation);
      // relation可能的值: 'self', 'friend', 'request_sent', 'request_received', 'none'
    }
  },
  fail: err => {
    console.error('检查用户关系失败', err);
  }
});
```

## 迁移指南

### 从原有friends字段迁移到新的friendships集合

1. **创建friendships集合**：在云开发控制台创建`friendships`集合

2. **运行数据迁移脚本**：
   - 导出所有用户的friends字段数据
   - 为每对好友关系创建两个方向的friendships记录

3. **更新前端代码**：
   - 修改添加好友功能，使用`sendRequest`和`acceptRequest`操作
   - 修改获取好友列表功能，使用`getFriends`操作
   - 修改删除好友功能，使用`deleteFriend`操作

4. **逐步废弃users集合中的friends字段**

## 优势

1. **更完整的好友功能**：支持好友请求、验证和拒绝流程

2. **更好的数据分离**：好友关系独立存储，不与用户基本信息混合

3. **更灵活的查询能力**：可以方便地按时间、状态等条件查询好友关系

4. **更好的扩展性**：未来可以轻松添加更多好友相关功能，如好友分组、备注等

## 注意事项

1. 使用前确保在云开发控制台创建了`friendships`集合

2. 确保云函数已正确部署并配置了适当的数据库权限

3. 迁移过程中注意保持数据一致性

4. 建议在非高峰期进行数据迁移