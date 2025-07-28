#!/usr/bin/env node

/**
 * Cloudflare Pages 构建脚本
 * 优化构建输出以适配 Pages 部署
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️ 构建 Cloudflare Pages 部署包...\n');

try {
  // 1. 清理之前的构建
  console.log('🧹 清理构建目录...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // 2. 运行标准构建
  console.log('🔨 运行 Vite 构建...');
  execSync('npm run build', { stdio: 'inherit' });

  // 3. 验证构建输出
  console.log('✅ 验证构建输出...');
  const distFiles = fs.readdirSync('dist');
  console.log('构建文件:', distFiles);

  // 4. 创建 _headers 文件用于缓存优化
  console.log('📄 创建 Pages 配置文件...');
  const headersContent = `# Cloudflare Pages 缓存配置
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable

/*.png
  Cache-Control: public, max-age=31536000, immutable

/*.jpg
  Cache-Control: public, max-age=31536000, immutable

/*.svg
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: public, max-age=0, must-revalidate

/index.html
  Cache-Control: public, max-age=0, must-revalidate`;

  fs.writeFileSync('dist/_headers', headersContent);

  // 5. 创建 _redirects 文件用于 SPA 路由
  const redirectsContent = `# SPA 路由重定向
/*    /index.html   200`;

  fs.writeFileSync('dist/_redirects', redirectsContent);

  // 6. 生成构建信息
  const buildInfo = {
    buildTime: new Date().toISOString(),
    version: require('../package.json').version,
    platform: 'cloudflare-pages',
    files: distFiles.length
  };

  fs.writeFileSync('dist/build-info.json', JSON.stringify(buildInfo, null, 2));

  console.log('\n🎉 Cloudflare Pages 构建完成！');
  console.log('\n📊 构建统计:');
  console.log(`- 文件数量: ${distFiles.length}`);
  console.log(`- 构建时间: ${buildInfo.buildTime}`);
  console.log(`- 输出目录: dist/`);
  
  console.log('\n📝 下一步:');
  console.log('1. 运行 "npm run pages:preview" 预览构建结果');
  console.log('2. 运行 "npm run pages:deploy" 部署到 Cloudflare Pages');
  console.log('3. 或者通过 Cloudflare Dashboard 连接 Git 仓库自动部署');

} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
}