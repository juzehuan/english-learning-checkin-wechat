// 好友详情页面逻辑
Page({
  data: {
    friendId: '',
    friendInfo: null,
    loading: true,
    quizzes: [],
    showQuizList: false
  },

  onLoad: function(options) {
    if (options.id) {
      this.setData({
        friendId: options.id
      });
      this.fetchFriendInfo();
    }
  },

  /**
   * 获取好友详细信息
   */
  fetchFriendInfo: function() {
    const db = wx.cloud.database();
    const friendId = this.data.friendId;

    wx.showLoading({
      title: '加载中...',
    });

    db.collection('users').doc(friendId).get({
      success: res => {
        this.setData({
          friendInfo: res.data,
          loading: false
        });
        wx.hideLoading();
      },
      fail: err => {
        console.error('[数据库] [查询好友信息] 失败：', err);
        wx.hideLoading();
        wx.showToast({
          title: '获取好友信息失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 查看好友抽背记录
   */
  toggleQuizList: function() {
    if (!this.data.showQuizList) {
      this.fetchFriendQuizzes();
    }
    this.setData({
      showQuizList: !this.data.showQuizList
    });
  },

  /**
   * 获取好友抽背记录
   */
  fetchFriendQuizzes: function() {
    const db = wx.cloud.database();
    const _ = db.command;
    const friendId = this.data.friendId;
    
    // 获取最近的10条抽背记录
    db.collection('quizzes').where({
      userId: friendId,
      role: '答题者'
    }).orderBy('date', 'desc').limit(10).get({
      success: res => {
        this.setData({
          quizzes: res.data
        });
      },
      fail: err => {
        console.error('[数据库] [查询抽背记录] 失败：', err);
        wx.showToast({
          title: '获取抽背记录失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 删除好友 - 使用新的deleteFriend操作
   */
  deleteFriend: function() {
    const friendId = this.data.friendId;
    const friendName = this.data.friendInfo?.nickName || '未设置昵称';

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
                
                // 返回上一页
                setTimeout(() => {
                  wx.navigateBack();
                }, 1500);
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
   * 返回上一页
   */
  navigateBack: function() {
    wx.navigateBack();
  },

  /**
   * 格式化日期
   */
  formatDate: function(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 计算正确率
   */
  calculateAccuracy: function(correctCount, wrongCount) {
    correctCount = correctCount || 0;
    wrongCount = wrongCount || 0;
    const total = correctCount + wrongCount;
    if (total === 0) return 0;
    return Math.round((correctCount / total) * 100);
  },

  /**
   * 获取抽背状态文本
   */
  getQuizStatus: function(correctCount, wrongCount) {
    correctCount = correctCount || 0;
    wrongCount = wrongCount || 0;
    
    if (correctCount === 10 && wrongCount === 0) {
      return '满分';
    } else if (wrongCount === 0) {
      return '全对';
    } else if (correctCount >= 8) {
      return '优秀';
    } else if (correctCount >= 6) {
      return '良好';
    } else if (correctCount >= 4) {
      return '一般';
    } else {
      return '需要加油';
    }
  }
});