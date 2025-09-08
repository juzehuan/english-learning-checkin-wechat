// 好友管理页面逻辑
Page({
  data: {
    friends: [],
    searchUserId: '',
    loading: true,
    userInfo: null,
    friendRequests: [], // 新增：好友请求列表
    showRequests: false // 新增：是否显示好友请求
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
    this.fetchFriendRequests(); // 新增：获取好友请求
  },

  onShow: function() {
    // 页面显示时刷新好友列表和好友请求
    this.fetchFriendList();
    this.fetchFriendRequests();
  },

  /**
   * 获取好友列表 - 使用新的getFriends操作
   */
  fetchFriendList: function() {
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'friendRelation',
      data: {
        action: 'getFriends'
      },
      success: res => {
        console.log('[云函数] [getFriends] 成功：', res.result);
        this.setData({
          friends: res.result.data || [],
          loading: false
        });
      },
      fail: err => {
        console.error('[云函数] [getFriends] 失败：', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '获取好友列表失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 新增：获取好友请求列表
   */
  fetchFriendRequests: function() {
    wx.cloud.callFunction({
      name: 'friendRelation',
      data: {
        action: 'getRequests'
      },
      success: res => {
        console.log('[云函数] [getRequests] 成功：', res.result);
        this.setData({
          friendRequests: res.result.data || []
        });
      },
      fail: err => {
        console.error('[云函数] [getRequests] 失败：', err);
      }
    });
  },

  /**
   * 新增：显示/隐藏好友请求
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
    console.log('输入框内容变化:', e.detail.value);
    this.setData({
      searchUserId: e.detail.value
    });
  },

  /**
   * 添加好友 - 使用新的sendRequest操作
   */
  addFriend: function() {
    console.log('addFriend方法被调用');
    
    const targetUserId = this.data.searchUserId.trim();
    const userId = getApp().globalData.userInfo._id;

    console.log('好友ID:', targetUserId);
    
    if (!targetUserId) {
      wx.showToast({
        title: '请输入好友ID',
        icon: 'none'
      });
      return;
    }

    if (targetUserId === userId) {
      wx.showToast({
        title: '不能添加自己为好友',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '发送请求中...',
    });

    wx.cloud.callFunction({
      name: 'friendRelation',
      data: {
        action: 'sendRequest',
        targetUserId: targetUserId
      },
      success: res => {
        console.log('[云函数] [sendRequest] 成功：', res.result);
        wx.hideLoading();
        
        if (res.result.success) {
          wx.showToast({
            title: res.result.message || '好友请求已发送',
            icon: 'success'
          });
          
          // 清空输入框
          this.setData({ searchUserId: '' });
          
          // 刷新好友请求列表
          this.fetchFriendRequests();
        } else {
          wx.showToast({
            title: res.result.message || '发送请求失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('[云函数] [sendRequest] 失败：', err);
        wx.hideLoading();
        wx.showToast({
          title: '发送请求失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 新增：接受好友请求
   */
  acceptFriendRequest: function(e) {
    const requestId = e.currentTarget.dataset.id;
    
    wx.showLoading({
      title: '处理中...',
    });

    wx.cloud.callFunction({
      name: 'friendRelation',
      data: {
        action: 'acceptRequest',
        requestId: requestId
      },
      success: res => {
        console.log('[云函数] [acceptRequest] 成功：', res.result);
        wx.hideLoading();
        
        if (res.result.success) {
          wx.showToast({
            title: '已添加为好友',
            icon: 'success'
          });
          
          // 刷新好友列表和请求列表
          this.fetchFriendList();
          this.fetchFriendRequests();
        } else {
          wx.showToast({
            title: res.result.message || '处理失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('[云函数] [acceptRequest] 失败：', err);
        wx.hideLoading();
        wx.showToast({
          title: '处理失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 新增：拒绝好友请求
   */
  rejectFriendRequest: function(e) {
    const requestId = e.currentTarget.dataset.id;
    
    wx.showLoading({
      title: '处理中...',
    });

    wx.cloud.callFunction({
      name: 'friendRelation',
      data: {
        action: 'rejectRequest',
        requestId: requestId
      },
      success: res => {
        console.log('[云函数] [rejectRequest] 成功：', res.result);
        wx.hideLoading();
        
        if (res.result.success) {
          wx.showToast({
            title: '已拒绝请求',
            icon: 'success'
          });
          
          // 刷新请求列表
          this.fetchFriendRequests();
        } else {
          wx.showToast({
            title: res.result.message || '处理失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('[云函数] [rejectRequest] 失败：', err);
        wx.hideLoading();
        wx.showToast({
          title: '处理失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 删除好友 - 使用新的deleteFriend操作
   */
  deleteFriend: function(e) {
    const friendId = e.currentTarget.dataset.id;
    const friendName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '删除好友',
      content: `确定要删除好友 ${friendName} 吗？`,
      success: modalRes => {
        if (modalRes.confirm) {
          wx.showLoading({
            title: '删除中...',
          });

          wx.cloud.callFunction({
            name: 'friendRelation',
            data: {
              action: 'deleteFriend',
              friendId: friendId
            },
            success: res => {
              console.log('[云函数] [deleteFriend] 成功：', res.result);
              wx.hideLoading();
              
              if (res.result.success) {
                wx.showToast({
                  title: '删除好友成功',
                  icon: 'success'
                });
                
                // 刷新好友列表
                this.fetchFriendList();
              } else {
                wx.showToast({
                  title: res.result.message || '删除失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              console.error('[云函数] [deleteFriend] 失败：', err);
              wx.hideLoading();
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
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
    if (!this.data.userInfo || !this.data.userInfo._id) {
      wx.showToast({
        title: '获取用户ID失败',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: this.data.userInfo._id,
      success: res => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      },
      fail: err => {
        console.error('[复制] 失败：', err);
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