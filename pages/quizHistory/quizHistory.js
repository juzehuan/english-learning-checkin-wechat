// 抽背记录页面逻辑
Page({
  data: {
    quizRecords: [],
    totalRecords: 0,
    pageSize: 10,
    currentPage: 1,
    hasMore: true,
    loading: false,
    activeFilter: 'all', // all, sender, receiver
    filterOptions: [
      { id: 'all', name: '全部记录' },
      { id: 'sender', name: '我抽背的' },
      { id: 'receiver', name: '被抽背的' }
    ]
  },

  onLoad: function() {
    this.fetchQuizRecords();
  },

  onPullDownRefresh: function() {
    // 下拉刷新，重置数据
    this.setData({
      quizRecords: [],
      currentPage: 1,
      hasMore: true
    });
    this.fetchQuizRecords();
  },

  onReachBottom: function() {
    // 上拉加载更多
    if (this.data.hasMore && !this.data.loading) {
      this.fetchQuizRecords(this.data.currentPage + 1);
    }
  },

  /**
   * 获取抽背记录
   * @param {Number} pageNum - 页码
   */
  fetchQuizRecords: function(pageNum = 1) {
    if (this.data.loading) {
      return;
    }

    this.setData({
      loading: true
    });

    wx.cloud.callFunction({
      name: 'getQuizHistory',
      data: {
        pageSize: this.data.pageSize,
        pageNum: pageNum,
        filterType: this.data.activeFilter
      },
      success: res => {
        console.log('[云函数] [getQuizHistory] 成功：', res.result);
        
        if (res.result.success) {
          const records = res.result.data.list || [];
          const newRecords = pageNum === 1 ? records : [...this.data.quizRecords, ...records];
          
          this.setData({
            quizRecords: newRecords,
            totalRecords: res.result.data.total,
            currentPage: pageNum,
            hasMore: res.result.data.hasMore
          });
        } else {
          wx.showToast({
            title: res.result.message || '获取记录失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('[云函数] [getQuizHistory] 调用失败：', err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          loading: false
        });
        wx.stopPullDownRefresh();
      }
    });
  },

  /**
   * 切换筛选条件
   */
  switchFilter: function(e) {
    const filterType = e.currentTarget.dataset.type;
    
    if (filterType === this.data.activeFilter) {
      return;
    }
    
    this.setData({
      activeFilter: filterType,
      quizRecords: [],
      currentPage: 1,
      hasMore: true
    });
    
    this.fetchQuizRecords();
  },

  /**
   * 跳转到用户资料页
   */
  goToUserProfile: function(e) {
    const userId = e.currentTarget.dataset.userId;
    
    if (userId === getApp().globalData.userInfo._id) {
      // 查看自己的资料
      wx.switchTab({
        url: '/pages/profile/profile'
      });
    } else {
      // 查看好友的资料（如果需要的话）
      wx.navigateTo({
        url: `/pages/userProfile/userProfile?id=${userId}`
      });
    }
  },

  /**
   * 格式化日期显示
   */
  formatDate: function(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hour = d.getHours().toString().padStart(2, '0');
    const minute = d.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
});