#!/usr/bin/env node

/**
 * 测试 Cloudflare Pages 配置和构建的脚本
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 测试 Cloudflare Pages 配置...\n');

// 检查必要文件是否存在
const requiredFiles = [
  'pages.toml',
  'package.json',
  'vite.config.ts'
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

// 测试标准构建
console.log('\n🔨 测试标准构建...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ 标准构建成功');
} catch (error) {
  console.log('❌ 标准构建失败');
  process.exit(1);
}

// 验证构建输出
console.log('\n📦 验证构建输出...');
if (fs.existsSync('dist')) {
  const distFiles = fs.readdirSync('dist');
  console.log(`✅ 构建目录存在，包含 ${distFiles.length} 个文件`);
  
  // 检查关键文件
  const keyFiles = ['index.html'];
  for (const file of keyFiles) {
    if (distFiles.includes(file)) {
      console.log(`✅ ${file} 存在`);
    } else {
      console.log(`❌ ${file} 不存在`);
    }
  }
} else {
  console.log('❌ 构建目录不存在');
  process.exit(1);
}

// 验证 pages.toml 配置
console.log('\n⚙️ 验证 pages.toml 配置...');
const pagesConfig = fs.readFileSync('pages.toml', 'utf8');
if (pagesConfig.includes('name = "llm-memory-calculator"')) {
  console.log('✅ Pages 项目名称配置正确');
} else {
  console.log('❌ Pages 项目名称配置错误');
}

if (pagesConfig.includes('destination = "dist"')) {
  console.log('✅ 构建输出目录配置正确');
} else {
  console.log('❌ 构建输出目录配置错误');
}

console.log('\n🎉 Pages 配置测试完成！');
console.log('\n📝 部署选项：');
console.log('1. 通过 Wrangler: "npm run pages:deploy"');
console.log('2. 通过 Git 集成: 连接 GitHub/GitLab 仓库到 Cloudflare Pages');
console.log('3. 通过拖拽: 将 dist/ 目录拖拽到 Cloudflare Pages Dashboard');
console.log('\n💡 推荐使用 Git 集成进行自动化部署');