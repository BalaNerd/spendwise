import { SpendWiseExcelExporter } from './excel-export-enhanced.js';

// Test data
const testTransactions = [
  { date: '2024-02-15', amount: 1500, category: 'Food & Dining', type: 'expense', recurring: false },
  { date: '2024-02-10', amount: 99, category: 'Netflix', type: 'subscription', recurring: true },
  { date: '2024-02-05', amount: 2500, category: 'Rent', type: 'expense', recurring: true },
  { date: '2024-02-01', amount: 500, category: 'Transportation', type: 'expense', recurring: false },
  { date: '2024-01-20', amount: 1200, category: 'Shopping', type: 'expense', recurring: false },
  { date: '2024-01-15', amount: 99, category: 'Netflix', type: 'subscription', recurring: true },
  { date: '2024-01-10', amount: 800, category: 'Groceries', type: 'expense', recurring: false },
  { date: '2023-12-25', amount: 2000, category: 'Shopping', type: 'expense', recurring: false },
  { date: '2023-12-15', amount: 99, category: 'Netflix', type: 'subscription', recurring: true },
  { date: '2023-12-01', amount: 2500, category: 'Rent', type: 'expense', recurring: true }
];

const testOptions = {
  monthlyBudget: 10000,
  netSettlementPosition: 500,
  currentMonth: '2024-02',
  previousMonth: '2024-01'
};

// Test the export functionality
async function testExport() {
  try {
    console.log('Testing enhanced Excel export...');
    
    // Create the workbook
    const workbook = await SpendWiseExcelExporter.createReport(testTransactions, testOptions);
    
    // Save to file
    const filename = 'test-spendwise-report.xlsx';
    await workbook.xlsx.writeFile(filename);
    
    console.log(`✅ Excel report generated successfully: ${filename}`);
    console.log('File includes:');
    console.log('- Executive Dashboard with KPI metrics');
    console.log('- Detailed transactions table');
    console.log('- Category breakdown with pie chart');
    console.log('- Monthly trend with bar chart');
    console.log('- Professional styling and formatting');
    
  } catch (error) {
    console.error('❌ Error generating Excel report:', error);
  }
}

// Test metrics calculation only
async function testMetrics() {
  try {
    console.log('\nTesting metrics calculation...');
    
    const exporter = new SpendWiseExcelExporter();
    const metrics = exporter.calculateMetrics(testTransactions, testOptions);
    
    console.log('📊 Calculated Metrics:');
    console.log(`Total Expenses: ₹${metrics.totalExpenses.toLocaleString('en-IN')}`);
    console.log(`Total Subscriptions: ₹${metrics.totalSubscriptions.toLocaleString('en-IN')}`);
    console.log(`Total Spend: ₹${metrics.totalSpend.toLocaleString('en-IN')}`);
    console.log(`Growth %: ${metrics.growthPercent.toFixed(1)}%`);
    console.log(`Budget Usage %: ${metrics.budgetUsagePercent.toFixed(1)}%`);
    console.log(`Net Settlement Position: ₹${metrics.netSettlementPosition.toLocaleString('en-IN')}`);
    
    console.log('\n📈 Category Breakdown:');
    metrics.categoryBreakdown.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.category}: ₹${cat.totalAmount.toLocaleString('en-IN')} (${cat.percentage.toFixed(1)}%)`);
    });
    
    console.log('\n📅 Monthly Trend:');
    metrics.monthlyTrend.forEach((trend) => {
      console.log(`${trend.month}: Expenses ₹${trend.totalExpenses.toLocaleString('en-IN')}, Subscriptions ₹${trend.totalSubscriptions.toLocaleString('en-IN')}, Total ₹${trend.totalSpend.toLocaleString('en-IN')}`);
    });
    
  } catch (error) {
    console.error('❌ Error calculating metrics:', error);
  }
}

// Run tests
async function runTests() {
  await testMetrics();
  await testExport();
  process.exit(0);
}

runTests();
