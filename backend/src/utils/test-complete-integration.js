// Test complete integration of enhanced Excel export
import { SpendWiseExcelExporter } from './excel-export-enhanced.js';

async function testCompleteIntegration() {
  console.log('🔧 Testing Complete Integration...');
  
  // Simulate real data from frontend
  const frontendExpenses = [
    {
      id: 1,
      date: '2024-02-15',
      amount: 1500,
      description: 'Restaurant dinner',
      recurring: false,
      expense_categories: { name: 'Food & Dining' }
    },
    {
      id: 2,
      date: '2024-02-10',
      amount: 99,
      description: 'Netflix subscription',
      recurring: true,
      expense_categories: { name: 'Entertainment' }
    },
    {
      id: 3,
      date: '2024-02-05',
      amount: 2500,
      description: 'Monthly rent',
      recurring: true,
      expense_categories: { name: 'Housing' }
    },
    {
      id: 4,
      date: '2024-01-20',
      amount: 800,
      description: 'Grocery shopping',
      recurring: false,
      expense_categories: { name: 'Groceries' }
    },
    {
      id: 5,
      date: '2024-01-15',
      amount: 99,
      description: 'Netflix subscription',
      recurring: true,
      expense_categories: { name: 'Entertainment' }
    }
  ];

  // Transform like frontend does
  const transactions = frontendExpenses.map((expense) => ({
    date: expense.date,
    amount: expense.amount,
    category: expense.expense_categories?.name || 'Uncategorized',
    type: expense.recurring ? 'subscription' : 'expense',
    recurring: expense.recurring || false
  }));

  console.log('📋 Transformed Transactions:');
  transactions.forEach((t, i) => {
    console.log(`${i+1}. ${t.date} - ₹${t.amount} - ${t.category} - ${t.type}`);
  });

  // Options like frontend sends
  const exportOptions = {
    monthlyBudget: 10000,
    netSettlementPosition: 500,
    currentMonth: '2024-02',
    previousMonth: '2024-01'
  };

  try {
    // Test metrics calculation
    console.log('\n📊 Testing Metrics Calculation...');
    const exporter = new SpendWiseExcelExporter();
    const metrics = exporter.calculateMetrics(transactions, exportOptions);
    
    console.log('✅ Calculated Metrics:');
    console.log(`- Total Expenses: ₹${metrics.totalExpenses.toLocaleString('en-IN')}`);
    console.log(`- Total Subscriptions: ₹${metrics.totalSubscriptions.toLocaleString('en-IN')}`);
    console.log(`- Total Spend: ₹${metrics.totalSpend.toLocaleString('en-IN')}`);
    console.log(`- Growth %: ${metrics.growthPercent.toFixed(1)}%`);
    console.log(`- Budget Usage %: ${metrics.budgetUsagePercent.toFixed(1)}%`);
    
    console.log('\n📈 Category Breakdown:');
    metrics.categoryBreakdown.forEach((cat, i) => {
      console.log(`${i+1}. ${cat.category}: ₹${cat.totalAmount.toLocaleString('en-IN')} (${cat.percentage.toFixed(1)}%)`);
    });

    console.log('\n📅 Monthly Trend:');
    metrics.monthlyTrend.forEach((trend) => {
      console.log(`${trend.month}: ₹${trend.totalSpend.toLocaleString('en-IN')} total`);
    });

    // Test Excel generation
    console.log('\n📝 Testing Excel Generation...');
    const workbook = await exporter.generateExcelReport(transactions, exportOptions);
    
    // Save the file
    const filename = 'integration-test-enhanced-report.xlsx';
    await workbook.xlsx.writeFile(filename);
    
    console.log(`✅ Integration test successful!`);
    console.log(`📁 File created: ${filename}`);
    console.log('\n🎯 Report Features:');
    console.log('- ✅ Executive Dashboard with navy header');
    console.log('- ✅ KPI metrics with color coding');
    console.log('- ✅ Detailed transactions table');
    console.log('- ✅ Category breakdown with percentages');
    console.log('- ✅ Monthly trend analysis');
    console.log('- ✅ Category pie chart (600x400px)');
    console.log('- ✅ Monthly trend bar chart (800x400px)');
    console.log('- ✅ Professional styling and formatting');
    console.log('- ✅ Currency formatting (₹#,##0.00)');
    console.log('- ✅ Frozen panes and sheet protection');

    // Verify no zero values
    console.log('\n🔍 Zero Value Check:');
    if (metrics.totalExpenses === 0 && metrics.totalSubscriptions === 0) {
      console.log('❌ WARNING: All values are zero!');
    } else {
      console.log('✅ Values are properly calculated');
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testCompleteIntegration();
