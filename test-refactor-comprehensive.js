// Comprehensive test for refactored routers
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 COMPREHENSIVE REFACTOR TEST\n');
console.log('═'.repeat(50));

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passCount++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failCount++;
  }
}

// Test 1: File Structure
console.log('\n📁 FILE STRUCTURE TESTS');
console.log('─'.repeat(50));

test('Auth router exists', () => {
  const exists = fs.existsSync(path.join(__dirname, 'server/api/routers/auth.ts'));
  if (!exists) throw new Error('auth.ts not found');
});

test('Solar router exists', () => {
  const exists = fs.existsSync(path.join(__dirname, 'server/api/routers/solar.ts'));
  if (!exists) throw new Error('solar.ts not found');
});

test('Report router exists', () => {
  const exists = fs.existsSync(path.join(__dirname, 'server/api/routers/report.ts'));
  if (!exists) throw new Error('report.ts not found');
});

test('Proposals router exists', () => {
  const exists = fs.existsSync(path.join(__dirname, 'server/api/routers/proposals.ts'));
  if (!exists) throw new Error('proposals.ts not found');
});

test('Materials router exists', () => {
  const exists = fs.existsSync(path.join(__dirname, 'server/api/routers/materials.ts'));
  if (!exists) throw new Error('materials.ts not found');
});

test('Index file exists', () => {
  const exists = fs.existsSync(path.join(__dirname, 'server/api/routers/index.ts'));
  if (!exists) throw new Error('index.ts not found');
});

// Test 2: Imports in main routers.ts
console.log('\n📦 IMPORT TESTS');
console.log('─'.repeat(50));

const routersContent = fs.readFileSync(path.join(__dirname, 'server/routers.ts'), 'utf8');

test('Auth router imported', () => {
  if (!routersContent.includes('import { authRouter } from "./api/routers/auth"')) {
    throw new Error('authRouter import missing');
  }
});

test('Solar router imported', () => {
  if (!routersContent.includes('import { solarRouter } from "./api/routers/solar"')) {
    throw new Error('solarRouter import missing');
  }
});

test('Report router imported', () => {
  if (!routersContent.includes('import { reportRouter } from "./api/routers/report"')) {
    throw new Error('reportRouter import missing');
  }
});

test('Proposals router imported', () => {
  if (!routersContent.includes('import { proposalsRouter } from "./api/routers/proposals"')) {
    throw new Error('proposalsRouter import missing');
  }
});

test('Materials router imported', () => {
  if (!routersContent.includes('import { materialsRouter } from "./api/routers/materials"')) {
    throw new Error('materialsRouter import missing');
  }
});

// Test 3: Router Usage in appRouter
console.log('\n🔗 ROUTER USAGE TESTS');
console.log('─'.repeat(50));

test('Auth router used in appRouter', () => {
  if (!routersContent.includes('auth: authRouter')) {
    throw new Error('authRouter not used in appRouter');
  }
});

test('Solar router used in appRouter', () => {
  if (!routersContent.includes('solar: solarRouter')) {
    throw new Error('solarRouter not used in appRouter');
  }
});

test('Report router used in appRouter', () => {
  if (!routersContent.includes('report: reportRouter')) {
    throw new Error('reportRouter not used in appRouter');
  }
});

test('Proposals router used in appRouter', () => {
  if (!routersContent.includes('proposals: proposalsRouter')) {
    throw new Error('proposalsRouter not used in appRouter');
  }
});

test('Materials router used in appRouter', () => {
  if (!routersContent.includes('materials: materialsRouter')) {
    throw new Error('materialsRouter not used in appRouter');
  }
});

// Test 4: Old Code Removal
console.log('\n🗑️  OLD CODE REMOVAL TESTS');
console.log('─'.repeat(50));

test('Old auth code removed', () => {
  if (routersContent.includes('syncSupabaseUser: publicProcedure')) {
    throw new Error('Old syncSupabaseUser code still present in routers.ts');
  }
});

test('Old proposal code removed', () => {
  if (routersContent.includes('updateProposal: protectedProcedure')) {
    throw new Error('Old updateProposal code still present');
  }
  if (routersContent.includes('generateProposal: protectedProcedure')) {
    throw new Error('Old generateProposal code still present');
  }
  if (routersContent.includes('generateSignedProposal: protectedProcedure')) {
    throw new Error('Old generateSignedProposal code still present');
  }
});

test('Old materials code removed', () => {
  if (routersContent.includes('generateBeaconOrder: ownerOfficeProcedure')) {
    throw new Error('Old generateBeaconOrder code still present');
  }
  if (routersContent.includes('getMaterialOrders: protectedProcedure')) {
    throw new Error('Old getMaterialOrders code still present');
  }
  if (routersContent.includes('getMaterialKits: protectedProcedure')) {
    throw new Error('Old getMaterialKits code still present');
  }
});

// Test 5: Router Content Validation
console.log('\n📝 ROUTER CONTENT TESTS');
console.log('─'.repeat(50));

const authContent = fs.readFileSync(path.join(__dirname, 'server/api/routers/auth.ts'), 'utf8');
test('Auth router exports authRouter', () => {
  if (!authContent.includes('export const authRouter')) {
    throw new Error('authRouter export missing');
  }
});

