// Test percentage calculation fix
import { SpendWiseExcelExporter } from './excel-export-enhanced.js';

async function testPercentageFix() {
  console.log('🔧 Testing Percentage Calculation Fix...');
  
  // Test data with specific amounts to verify percentages
  const testTransactions = [
    { date: '2024-02-15', amount: 275, category: 'Food', type: 'expense', recurring: false },
    { date: '2024-02-10', amount: 140, category: 'Transport', type: 'expense', recurring: false },
    { date: '2024-02-05', amount: 100, category: 'Entertainment', type: 'expense', recurring: false }
  ];

  console.log('📋 Test Transactions:');
  testTransactions.forEach((t, i) => {
    console.log(`${i+1}. ${t.category}: ₹${t.amount}`);
  });

  // Expected results:
  // Total: ₹515
  // Food: ₹275 = 275/515 = 0.534 = 53.4%
  // Transport: ₹140 = 140/515 = 0.272 = 27.2%
  // Entertainment: ₹100 = 100/515 = 0.194 = 19.4%

  const exporter = new SpendWiseExcelExporter();
  const metrics = exporter.calculateMetrics(testTransactions, {
    monthlyBudget: 1000,
    currentMonth: '2024-02',
    previousMonth: '2024-01'
  });

  console.log('\n📊 Percentage Calculations:');
  console.log(`Total Spend: ₹${metrics.totalSpend}`);
  
  console.log('\n📈 Category Breakdown (Decimal Values):');
  metrics.categoryBreakdown.forEach((cat, i) => {
    console.log(`${i+1}. ${cat.category}: ₹${cat.totalAmount} = ${cat.percentage} (decimal)`);
  });

  console.log('\n🎯 Expected vs Actual:');
  const expected = [
    { category: 'Food', expected: 0.534, actual: metrics.categoryBreakdown.find(c => c.category === 'Food')?.percentage },
    { category: 'Transport', expected: 0.272, actual: metrics.categoryBreakdown.find(c => c.category === 'Transport')?.percentage },
    { category: 'Entertainment', expected: 0.194, actual: metrics.categoryBreakdown.find(c => c.category === 'Entertainment')?.percentage }
  ];

  expected.forEach((item) => {
    const diff = Math.abs(item.expected - item.actual);
    const status = diff < 0.01 ? '✅' : '❌';
    console.log(`${status} ${item.category}: Expected ${(item.expected * 100).toFixed(1)}%, Got ${(item.actual * 100).toFixed(1)}%`);
  });

  // Test Excel generation
  console.log('\n📝 Testing Excel Generation...');
  const workbook = await exporter.generateExcelReport(testTransactions, {
    monthlyBudget: 1000,
    currentMonth: '2024-02',
    previousMonth: '2024-01'
  });

  await workbook.xlsx.writeFile('percentage-fix-test.xlsx');
  console.log('✅ Excel file created: percentage-fix-test.xlsx');
  console.log('\n🔍 Check the Excel file:');
  console.log('- Food should show: 53.4%');
  console.log('- Transport should show: 27.2%');
  console.log('- Entertainment should show: 19.4%');
  console.log('- Total should show: 100.0%');
}

testPercentageFix();
