#!/usr/bin/env node

/**
 * 测试 Worker 端点的脚本
 */

const http = require('http');

function testEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 8787,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ ${path} - Status: ${res.statusCode}`);
        if (path === '/health') {
          try {
            const json = JSON.parse(data);
            console.log(`   Health Status: ${json.status}`);
            console.log(`   Environment: ${json.environment}`);
          } catch (e) {
            console.log(`   Response: ${data.substring(0, 100)}...`);
          }
        } else {
          console.log(`   Response: ${data.substring(0, 100)}...`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${path} - Error: ${err.message}`);
      reject(err);
    });

    req.setTimeout(5000, () => {
      console.log(`❌ ${path} - Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 测试 Worker 端点...\n');
  
  try {
    await testEndpoint('/');
    await testEndpoint('/health');
    await testEndpoint('/nonexistent');
    
    console.log('\n🎉 所有端点测试完成！');
  } catch (error) {
    console.log('\n❌ 测试失败，请确保 Worker 开发服务器正在运行');
    console.log('运行: npm run worker:dev');
  }
}

runTests();