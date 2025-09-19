// API配置文件
// 使用微信云托管服务
// 云托管服务名称
const SERVICE_NAME = 'express-289r'; // 请替换为您的云托管服务名称
// API基础路径前缀 - 需要包含/api前缀以匹配后端路由定义
const API = {
  // 用户接口
  USER: {
    CREATE_OR_UPDATE: '/api/users',
    GET_BY_OPENID: '/api/users/', // 需拼接openid
    UPDATE_POINTS: '/api/users/', // 需拼接id/points
    UPDATE: '/api/users/update',
    UPLOAD_AVATAR: '/api/users/uploadAvatar',
    WX_LOGIN: '/api/users/wxlogin'
  },

  // 打卡接口
  SIGNIN: {
    DAILY_SIGNIN: '/api/signin',
    GET_HISTORY: '/api/signin/', // 需拼接openid/history
    USE_SKIP_CARD: '/api/signin/skip',
    GET_STATS: '/api/signin/' // 需拼接openid/stats
  },

  // 抽背记录接口
  QUIZ: {
    RECORD_RESULT: '/api/quiz', // 同时作为CREATE_RECORD使用
    USE_SKIP_QUIZ: '/api/quiz/skip',
    GET_HISTORY: '/api/quiz/' // 需拼接openid/history
  },

  // 好友关系接口
  FRIEND: {
    SEND_REQUEST: '/api/friend/sendRequest',
    ACCEPT_REQUEST: '/api/friend/acceptRequest',
    REJECT_REQUEST: '/api/friend/rejectRequest',
    DELETE_FRIEND: '/api/friend/deleteFriend',
    GET_FRIENDS: '/api/friend/getFriends/', // 需拼接openid或使用查询参数
    GET_REQUESTS: '/api/friend/getRequests/', // 需拼接openid或使用查询参数
    CHECK_RELATION: '/api/friend/checkRelation/' // 需拼接openid/targetUserId
  },

  // 统计接口
  STATISTICS: {
    GET_BY_USER: '/api/statistics/user'
  }
};

// 使用微信云托管的callContainer方法
function request(method, url, data = {}, showLoading = true) {
  return new Promise((resolve, reject) => {
    if (showLoading) {
      wx.showLoading({
        title: '加载中...',
      });
    }

    wx.cloud.callContainer({
      config: {
        env: 'prod-0g4esjft4f388f06' // 请替换为您的云托管环境ID
      },
      path: url,
      method: method,
      data: data,
      header: {
        'content-type': 'application/json',
        'X-WX-SERVICE': SERVICE_NAME,
      },
      success: (res) => {
        if (showLoading) {
          wx.hideLoading();
        }

        // 根据HTTP状态码处理响应
        const responseData = res.data;

        // 检查是否是统一响应格式 (包含code、message、data字段)
        if (responseData && 'code' in responseData && 'message' in responseData && 'data' in responseData) {
          // 转换为前端代码期望的格式
          const formattedResponse = {};

          // 200系列状态码且code=0表示成功
          formattedResponse.success = (res.statusCode >= 200 && res.statusCode < 300) && responseData.code === 0;

          // 保持message字段
          formattedResponse.message = responseData.message;

          // 将data中的所有内容展开到顶层
          if (responseData.data !== null && typeof responseData.data === 'object') {
            Object.assign(formattedResponse, responseData.data);
          }

          // 传递原始code和statusCode，便于高级处理
          formattedResponse.code = responseData.code;
          formattedResponse.statusCode = res.statusCode;

          resolve(formattedResponse);
        } else {
          // 对于非统一格式的响应，保持原有逻辑
          resolve(responseData);
        }
      },
      fail: (err) => {
        if (showLoading) {
          wx.hideLoading();
        }
        // 只reject Promise，不直接显示Toast，让调用方自己决定如何处理错误
        reject(err);
      }
    });
  });
}

// 快捷方法
const api = {
  get: (url, data = {}, showLoading = true) => request('GET', url, data, showLoading),
  post: (url, data = {}, showLoading = true) => request('POST', url, data, showLoading),
  put: (url, data = {}, showLoading = true) => request('PUT', url, data, showLoading),
  delete: (url, data = {}, showLoading = true) => request('DELETE', url, data, showLoading)
};

// 使用CommonJS导出方式，适配微信小程序
module.exports = {
  API,
  api,
  request
};