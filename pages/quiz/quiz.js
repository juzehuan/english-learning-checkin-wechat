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
   * 获取好友列表
   */
  fetchFriendList: function() {
    wx.showLoading({
      title: '加载好友列表...',
    });
    
    wx.cloud.callFunction({
      name: 'friendRelation',
      data: {
        action: 'getFriends'
      },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          const friends = res.result.friends || [];
          this.setData({
            friendList: friends
          });
          // 更新全局好友列表
          getApp().globalData.friendList = friends;
        } else {

          wx.showToast({
            title: '获取好友列表失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 获取用户特权信息
   */
  fetchUserPrivileges: function() {
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo._id) {
      return;
    }
    
    const db = wx.cloud.database();
    db.collection('users').doc(app.globalData.userInfo._id).get({
      success: res => {
        this.setData({
          skipQuizCount: res.data.skipQuizCount || 0,
          canUseSkipQuiz: (res.data.skipQuizCount || 0) > 0
        });
      },
      fail: err => {
      }
    });
  },

  /**
   * 选择好友
   */
  selectFriend: function(e) {
    const friendId = e.currentTarget.dataset.id;
    const friendName = e.currentTarget.dataset.name;
    
    // 确保friendId是openid格式
    if (!friendId || typeof friendId !== 'string') {
      return;
    }
    
    this.setData({
      selectedFriendId: friendId,
      selectedFriendName: friendName,
      // 重置输入
      correctCount: 0,
      wrongCount: 0
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
    const { correctCount, wrongCount, selectedFriendId, selectedFriendName } = this.data;
    

    
    // 输入验证
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
        friendId: selectedFriendId,
        role: '提问者'
      },
      success: res => {
        wx.hideLoading();
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '记录成功！',
            icon: 'success'
          });
          // 重置表单并返回
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {

          wx.showToast({
            title: res.result?.message || '提交失败',
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: err => {
        wx.hideLoading();

        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 去添加好友页面
   */
  goToFriendPage: function() {
    wx.navigateTo({
      url: '/pages/friend/manage'
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
    
    // 调用使用免抽背特权的云函数
    wx.cloud.callFunction({
      name: 'useSkipQuiz',
      data: {},
      success: result => {
        wx.hideLoading();
        
        if (result.result && result.result.success) {
          wx.showToast({
            title: '使用成功',
            icon: 'success'
          });
          // 更新特权数量
          this.setData({
            skipQuizCount: result.result.skipQuizCount,
            canUseSkipQuiz: result.result.skipQuizCount > 0
          });
          // 更新全局用户信息
          getApp().globalData.userInfo.skipQuizCount = result.result.skipQuizCount;
          // 延迟返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: result.result?.message || '使用失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();

        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  }
});