// 测试嵌套的userInfo结构更新用户信息
const http = require('http');

const data = JSON.stringify({
  openid: "temp_openid_1758008670121",
  userInfo: {
    nickName: "环环",
    avatarUrl: "https://example.com/avatar.jpg"
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/users/update',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('状态码:', res.statusCode);
    console.log('响应头:', res.headers);
    console.log('响应体:', responseData);
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
});

// 发送请求体
req.write(data);
req.end();