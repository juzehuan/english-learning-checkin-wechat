// 抽背记录页面逻辑
Page({
  data: {
    correctCount: 0,
    wrongCount: 0,
    friendList: [],
    selectedFriendId: '',
    selectedFriendName: '',
    canUseSkipQuiz: false,
    skipQuizCount: 0
  },

  onLoad: function() {
    this.fetchFriendList();
    this.fetchUserPrivileges();
  },

  /**
   * 获取好友列表 - 通过调用friendRelation云函数
   */
  fetchFriendList: function() {
    wx.cloud.callFunction({
      name: 'friendRelation',
      data: {
        action: 'getFriends'
      },
      success: res => {
        console.log('[云函数] [getFriends] 成功：', res.result);
        if (res.result.success) {
          this.setData({
            friendList: res.result.friends || []
          });
          console.log('[获取好友列表] 好友数量：', (res.result.friends || []).length);
          // 同时更新全局好友列表
          getApp().globalData.friendList = res.result.friends || [];
        } else {
          console.error('[云函数] [getFriends] 失败：', res.result.message);
          wx.showToast({
            title: '获取好友列表失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('[云函数] [friendRelation] 调用失败：', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 获取用户特权
   */
  fetchUserPrivileges: function() {
    const db = wx.cloud.database();
    db.collection('users').doc(getApp().globalData.userInfo._id).get({
      success: res => {
        this.setData({
          skipQuizCount: res.data.skipQuizCount || 0,
          canUseSkipQuiz: (res.data.skipQuizCount || 0) > 0
        });
      },
      fail: err => {
        console.error('[数据库] [查询用户特权] 失败：', err);
      }
    });
  },



  /**
   * 选择好友
   */
  selectFriend: function(e) {
    const friendId = e.currentTarget.dataset.id;
    const friendName = e.currentTarget.dataset.name;
    this.setData({
      selectedFriendId: friendId,
      selectedFriendName: friendName
    });
  },

  /**
   * 清除好友选择
   */
  clearFriendSelection: function() {
    this.setData({
      selectedFriendId: '',
      selectedFriendName: '',
      correctCount: 0,
      wrongCount: 0
    });
  },

  /**
   * 输入正确数量
   */
  onCorrectCountInput: function(e) {
    let value = parseInt(e.detail.value);
    if (isNaN(value)) value = 0;
    if (value > 10) value = 10;
    if (value < 0) value = 0;
    this.setData({
      correctCount: value
    });
  },

  /**
   * 输入错误数量
   */
  onWrongCountInput: function(e) {
    let value = parseInt(e.detail.value);
    if (isNaN(value)) value = 0;
    if (value > 10) value = 10;
    if (value < 0) value = 0;
    this.setData({
      wrongCount: value
    });
  },

  /**
   * 提交抽背结果
   */
  submitQuiz: function() {
    const { correctCount, wrongCount, selectedFriendId } = this.data;
    
    // 验证输入
    if (!selectedFriendId) {
      wx.showToast({
        title: '请先选择要打分的好友',
        icon: 'none'
      });
      return;
    }

    if (correctCount === 0 && wrongCount === 0) {
      wx.showToast({
        title: '请输入抽背结果',
        icon: 'none'
      });
      return;
    }

    if (correctCount + wrongCount > 10) {
      wx.showToast({
        title: '正确数和错误数之和不能超过10',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中...',
    });

    // 调用云函数记录抽背结果
    wx.cloud.callFunction({
      name: 'recordQuiz',
      data: {
        correctCount: correctCount,
        wrongCount: wrongCount,
        friendId: selectedFriendId || null
      },
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({
            title: '记录成功！',
            icon: 'success'
          });
          // 重置表单
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.result.message || '提交失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '提交失败',
          icon: 'none'
        });
        console.error('[云函数] [recordQuiz] 调用失败：', err);
      }
    });
  },

  /**
   * 使用免抽背特权
   */
  useSkipQuiz: function() {
    if (!this.data.canUseSkipQuiz) {
      wx.showToast({
        title: '您没有免抽背特权',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认使用免抽背特权',
      content: '使用后可跳过本次抽背任务，是否确认使用？',
      success: res => {
        if (res.confirm) {
          this.processSkipQuiz();
        }
      }
    });
  },

  /**
   * 处理免抽背特权使用
   */
  processSkipQuiz: function() {
    wx.showLoading({
      title: '处理中...',
    });

    wx.cloud.callFunction({
      name: 'useSkipQuiz',
      data: {},
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          this.setData({
            skipQuizCount: res.result.skipQuizCount,
            canUseSkipQuiz: res.result.skipQuizCount > 0
          });
          wx.showToast({
            title: '免抽背特权使用成功',
            icon: 'success'
          });
          // 更新全局用户信息
          getApp().globalData.userInfo.skipQuizCount = res.result.skipQuizCount;
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.result.message || '操作失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
        console.error('[云函数] [useSkipQuiz] 调用失败：', err);
      }
    });
  },
  
  /**
   * 跳转到好友管理页面
   */
  goToFriendPage: function() {
    wx.navigateTo({
      url: '/pages/friend/manage'
    })
  }
});