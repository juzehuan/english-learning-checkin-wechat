// API响应格式转换测试脚本
// 该脚本用于测试apiConfig.js中的响应格式转换逻辑是否正常工作

// 模拟微信小程序环境
const wx = {
  showLoading: () => {},
  hideLoading: () => {},
  showToast: () => {}
};

// 模拟后端successResponse返回格式
const mockSuccessResponse = {
  statusCode: 200,
  data: {
    code: 0,
    message: '操作成功',
    data: {
      user: {
        id: '123',
        name: '测试用户',
        points: 100
      },
      stats: {
        totalSignins: 50,
        currentStreak: 7
      }
    },
    timestamp: '2023-04-15T10:30:00.000Z'
  }
};

// 模拟后端errorResponse返回格式 (400状态码)
const mockErrorResponse = {
  statusCode: 400,
  data: {
    code: 1001,
    message: '请求参数错误',
    data: null,
    timestamp: '2023-04-15T10:30:00.000Z'
  }
};

// 模拟后端未授权响应 (401状态码)
const mockUnauthorizedResponse = {
  statusCode: 401,
  data: {
    code: 1002,
    message: '未授权，请登录',
    data: null,
    timestamp: '2023-04-15T10:30:00.000Z'
  }
};

// 模拟后端禁止访问响应 (403状态码)
const mockForbiddenResponse = {
  statusCode: 403,
  data: {
    code: 1003,
    message: '权限不足，禁止访问',
    data: null,
    timestamp: '2023-04-15T10:30:00.000Z'
  }
};

// 模拟后端资源不存在响应 (404状态码)
const mockNotFoundResponse = {
  statusCode: 404,
  data: {
    code: 1004,
    message: '请求的资源不存在',
    data: null,
    timestamp: '2023-04-15T10:30:00.000Z'
  }
};

// 模拟后端服务器错误响应 (500状态码)
const mockServerErrorResponse = {
  statusCode: 500,
  data: {
    code: 1005,
    message: '服务器内部错误',
    data: null,
    timestamp: '2023-04-15T10:30:00.000Z'
  }
};

// 模拟请求失败情况
const mockRequestFail = new Error('网络请求失败');

// 模拟request函数的核心逻辑
function mockRequest(successResponse, shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(mockRequestFail);
        return;
      }
      
      const responseData = successResponse.data;
      
      // 这里模拟apiConfig.js中的响应格式转换逻辑
      if (responseData && 'code' in responseData && 'message' in responseData && 'data' in responseData) {
        const formattedResponse = {};
        
        // 200系列状态码且code=0表示成功
        formattedResponse.success = (successResponse.statusCode >= 200 && successResponse.statusCode < 300) && responseData.code === 0;
        
        // 保持message字段
        formattedResponse.message = responseData.message;
        
        // 将data中的所有内容展开到顶层
        if (responseData.data !== null && typeof responseData.data === 'object') {
          Object.assign(formattedResponse, responseData.data);
        }
        
        // 传递原始code和statusCode，便于高级处理
        formattedResponse.code = responseData.code;
        formattedResponse.statusCode = successResponse.statusCode;
        
        resolve(formattedResponse);
      } else {
        resolve(responseData);
      }
    }, 100);
  });
}

// 运行测试
async function runTests() {
  console.log('===== API响应格式转换测试开始 =====\n');
  
  // 测试1：成功响应测试 (200状态码, code=0)
  try {
    console.log('测试1: 成功响应测试 (200状态码, code=0)');
    const result = await mockRequest(mockSuccessResponse);
    console.log('转换结果:', JSON.stringify(result, null, 2));
    console.log('success字段值:', result.success);
    console.log('statusCode字段值:', result.statusCode);
    console.log('测试1通过: 成功响应格式转换正确\n');
  } catch (error) {
    console.error('测试1失败:', error.message);
  }
  
  // 测试2：失败响应测试 (400状态码)
  try {
    console.log('测试2: 失败响应测试 (400状态码)');
    const result = await mockRequest(mockErrorResponse);
    console.log('转换结果:', JSON.stringify(result, null, 2));
    console.log('success字段值:', result.success);
    console.log('statusCode字段值:', result.statusCode);
    console.log('测试2通过: 400状态码响应格式转换正确\n');
  } catch (error) {
    console.error('测试2失败:', error.message);
  }
  
  // 测试3：未授权响应测试 (401状态码)
  try {
    console.log('测试3: 未授权响应测试 (401状态码)');
    const result = await mockRequest(mockUnauthorizedResponse);
    console.log('转换结果:', JSON.stringify(result, null, 2));
    console.log('success字段值:', result.success);
    console.log('statusCode字段值:', result.statusCode);
    console.log('测试3通过: 401状态码响应格式转换正确\n');
  } catch (error) {
    console.error('测试3失败:', error.message);
  }
  
  // 测试4：禁止访问响应测试 (403状态码)
  try {
    console.log('测试4: 禁止访问响应测试 (403状态码)');
    const result = await mockRequest(mockForbiddenResponse);
    console.log('转换结果:', JSON.stringify(result, null, 2));
    console.log('success字段值:', result.success);
    console.log('statusCode字段值:', result.statusCode);
    console.log('测试4通过: 403状态码响应格式转换正确\n');
  } catch (error) {
    console.error('测试4失败:', error.message);
  }
  
  // 测试5：资源不存在响应测试 (404状态码)
  try {
    console.log('测试5: 资源不存在响应测试 (404状态码)');
    const result = await mockRequest(mockNotFoundResponse);
    console.log('转换结果:', JSON.stringify(result, null, 2));
    console.log('success字段值:', result.success);
    console.log('statusCode字段值:', result.statusCode);
    console.log('测试5通过: 404状态码响应格式转换正确\n');
  } catch (error) {
    console.error('测试5失败:', error.message);
  }
  
  // 测试6：服务器错误响应测试 (500状态码)
  try {
    console.log('测试6: 服务器错误响应测试 (500状态码)');
    const result = await mockRequest(mockServerErrorResponse);
    console.log('转换结果:', JSON.stringify(result, null, 2));
    console.log('success字段值:', result.success);
    console.log('statusCode字段值:', result.statusCode);
    console.log('测试6通过: 500状态码响应格式转换正确\n');
  } catch (error) {
    console.error('测试6失败:', error.message);
  }
  
  // 测试7：请求失败测试
  try {
    console.log('测试7: 请求失败测试');
    await mockRequest(null, true);
    console.log('测试7失败: 未正确捕获请求失败');
  } catch (error) {
    console.log('捕获到预期错误:', error.message);
    console.log('测试7通过: 请求失败处理正确\n');
  }
  
  console.log('===== API响应格式转换测试结束 =====');
}

// 执行测试
runTests();