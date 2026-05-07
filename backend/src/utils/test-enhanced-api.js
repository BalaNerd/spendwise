import { SpendWiseExcelExporter } from './excel-export-enhanced.js';

// Test the enhanced export API functionality
async function testEnhancedAPI() {
  console.log('🧪 Testing Enhanced Export API...');
  
  // Simulate API request data
  const mockRequest = {
    body: {
      transactions: [
        { date: '2024-02-15', amount: 1500, category: 'Food & Dining', type: 'expense', recurring: false },
        { date: '2024-02-10', amount: 99, category: 'Netflix', type: 'subscription', recurring: true },
        { date: '2024-02-05', amount: 2500, category: 'Rent', type: 'expense', recurring: true },
        { date: '2024-02-01', amount: 500, category: 'Transportation', type: 'expense', recurring: false },
        { date: '2024-01-20', amount: 1200, category: 'Shopping', type: 'expense', recurring: false },
        { date: '2024-01-15', amount: 99, category: 'Netflix', type: 'subscription', recurring: true },
        { date: '2024-01-10', amount: 800, category: 'Groceries', type: 'expense', recurring: false }
      ],
      options: {
        monthlyBudget: 10000,
        netSettlementPosition: 500,
        currentMonth: '2024-02',
        previousMonth: '2024-01'
      }
    }
  };

  try {
    // Simulate the API endpoint logic
    const { transactions, options = {} } = mockRequest.body;

    // Validate input
    if (!transactions || !Array.isArray(transactions)) {
      console.error('❌ Invalid input: transactions array is required');
      return;
    }

    // Validate transaction structure
    for (const transaction of transactions) {
      if (!transaction.date || typeof transaction.amount !== 'number' || !transaction.type) {
        console.error('❌ Invalid transaction format:', transaction);
        return;
      }
    }

    console.log('✅ Input validation passed');
    console.log(`📊 Processing ${transactions.length} transactions`);

    // Generate Excel report with charts
    const workbook = await SpendWiseExcelExporter.createReport(transactions, options);

    // Save to file to verify content
    const filename = 'api-test-enhanced-report.xlsx';
    await workbook.xlsx.writeFile(filename);
    
    console.log(`✅ API test successful: ${filename} generated`);
    console.log('📈 Report includes:');
    console.log('- Executive Dashboard with KPI metrics');
    console.log('- Detailed transactions table');
    console.log('- Category breakdown with pie chart');
    console.log('- Monthly trend with bar chart');
    console.log('- Professional styling and formatting');

    // Test metrics calculation separately
    const exporter = new SpendWiseExcelExporter();
    const metrics = exporter.calculateMetrics(transactions, options);
    
    console.log('\n📊 Final Metrics:');
    console.log(`Total Expenses: ₹${metrics.totalExpenses.toLocaleString('en-IN')}`);
    console.log(`Total Subscriptions: ₹${metrics.totalSubscriptions.toLocaleString('en-IN')}`);
    console.log(`Total Spend: ₹${metrics.totalSpend.toLocaleString('en-IN')}`);
    console.log(`Growth %: ${metrics.growthPercent.toFixed(1)}%`);
    console.log(`Budget Usage %: ${metrics.budgetUsagePercent.toFixed(1)}%`);
    console.log(`Net Settlement Position: ₹${metrics.netSettlementPosition.toLocaleString('en-IN')}`);

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testEnhancedAPI();
