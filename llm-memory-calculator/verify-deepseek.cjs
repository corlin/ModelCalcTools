// Simple verification script for DeepSeek models
const fs = require('fs');
const path = require('path');

// Read the modelPresets.ts file
const modelPresetsPath = path.join(__dirname, 'src', 'utils', 'modelPresets.ts');
const modelPresetsContent = fs.readFileSync(modelPresetsPath, 'utf8');

// Check if DeepSeek models are present
const hasDeepSeekR1 = modelPresetsContent.includes("id: 'deepseek-r1'");
const hasDeepSeekDistill = modelPresetsContent.includes("id: 'deepseek-r1-distill-qwen-32b'");
const hasDeepSeekCategory = modelPresetsContent.includes("category: 'deepseek'");

// Read the types file
const typesPath = path.join(__dirname, 'src', 'types', 'index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');
const hasDeepSeekType = typesContent.includes("'deepseek'");

// Read the constants file
const constantsPath = path.join(__dirname, 'src', 'constants', 'index.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');
const hasDeepSeekLabel = constantsContent.includes("deepseek: 'DeepSeek系列'");

console.log('DeepSeek Model Configuration Verification:');
console.log('==========================================');
console.log(`✓ DeepSeek-R1 model present: ${hasDeepSeekR1 ? 'YES' : 'NO'}`);
console.log(`✓ DeepSeek-R1-Distill-Qwen-32B model present: ${hasDeepSeekDistill ? 'YES' : 'NO'}`);
console.log(`✓ DeepSeek category used: ${hasDeepSeekCategory ? 'YES' : 'NO'}`);
console.log(`✓ DeepSeek type definition: ${hasDeepSeekType ? 'YES' : 'NO'}`);
console.log(`✓ DeepSeek category label: ${hasDeepSeekLabel ? 'YES' : 'NO'}`);

// Check for special features
const hasSpecialFeatures = modelPresetsContent.includes('specialFeatures:');
const hasTags = modelPresetsContent.includes('tags:');
const hasRecommendedUseCase = modelPresetsContent.includes('recommendedUseCase:');

console.log('\nSpecial Features Verification:');
console.log('==============================');
console.log(`✓ Special features field: ${hasSpecialFeatures ? 'YES' : 'NO'}`);
console.log(`✓ Tags field: ${hasTags ? 'YES' : 'NO'}`);
console.log(`✓ Recommended use case field: ${hasRecommendedUseCase ? 'YES' : 'NO'}`);

// Check specific DeepSeek model parameters
const hasR1Parameters = modelPresetsContent.includes('parameterCount: 671');
const hasDistillParameters = modelPresetsContent.includes('parameterCount: 32');

console.log('\nModel Parameters Verification:');
console.log('==============================');
console.log(`✓ DeepSeek-R1 671B parameters: ${hasR1Parameters ? 'YES' : 'NO'}`);
console.log(`✓ DeepSeek-R1-Distill-Qwen-32B 32B parameters: ${hasDistillParameters ? 'YES' : 'NO'}`);

const allChecks = [
  hasDeepSeekR1,
  hasDeepSeekDistill,
  hasDeepSeekCategory,
  hasDeepSeekType,
  hasDeepSeekLabel,
  hasSpecialFeatures,
  hasTags,
  hasRecommendedUseCase,
  hasR1Parameters,
  hasDistillParameters
];

const allPassed = allChecks.every(check => check);

console.log('\n==========================================');
console.log(`Overall Status: ${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
console.log('==========================================');

if (allPassed) {
  console.log('\n🎉 DeepSeek models have been successfully added to the LLM Memory Calculator!');
  console.log('\nFeatures implemented:');
  console.log('- DeepSeek-R1 (671B parameters) model configuration');
  console.log('- DeepSeek-R1-Distill-Qwen-32B (32B parameters) model configuration');
  console.log('- DeepSeek category type definition');
  console.log('- Special features and tags for enhanced model selection');
  console.log('- Recommended use cases for each model');
  console.log('- Category labels for UI display');
}