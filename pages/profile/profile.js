// 个人信息页面逻辑
Page({
  data: {
    userInfo: {},
    score: 0,
    progress: {
      totalDays: 0,
      consecutiveDays: 0
    },
    friendCount: 0,
    privileges: {
      skipCardCount: 0,
      skipQuizCount: 0
    }
  },

  onLoad: function() {
    this.setData({
      userInfo: getApp().globalData.userInfo
    });
    this.fetchUserDetail();
  },

  onShow: function() {
    // 每次显示页面时刷新数据
    this.fetchUserDetail();
  },

  /**
   * 获取用户详细信息
   */
  fetchUserDetail: function() {
    const db = wx.cloud.database();
    const userId = getApp().globalData.userInfo._id;

    db.collection('users').doc(userId).get({
      success: res => {
        const userData = res.data;
        this.setData({
          score: userData.score || 0,
          progress: userData.progress || { totalDays: 0, consecutiveDays: 0 },
          friendCount: userData.friends ? userData.friends.length : 0,
          privileges: {
            skipCardCount: userData.skipCardCount || 0,
            skipQuizCount: userData.skipQuizCount || 0
          }
        });
        
        // 更新全局用户信息
        getApp().globalData.userInfo = userData;
      },
      fail: err => {
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
        console.error('[数据库] [查询用户信息] 失败：', err);
      }
    });
  },

  /**
   * 跳转到好友管理页面
   */
  navigateToFriendManage: function() {
    wx.navigateTo({
      url: '/pages/friend/manage'
    });
  },

  /**
   * 跳转到统计页面
   */
  navigateToStatistics: function() {
    wx.navigateTo({
      url: '/pages/statistics/statistics'
    });
  },

  /**
   * 查看积分规则
   */
  viewScoreRules: function() {
    wx.showModal({
      title: '积分规则',
      content: '📚 基础打卡：每日打卡+1分（最多7分/周）\n✅ 抽背全对（10/10）：+2分\n❌ 抽背错误：每错1个-1分\n⚠️ 缺卡惩罚：未打卡-2分',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  /**
   * 选择头像
   * 使用兼容旧版本的方式选择头像
   */
  chooseAvatar: function() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        // 获取选择的头像临时文件路径
        const avatarUrl = res.tempFilePaths[0];
        console.log('选择的头像:', avatarUrl);
        
        // 先更新本地用户信息显示
        const userInfo = {...that.data.userInfo};
        userInfo.avatarUrl = avatarUrl;
        that.setData({ userInfo });
        
        // 上传头像并更新用户信息
        that.uploadAvatarAndUpdateUserInfo(avatarUrl);
      },
      fail: function(err) {
        console.error('选择头像失败:', err);
        wx.showToast({
          title: '选择头像失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 上传头像并更新用户信息
   */
  uploadAvatarAndUpdateUserInfo: function(avatarFilePath) {
    const that = this;
    wx.showLoading({
      title: '上传中...',
    });
    
    // 生成一个唯一的文件名
    const timestamp = Date.now();
    const cloudPath = `avatars/${getApp().globalData.userInfo._id}_${timestamp}.png`;
    
    // 上传头像到云存储
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: avatarFilePath,
      success: res => {
        // 获取上传后的文件ID
        const fileID = res.fileID;
        console.log('头像上传成功，fileID:', fileID);
        
        // 调用云函数更新用户信息
        that.updateUserInfo({
          avatarUrl: fileID
        });
      },
      fail: err => {
        console.error('头像上传失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '更新头像失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 打开昵称编辑界面
   * 使用兼容旧版本的方式编辑昵称
   */
  openProfileEditor: function() {
    const that = this;
    const currentNickname = this.data.userInfo.nickName || '用户';
    
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: currentNickname,
      success: function(res) {
        if (res.confirm && res.content && res.content.trim() !== '') {
          const newNickname = res.content.trim();
          if (newNickname !== currentNickname) {
            // 调用云函数更新用户信息
            that.updateUserInfo({
              nickName: newNickname
            });
          }
        }
      },
      fail: function(err) {
        console.error('修改昵称失败:', err);
        wx.showToast({
          title: '更新昵称失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 使用wx.getUserProfile获取完整用户信息
   */
  getUserProfile: function() {
    const that = this;
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userProfile = res.userInfo;
        console.log('获取用户信息成功:', userProfile);
        
        // 调用云函数更新用户信息
        that.updateUserInfo({
          nickName: userProfile.nickName,
          avatarUrl: userProfile.avatarUrl,
          gender: userProfile.gender,
          province: userProfile.province,
          city: userProfile.city,
          country: userProfile.country
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 更新用户信息
   */
  updateUserInfo: function(userInfo) {
    const that = this;
    
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        userInfo: userInfo
      },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          console.log('用户信息更新成功:', res.result.user);
          
          // 更新本地和全局用户信息
          that.setData({
            userInfo: res.result.user
          });
          getApp().globalData.userInfo = res.result.user;
          
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
        } else {
          console.error('更新用户信息失败:', res.result);
          wx.showToast({
            title: res.result?.message || '更新失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('调用云函数失败:', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 重新登录
   */
  reLogin: function() {
    wx.showModal({
      title: '重新登录',
      content: '确定要重新登录吗？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          getApp().globalData.userInfo = null;
          getApp().globalData.isLoggedIn = false;
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  /**
   * 设置页面
   */
  navigateToSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/index'
    });
  }
});