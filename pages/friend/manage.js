// 好友管理页面逻辑
Page({
  data: {
    friends: [],
    searchUserId: '',
    loading: true,
    userInfo: null
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
  },

  /**
   * 获取好友列表
   */
  fetchFriendList: function() {
    const db = wx.cloud.database();
    const userId = getApp().globalData.userInfo._id;

    wx.showLoading({
      title: '加载中...',
    });

    // 获取当前用户的好友列表
    db.collection('users').doc(userId).get({
      success: res => {
        const userData = res.data;
        const friendIds = userData.friends || [];
        
        if (friendIds.length > 0) {
          // 根据好友ID获取好友详细信息
          db.collection('users').where({
            _id: db.command.in(friendIds)
          }).get({
            success: friendsRes => {
              this.setData({
                friends: friendsRes.data,
                loading: false
              });
              wx.hideLoading();
            },
            fail: err => {
              console.error('[数据库] [查询好友列表] 失败：', err);
              wx.hideLoading();
              wx.showToast({
                title: '获取好友列表失败',
                icon: 'none'
              });
              this.setData({ loading: false });
            }
          });
        } else {
          this.setData({ 
            friends: [],
            loading: false 
          });
          wx.hideLoading();
        }
      },
      fail: err => {
        console.error('[数据库] [查询用户信息] 失败：', err);
        wx.hideLoading();
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
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
    const db = wx.cloud.database();
    const userId = getApp().globalData.userInfo._id;
    const friendId = this.data.searchUserId.trim();

    if (!friendId) {
      wx.showToast({
        title: '请输入好友ID',
        icon: 'none'
      });
      return;
    }

    if (friendId === userId) {
      wx.showToast({
        title: '不能添加自己为好友',
        icon: 'none'
      });
      return;
    }

    // 检查好友是否已存在
    db.collection('users').doc(userId).get({
      success: res => {
        const userData = res.data;
        const friends = userData.friends || [];
        
        if (friends.includes(friendId)) {
          wx.showToast({
            title: '好友已存在',
            icon: 'none'
          });
          return;
        }

        // 检查好友是否存在
        db.collection('users').doc(friendId).get({
          success: friendRes => {
            // 更新当前用户的好友列表
            friends.push(friendId);
            
            db.collection('users').doc(userId).update({
              data: {
                friends: friends,
                updateTime: db.serverDate()
              },
              success: () => {
                // 也更新全局用户信息
                getApp().globalData.userInfo.friends = friends;
                
                wx.showToast({
                  title: '添加好友成功',
                  icon: 'success'
                });
                
                // 刷新好友列表
                this.fetchFriendList();
                this.setData({ searchUserId: '' });
              },
              fail: err => {
                console.error('[数据库] [更新好友列表] 失败：', err);
                wx.showToast({
                  title: '添加好友失败',
                  icon: 'none'
                });
              }
            });
          },
          fail: err => {
            console.error('[数据库] [查询好友信息] 失败：', err);
            wx.showToast({
              title: '用户不存在',
              icon: 'none'
            });
          }
        });
      },
      fail: err => {
        console.error('[数据库] [查询用户信息] 失败：', err);
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 删除好友
   */
  deleteFriend: function(e) {
    const db = wx.cloud.database();
    const userId = getApp().globalData.userInfo._id;
    const friendId = e.currentTarget.dataset.id;
    const friendName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '删除好友',
      content: `确定要删除好友 ${friendName} 吗？`,
      success: modalRes => {
        if (modalRes.confirm) {
          // 获取当前用户的好友列表
          db.collection('users').doc(userId).get({
            success: res => {
              const userData = res.data;
              const friends = userData.friends || [];
              
              // 从好友列表中删除
              const index = friends.indexOf(friendId);
              if (index > -1) {
                friends.splice(index, 1);
              }
              
              // 更新数据库
              db.collection('users').doc(userId).update({
                data: {
                  friends: friends,
                  updateTime: db.serverDate()
                },
                success: () => {
                  // 更新全局用户信息
                  getApp().globalData.userInfo.friends = friends;
                  
                  wx.showToast({
                    title: '删除好友成功',
                    icon: 'success'
                  });
                  
                  // 刷新好友列表
                  this.fetchFriendList();
                },
                fail: err => {
                  console.error('[数据库] [更新好友列表] 失败：', err);
                  wx.showToast({
                    title: '删除好友失败',
                    icon: 'none'
                  });
                }
              });
            },
            fail: err => {
              console.error('[数据库] [查询用户信息] 失败：', err);
              wx.showToast({
                title: '操作失败',
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