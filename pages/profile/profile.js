// 个人信息页面逻辑
// 导入API配置
const { api, API } = require('../../utils/apiConfig');
// 初始化云开发
const cloud = wx.cloud;
cloud.init({
  env: 'prod-0g4esjft4f388f06'
});
Page({
  data: {
    userInfo: {},
    score: 0,
    progress: {
      totalDays: 0,
      consecutiveDays: 0
    },
    privileges: {
      skipCardCount: 0,
      skipQuizCount: 0
    }
  },

  onLoad: function() {
    // 确保从全局数据初始化时也能正确处理字段映射
    const globalUserInfo = getApp().globalData.userInfo || {};
    const userInfoWithCorrectMapping = {
      ...globalUserInfo,
      nickName: globalUserInfo.nickname || globalUserInfo.nickName,
      _id: globalUserInfo._id || globalUserInfo.id
    };

    this.setData({
      userInfo: userInfoWithCorrectMapping
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
    const app = getApp();
    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    api.get(API.USER.GET_BY_OPENID, {
      openid: app.globalData.userInfo.openid
    }).then(res => {
      if (res.success) {
        const userData = res.user;
        this.setData({
          score: userData.totalPoints || 0,
          progress: {
            totalDays: userData.totalDays || 0,
            consecutiveDays: userData.consecutiveDays || 0
          },
          privileges: {
            skipCardCount: userData.skipCards || 0,
            skipQuizCount: userData.skipQuizzes || 0
          }
        });

        // 确保nickname字段正确映射到前端期望的nickName
        const updatedUserData = {
          ...userData,
          nickName: userData.nickname || userData.nickName,
          _id: userData._id || userData.id
        };

        // 更新全局用户信息
        getApp().globalData.userInfo = updatedUserData;
      } else {
        wx.showToast({
          title: res.message || '获取数据失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '获取数据失败',
        icon: 'none'
      });
      console.error('[API] [查询用户信息] 失败：', err);
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

    // 生成唯一的文件名
    const timestamp = new Date().getTime();
    const cloudPath = `avatar/${getApp().globalData.userInfo.openid}_${timestamp}.jpg`;

    // 使用云开发上传文件到对象存储
    wx.cloud.uploadFile({
      cloudPath: cloudPath, // 对象存储路径，根路径直接填文件名，文件夹例子 test/文件名，不要 / 开头
      filePath: avatarFilePath, // 微信本地文件，通过选择图片，聊天文件等接口获取
      config: {
        env: 'prod-0g4esjft4f388f06' // 微信云托管环境ID
      },
      success: res => {
        console.log('头像上传成功:', res);
        // 调用云函数更新用户信息
        that.updateUserInfo({
          avatarUrl: res.fileID
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
    const app = getApp();

    if (!app.globalData.userInfo || !app.globalData.userInfo.openid) {
      wx.hideLoading();
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    api.post(API.USER.UPDATE, {
      openid: app.globalData.userInfo.openid,
      userInfo: userInfo
    }).then(res => {
      wx.hideLoading();
      if (res.success) {
        // 更新本地和全局用户信息
        // 确保nickname字段正确映射到前端期望的nickName
        const updatedUserInfo = {
          ...res.user,
          nickName: res.user.nickname || res.user.nickName,
          _id: res.user._id || res.user.id
        };

        that.setData({
          userInfo: updatedUserInfo
        });
        getApp().globalData.userInfo = updatedUserInfo;

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '更新失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none'
      });
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
   * 跳转到抽背记录页面
   */
  navigateToQuizHistory: function() {
    wx.navigateTo({
      url: '/pages/quizHistory/quizHistory'
    });
  },

  /**
   * 跳转到设置页面
   */
  navigateToSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  }
});