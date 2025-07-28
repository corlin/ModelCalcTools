#!/usr/bin/env node

/**
 * 测试 Worker 配置和构建的脚本
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 测试 Cloudflare Worker 配置...\n');

// 检查必要文件是否存在
const requiredFiles = [
  'wrangler.toml',
  'src/worker.ts',
  'tsconfig.worker.json'
];

console.log('📁 检查必要文件...');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} 存在`);
  } else {
    console.log(`❌ ${file} 不存在`);
    process.exit(1);
  }
}

// 测试 TypeScript 编译
console.log('\n🔨 测试 TypeScript 编译...');
try {
  execSync('npm run worker:build', { stdio: 'inherit' });
  console.log('✅ TypeScript 编译成功');
} catch (error) {
  console.log('❌ TypeScript 编译失败');
  process.exit(1);
}

// 验证 wrangler.toml 配置
console.log('\n⚙️ 验证 wrangler.toml 配置...');
const wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
if (wranglerConfig.includes('name = "llm-memory-calculator"')) {
  console.log('✅ Worker 名称配置正确');
} else {
  console.log('❌ Worker 名称配置错误');
}

if (wranglerConfig.includes('main = "src/worker.ts"')) {
  console.log('✅ Worker 入口文件配置正确');
} else {
  console.log('❌ Worker 入口文件配置错误');
}

console.log('\n🎉 Worker 配置测试完成！');
console.log('\n📝 下一步：');
console.log('1. 运行 "npm run worker:dev" 启动本地开发服务器');
console.log('2. 访问 http://localhost:8787 查看 Worker');
console.log('3. 访问 http://localhost:8787/health 查看健康检查端点');