test('Auth router has all procedures', () => {
  if (!authContent.includes('me:')) throw new Error('me procedure missing');
  if (!authContent.includes('logout:')) throw new Error('logout procedure missing');
  if (!authContent.includes('syncSupabaseUser:')) throw new Error('syncSupabaseUser procedure missing');
  if (!authContent.includes('loginWithPassword:')) throw new Error('loginWithPassword procedure missing');
});

const solarContent = fs.readFileSync(path.join(__dirname, 'server/api/routers/solar.ts'), 'utf8');
test('Solar router has roofAreaSqMeters handling', () => {
  if (!solarContent.includes('roofAreaSqMeters')) {
    throw new Error('roofAreaSqMeters handling missing');
  }
});

test('Solar router has unit conversion comment', () => {
  if (!solarContent.includes('SQUARE METERS') || !solarContent.includes('10.764')) {
    throw new Error('Unit conversion documentation missing');
  }
});

const proposalsContent = fs.readFileSync(path.join(__dirname, 'server/api/routers/proposals.ts'), 'utf8');
test('Proposals router has all procedures', () => {
  if (!proposalsContent.includes('updateProposal:')) throw new Error('updateProposal missing');
  if (!proposalsContent.includes('generateProposal:')) throw new Error('generateProposal missing');
  if (!proposalsContent.includes('generateSignedProposal:')) throw new Error('generateSignedProposal missing');
});

test('Proposals router uses totalArea', () => {
  if (!proposalsContent.includes('totalArea')) {
    throw new Error('Proposals router should use totalArea instead of roofArea');
  }
});

const materialsContent = fs.readFileSync(path.join(__dirname, 'server/api/routers/materials.ts'), 'utf8');
test('Materials router has all procedures', () => {
  if (!materialsContent.includes('generateBeaconOrder:')) throw new Error('generateBeaconOrder missing');
  if (!materialsContent.includes('getMaterialOrders:')) throw new Error('getMaterialOrders missing');
  if (!materialsContent.includes('getMaterialKits:')) throw new Error('getMaterialKits missing');
  if (!materialsContent.includes('generateMaterialOrderPDF:')) throw new Error('generateMaterialOrderPDF missing');
});

test('Materials router handles totalArea fallback', () => {
  if (!materialsContent.includes('totalArea') || !materialsContent.includes('roofAreaSqMeters')) {
    throw new Error('Materials router should handle both totalArea and roofAreaSqMeters');
  }
});

// Test 6: File Size Reduction
console.log('\n📊 FILE SIZE TESTS');
console.log('─'.repeat(50));

const routersLines = routersContent.split('\n').length;
test('File size reduced significantly', () => {
  if (routersLines > 2800) {
    throw new Error(`routers.ts still too large: ${routersLines} lines (should be < 2800)`);
  }
});

console.log(`   routers.ts: ${routersLines} lines (target: < 2800, actual file: ~2450)`);

const authLines = authContent.split('\n').length;
console.log(`   auth.ts: ${authLines} lines`);

const solarLines = solarContent.split('\n').length;
console.log(`   solar.ts: ${solarLines} lines`);

const proposalsLines = proposalsContent.split('\n').length;
console.log(`   proposals.ts: ${proposalsLines} lines`);

const materialsLines = materialsContent.split('\n').length;
console.log(`   materials.ts: ${materialsLines} lines`);

const totalExtracted = authLines + solarLines + proposalsLines + materialsLines;
console.log(`   Total extracted: ${totalExtracted} lines`);

// Test 7: Index.ts Exports
console.log('\n📤 EXPORT TESTS');
console.log('─'.repeat(50));

const indexContent = fs.readFileSync(path.join(__dirname, 'server/api/routers/index.ts'), 'utf8');

test('Index exports all routers', () => {
  if (!indexContent.includes('export { authRouter }')) throw new Error('authRouter export missing from index');
  if (!indexContent.includes('export { solarRouter }')) throw new Error('solarRouter export missing from index');
  if (!indexContent.includes('export { reportRouter }')) throw new Error('reportRouter export missing from index');
  if (!indexContent.includes('export { proposalsRouter }')) throw new Error('proposalsRouter export missing from index');
  if (!indexContent.includes('export { materialsRouter }')) throw new Error('materialsRouter export missing from index');
});

test('Index re-exports appRouter', () => {
  if (!indexContent.includes('export { appRouter, type AppRouter }')) {
    throw new Error('appRouter re-export missing from index');
  }
});

// Final Summary
console.log('\n' + '═'.repeat(50));
console.log('📋 TEST SUMMARY');
console.log('═'.repeat(50));
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📊 Total:  ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('\n✨ Refactor Status:');
  console.log('  ✅ Auth router: Extracted & Verified');
  console.log('  ✅ Solar router: Extracted & Verified');
  console.log('  ✅ Report router: Extracted & Verified');
  console.log('  ✅ Proposals router: Extracted & Verified');
  console.log('  ✅ Materials router: Extracted & Verified');
  console.log(`  ✅ File size: ${routersLines} lines (reduced by ${3197 - routersLines} lines)`);
  console.log('\n🚀 Ready for production testing!');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME TESTS FAILED');
  console.log('Please review the errors above and fix before proceeding.');
  process.exit(1);
}
