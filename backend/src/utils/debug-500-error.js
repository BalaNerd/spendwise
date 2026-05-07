// Debug script to identify exact location of 500 error
import { SpendWiseExcelExporter } from './excel-export-enhanced.js';

async function debug500Error() {
  console.log('🔍 Debugging 500 Error - Finding Exact Location...');
  
  // Test with minimal data that should trigger the error
  const testTransactions = [
    { date: '2024-02-15', amount: 1500, category: 'Food', type: 'expense', recurring: false },
    { date: '2024-02-10', amount: 99, category: null, type: 'expense', recurring: true },
  ];

  console.log('📋 Test Transactions:');
  testTransactions.forEach((t, i) => {
    console.log(`${i+1}. ${JSON.stringify(t)}`);
  });

  try {
    console.log('\n🛡️ Step 1: Testing calculateMetricsFromDatabase...');
    const exporter = new SpendWiseExcelExporter();
    
    // Test with minimal options to isolate the issue
    const options = {
      monthlyBudget: 5000,
      currentMonth: '2024-02',
      previousMonth: '2024-01',
      netSettlementPosition: 0,
      supabaseToken: 'test-token'
    };

    // Add detailed logging to catch where error occurs
    const originalConsoleError = console.error;
    const errors = [];
    
    console.error = (...args) => {
      errors.push({ timestamp: new Date().toISOString(), message: args.join(' ') });
      originalConsoleError(...args);
    };

    const metrics = await exporter.calculateMetricsFromDatabase(testTransactions, options);
    
    console.log('\n📊 Metrics Results:');
    console.log(`- Total Expenses: ${metrics.totalExpenses}`);
    console.log(`- Total Subscriptions: ${metrics.totalSubscriptions}`);
    console.log(`- Category Breakdown: ${metrics.categoryBreakdown.length} items`);

    console.log('\n🎨 Step 2: Testing generateCategoryPieChart...');
    const pieChart = await exporter.generateCategoryPieChart(metrics.categoryBreakdown);
    console.log(`- Pie Chart: ${pieChart ? 'Generated' : 'Failed'}`);

    console.log('\n📈 Step 3: Testing generateMonthlyTrendChart...');
    const trendChart = await exporter.generateMonthlyTrendChart(metrics.monthlyTrend);
    console.log(`- Trend Chart: ${trendChart ? 'Generated' : 'Failed'}`);

    console.log('\n📝 Step 4: Testing createCategoryBreakdownTable...');
    // Mock sheet object for testing
    const mockSheet = {
      getCell: (row, col) => ({
        value: null,
        font: null,
        border: null,
        numFmt: null
      }),
      mergeCells: () => {},
      getColumn: () => ({ width: 20 })
    };

    const tableResult = exporter.createCategoryBreakdownTable(mockSheet, metrics.categoryBreakdown, 1);
    console.log(`- Category Table: ${tableResult ? 'Created' : 'Failed'}`);

    console.log('\n📊 Step 5: Testing createTransactionsTable...');
    const transactionResult = exporter.createTransactionsTable(mockSheet, testTransactions, 1);
    console.log(`- Transactions Table: ${transactionResult ? 'Created' : 'Failed'}`);

    console.log('\n📈 Step 6: Testing createKPISection...');
    const kpiResult = exporter.createKPISection(mockSheet, metrics);
    console.log(`- KPI Section: ${kpiResult ? 'Created' : 'Failed'}`);

    console.log('\n🎯 Step 7: Testing generateExcelReport...');
    const workbook = await exporter.generateExcelReport(testTransactions, options);
    console.log(`- Excel Workbook: ${workbook ? 'Generated' : 'Failed'}`);

    // Restore original console.error
    console.error = originalConsoleError;

    console.log('\n🔍 Error Analysis:');
    if (errors.length > 0) {
      console.log('💥 Errors Captured:');
      errors.forEach((error, i) => {
        console.log(`${i+1}. ${error.timestamp}: ${error.message}`);
      });
      
      // Find the specific error about 'name'
      const nameError = errors.find(e => e.message.includes('name'));
      if (nameError) {
        console.log('\n🎯 FOUND THE ERROR!');
        console.log(`📍 Location: ${nameError.message}`);
        console.log('🔍 This is the exact error we need to fix.');
      }
    } else {
      console.log('✅ No errors captured - all steps passed successfully');
    }

  } catch (error) {
    console.error('💥 Fatal Error:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('Cannot read properties of undefined (reading \'name\')')) {
      console.log('\n🎯 FOUND THE TARGET ERROR!');
      console.log('📍 The error is exactly what we were looking for.');
      console.log('🔍 Need to find where .name is being accessed without checking.');
    }
  }
}

debug500Error();
