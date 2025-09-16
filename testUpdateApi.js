const http = require('http');

const data = JSON.stringify({
  openid: 'test123',
  nickname: '测试用户'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/users/update',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log('响应头:', res.headers);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('响应体:', responseData);
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
});

// 发送请求体
req.write(data);
req.end();