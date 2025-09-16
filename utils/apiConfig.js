// API配置文件
// 后端服务基础URL
const BASE_URL = 'http://localhost:3000/api';

// API接口路径配置
const API = {
  // 用户接口
  USER: {
    CREATE_OR_UPDATE: `${BASE_URL}/users`,
    GET_BY_OPENID: `${BASE_URL}/users/`, // 需拼接openid
    UPDATE_POINTS: `${BASE_URL}/users/`, // 需拼接id/points
    UPDATE: `${BASE_URL}/users/update`,
    UPLOAD_AVATAR: `${BASE_URL}/users/uploadAvatar`
  },

  // 打卡接口
  SIGNIN: {
    DAILY_SIGNIN: `${BASE_URL}/signin`,
    GET_HISTORY: `${BASE_URL}/signin/`, // 需拼接openid/history
    USE_SKIP_CARD: `${BASE_URL}/signin/skip`
  },

  // 抽背记录接口
  QUIZ: {
    RECORD_RESULT: `${BASE_URL}/quiz`,
    USE_SKIP_QUIZ: `${BASE_URL}/quiz/skip`,
    GET_HISTORY: `${BASE_URL}/quiz/`, // 需拼接openid/history
    CREATE_RECORD: `${BASE_URL}/quiz/create`
  },

  // 好友关系接口
  FRIEND: {
    SEND_REQUEST: `${BASE_URL}/friend/sendRequest`,
    ACCEPT_REQUEST: `${BASE_URL}/friend/acceptRequest`,
    REJECT_REQUEST: `${BASE_URL}/friend/rejectRequest`,
    DELETE_FRIEND: `${BASE_URL}/friend/deleteFriend`,
    GET_FRIENDS: `${BASE_URL}/friend/getFriends/`, // 需拼接openid
    GET_REQUESTS: `${BASE_URL}/friend/getRequests/`, // 需拼接openid
    CHECK_RELATION: `${BASE_URL}/friend/checkRelation/`, // 需拼接openid/targetUserId
    GET_FRIEND_LIST: `${BASE_URL}/friend/getFriendList`,
    GET_FRIEND_REQUESTS: `${BASE_URL}/friend/getFriendRequests`
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
      success: (res) => {
        if (showLoading) {
          wx.hideLoading();
        }

        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`请求失败，状态码: ${res.statusCode}`));
          wx.showToast({
            title: res.data?.message || '请求失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        if (showLoading) {
          wx.hideLoading();
        }
        reject(err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
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