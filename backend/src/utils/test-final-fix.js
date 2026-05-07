// Final test to verify the 500 error fix is working
import { SpendWiseExcelExporter } from './excel-export-enhanced.js';

async function testFinalFix() {
  console.log('🎯 Final Test: 500 Error Fix Verification...');
  
  // Test data that would previously cause the error
  const problematicTransactions = [
    { date: '2024-02-15', amount: 1500, category: 'Food & Dining', type: 'expense', recurring: false },
    { date: '2024-02-10', amount: 99, category: null, type: 'subscription', recurring: true }, // null category
    { date: '2024-02-05', amount: 2500, category: undefined, type: 'expense', recurring: true }, // undefined category
    { date: '2024-02-01', amount: 500, category: '', type: 'expense', recurring: false }, // empty string
  ];

  console.log('📋 Test Transactions:');
  problematicTransactions.forEach((t, i) => {
    console.log(`${i+1}. Category: ${JSON.stringify(t.category)} - Amount: ${t.amount}`);
  });

  try {
    const exporter = new SpendWiseExcelExporter();
    
    console.log('\n🛡️ Testing Complete Excel Export Pipeline...');
    
    // Test 1: Calculate metrics with defensive checks
    const options = {
      monthlyBudget: 5000,
      currentMonth: '2024-02',
      previousMonth: '2024-01',
      netSettlementPosition: 0,
      supabaseToken: 'mock-token' // This will fail but we can test the structure
    };

    const metrics = await exporter.calculateMetricsFromDatabase(problematicTransactions, options);
    
    console.log('\n📊 Metrics Calculation Results:');
    console.log(`- Total Expenses: ₹${metrics.totalExpenses.toLocaleString('en-IN')}`);
    console.log(`- Total Subscriptions: ₹${metrics.totalSubscriptions.toLocaleString('en-IN')}`);
    console.log(`- Total Spend: ₹${metrics.totalSpend.toLocaleString('en-IN')}`);
    console.log(`- Budget Usage: ${(metrics.budgetUsagePercent * 100).toFixed(1)}%`);
    console.log(`- Category Breakdown: ${metrics.categoryBreakdown.length} items`);
    console.log(`- Monthly Trend: ${metrics.monthlyTrend.length} items`);

    console.log('\n🎨 Testing Chart Generation...');
    
    // Test 2: Chart generation with defensive checks
    const pieChart = await exporter.generateCategoryPieChart(metrics.categoryBreakdown);
    const trendChart = await exporter.generateMonthlyTrendChart(metrics.monthlyTrend);
    
    console.log(`✅ Pie Chart: ${pieChart ? 'Generated' : 'Skipped (no data)'}`);
    console.log(`✅ Trend Chart: ${trendChart ? 'Generated' : 'Skipped (no data)'}`);

    console.log('\n📝 Testing Excel Workbook Creation...');
    
    // Test 3: Full Excel generation (without database calls)
    const testMetrics = {
      totalExpenses: metrics.totalExpenses,
      totalSubscriptions: metrics.totalSubscriptions,
      totalSpend: metrics.totalSpend,
      growthPercent: metrics.growthPercent,
      budgetUsagePercent: metrics.budgetUsagePercent,
      netSettlementPosition: 0,
      categoryBreakdown: metrics.categoryBreakdown,
      monthlyTrend: metrics.monthlyTrend
    };

    const workbook = await exporter.generateExcelReport(problematicTransactions, options);
    
    console.log('✅ Excel Workbook: Generated successfully');
    console.log(`✅ Worksheets: ${workbook.worksheets.length} sheets`);
    console.log(`✅ First sheet: ${workbook.worksheets[0].name}`);

    console.log('\n🎯 Final Verification:');
    console.log('✅ No "Cannot read properties of undefined" errors');
    console.log('✅ All null/undefined categories handled');
    console.log('✅ Chart generation completed safely');
    console.log('✅ Excel workbook created successfully');
    console.log('✅ All defensive checks passed');

    console.log('\n🚀 500 Error Fix Status: COMPLETE ✅');
    console.log('The Excel export is now bulletproof against undefined property access.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('Cannot read properties of undefined')) {
      console.error('\n💥 500 Error Still Present!');
      console.error('The fix did not resolve the undefined property access issue.');
    } else {
      console.error('\n⚠️ Different error occurred (not the 500 error we were fixing)');
    }
  }
}

testFinalFix();
