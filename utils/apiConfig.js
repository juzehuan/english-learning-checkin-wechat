// API配置文件
// 后端服务基础URL
// 注意：在微信小程序开发中，不能直接使用localhost，需要使用实际IP地址
// 请将下面的IP地址替换为您本地电脑的实际IP地址
const BASE_URL = 'https://express-289r-187125-9-1305632701.sh.run.tcloudbase.com/api';

// API接口路径配置
const API = {
  // 用户接口
  USER: {
    CREATE_OR_UPDATE: `${BASE_URL}/users`,
    GET_BY_OPENID: `${BASE_URL}/users/`, // 需拼接openid
    UPDATE_POINTS: `${BASE_URL}/users/`, // 需拼接id/points
    UPDATE: `${BASE_URL}/users/update`,
    UPLOAD_AVATAR: `${BASE_URL}/users/uploadAvatar`,
    WX_LOGIN: `${BASE_URL}/users/wxlogin`
  },

  // 打卡接口
  SIGNIN: {
    DAILY_SIGNIN: `${BASE_URL}/signin`,
    GET_HISTORY: `${BASE_URL}/signin/`, // 需拼接openid/history
    USE_SKIP_CARD: `${BASE_URL}/signin/skip`,
    GET_STATS: `${BASE_URL}/signin/` // 需拼接openid/stats
  },

  // 抽背记录接口
  QUIZ: {
    RECORD_RESULT: `${BASE_URL}/quiz`, // 同时作为CREATE_RECORD使用
    USE_SKIP_QUIZ: `${BASE_URL}/quiz/skip`,
    GET_HISTORY: `${BASE_URL}/quiz/` // 需拼接openid/history
  },

  // 好友关系接口
  FRIEND: {
    SEND_REQUEST: `${BASE_URL}/friend/sendRequest`,
    ACCEPT_REQUEST: `${BASE_URL}/friend/acceptRequest`,
    REJECT_REQUEST: `${BASE_URL}/friend/rejectRequest`,
    DELETE_FRIEND: `${BASE_URL}/friend/deleteFriend`,
    GET_FRIENDS: `${BASE_URL}/friend/getFriends/`, // 需拼接openid或使用查询参数
    GET_REQUESTS: `${BASE_URL}/friend/getRequests/`, // 需拼接openid或使用查询参数
    CHECK_RELATION: `${BASE_URL}/friend/checkRelation/` // 需拼接openid/targetUserId
  },

  // 统计接口
  STATISTICS: {
    GET_BY_USER: `${BASE_URL}/statistics/user`
  }
};

// 封装wx.request方法
function request(method, url, data = {}, showLoading = true) {
  return new Promise((resolve, reject) => {
    if (showLoading) {
      wx.showLoading({
        title: '加载中...',
      });
    }

    wx.request({
      url: url,
      method: method,
      data: data,
      header: {
        'content-type': 'application/json',
      },
      // 解决自签名证书问题
      enableHttp2: true,
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