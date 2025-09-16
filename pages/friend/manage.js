/**
// 导入API配置
const { api, API } = require('../../utils/apiConfig');

/**
 * 格式化日期时间
 * @param {Date|String} date - 日期对象或日期字符串
 * @returns {String} 格式化后的日期字符串
 */
function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

Page({
  data: {
    friends: [],
    searchUserId: '',
    loading: true,
    userInfo: null,
    friendRequests: [], // 好友请求列表
    showRequests: true // 好友请求默认显示
  },

  onLoad: function() {
    // 获取全局用户信息并设置到页面数据中
    const app = getApp();
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo
      });
    }
    this.fetchFriendList();
    this.fetchFriendRequests(); // 获取好友请求
  },

  onShow: function() {
    console.log('当前用户信息:', getApp().globalData.userInfo);
    // 页面显示时刷新好友列表和好友请求
    this.fetchFriendList();
    this.fetchFriendRequests();
  },

  /**
   * 获取好友列表
   */
  fetchFriendList: function() {
    this.setData({ loading: true });
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      this.setData({ loading: false });
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    api.get(API.FRIEND.GET_FRIENDS, {
      openid: app.globalData.userInfo.openid
    }).then(res => {
      console.log('[API] [getFriends] 成功：', res);
      this.setData({
        friends: res.friends || [],
        loading: false
      });
    }).catch(err => {
      console.error('[API] [getFriends] 失败：', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '获取好友列表失败',
        icon: 'none'
      });
    });
  },

  /**
   * 获取好友请求列表
   */
  fetchFriendRequests: function() {
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    api.get(API.FRIEND.GET_REQUESTS, {
      openid: app.globalData.userInfo.openid
    }).then(res => {
      if (res.success) {
        // 格式化日期
        const formattedRequests = (res.requests || []).map(request => ({
          ...request,
          requestTime: formatDate(request.requestTime)
        }));

        this.setData({
          friendRequests: formattedRequests
        });
        
        // 如果请求列表为空，提示用户
        if (formattedRequests.length === 0) {
          wx.showToast({
            title: '当前没有好友请求',
            icon: 'none'
          });
        }
      } else {
        wx.showToast({
          title: res.message || '获取好友请求失败',
          icon: 'error'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '获取好友请求失败',
        icon: 'error'
      });
    });
  },

  /**
   * 显示/隐藏好友请求
   */
  toggleFriendRequests: function() {
    this.setData({
      showRequests: !this.data.showRequests
    });
  },

  /**
   * 输入框内容变化
   */
  onInputChange: function(e) {
    this.setData({
      searchUserId: e.detail.value
    });
  },

  /**
   * 添加好友
   */
  addFriend: function() {
    const targetUserId = this.data.searchUserId.trim();
    const app = getApp();
    
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (!targetUserId) {
      wx.showToast({
        title: '请输入好友ID',
        icon: 'none'
      });
      return;
    }

    if (targetUserId === app.globalData.userInfo.openid) {
      wx.showToast({
        title: '不能添加自己为好友',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '发送请求中...',
    });

    api.post(API.FRIEND.SEND_REQUEST, {
      openid: app.globalData.userInfo.openid,
      targetOpenid: targetUserId
    }).then(res => {
      wx.hideLoading();

      if (res.success) {
        wx.showToast({
          title: res.message || '好友请求已发送',
          icon: 'success'
        });

        // 清空输入框
        this.setData({ searchUserId: '' });

        // 刷新好友请求列表
        this.fetchFriendRequests();
      } else {
        wx.showToast({
          title: res.message || '发送请求失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '发送请求失败',
        icon: 'none'
      });
    });
  },

  /**
   * 接受好友请求
   */
  acceptFriendRequest: function(e) {
    const requestId = e.currentTarget.dataset.id;
    const app = getApp();
    
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '处理中...',
    });

    api.post(API.FRIEND.ACCEPT_REQUEST, {
      openid: app.globalData.userInfo.openid,
      requestId: requestId
    }).then(res => {
      wx.hideLoading();

      if (res.success) {
        wx.showToast({
          title: '已添加为好友',
          icon: 'success'
        });

        // 刷新好友列表和请求列表
        this.fetchFriendList();
        this.fetchFriendRequests();
      } else {
        wx.showToast({
          title: res.message || '处理失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '处理失败',
        icon: 'none'
      });
    });
  },

  /**
   * 拒绝好友请求
   */
  rejectFriendRequest: function(e) {
    const requestId = e.currentTarget.dataset.id;
    const app = getApp();
    
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '处理中...',
    });

    api.post(API.FRIEND.REJECT_REQUEST, {
      openid: app.globalData.userInfo.openid,
      requestId: requestId
    }).then(res => {
      wx.hideLoading();

      if (res.success) {
        wx.showToast({
          title: '已拒绝请求',
          icon: 'success'
        });

        // 刷新请求列表
        this.fetchFriendRequests();
      } else {
        wx.showToast({
          title: res.message || '处理失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '处理失败',
        icon: 'none'
      });
    });
  },

  /**
   * 删除好友
   */
  deleteFriend: function(e) {
    const friendId = e.currentTarget.dataset.id;
    const friendName = e.currentTarget.dataset.name;
    const app = getApp();
    
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '删除好友',
      content: `确定要删除好友 ${friendName} 吗？`,
      success: modalRes => {
        if (modalRes.confirm) {
          wx.showLoading({
            title: '删除中...',
          });

          api.post(API.FRIEND.DELETE, {
            openid: app.globalData.userInfo.openid,
            friendOpenid: friendId
          }).then(res => {
            wx.hideLoading();

            if (res.success) {
              wx.showToast({
                title: '删除好友成功',
                icon: 'success'
              });

              // 刷新好友列表
              this.fetchFriendList();
            } else {
              wx.showToast({
                title: res.message || '删除失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  /**
   * 查看好友详情
   */
  viewFriendDetail: function(e) {
    const friendId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/friend/detail?id=${friendId}`
    });
  },

  /**
   * 复制用户ID到剪贴板
   */
  copyUserId: function() {
    if (!this.data.userInfo || !this.data.userInfo.openid) {
      wx.showToast({
        title: '获取用户ID失败',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: this.data.userInfo.openid,
      success: res => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      },
      fail: err => {
        wx.showToast({
          title: '复制失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 点击用户ID时显示提示
   */
  showCopyTip: function() {
    wx.showToast({
      title: '点击复制按钮可复制ID',
      icon: 'none',
      duration: 1500
    });
  }
});