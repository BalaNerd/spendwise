import ExcelJS from 'exceljs';
import { SpendWiseExcelExporter } from './excel-export-enhanced.js';

async function debugExcelGeneration() {
  console.log('🔍 Debugging Excel generation...');
  
  // Test data
  const testTransactions = [
    { date: '2024-02-15', amount: 1500, category: 'Food & Dining', type: 'expense', recurring: false },
    { date: '2024-02-10', amount: 99, category: 'Netflix', type: 'subscription', recurring: true },
    { date: '2024-02-05', amount: 2500, category: 'Rent', type: 'expense', recurring: true }
  ];

  const testOptions = {
    monthlyBudget: 10000,
    netSettlementPosition: 500,
    currentMonth: '2024-02',
    previousMonth: '2024-01'
  };

  try {
    // Test 1: Check metrics calculation
    console.log('\n📊 Testing metrics calculation...');
    const exporter = new SpendWiseExcelExporter();
    const metrics = exporter.calculateMetrics(testTransactions, testOptions);
    
    console.log('Calculated metrics:');
    console.log(`- Total Expenses: ${metrics.totalExpenses}`);
    console.log(`- Total Subscriptions: ${metrics.totalSubscriptions}`);
    console.log(`- Total Spend: ${metrics.totalSpend}`);
    console.log(`- Growth %: ${metrics.growthPercent}`);
    console.log(`- Budget Usage %: ${metrics.budgetUsagePercent}`);

    // Test 2: Create simple Excel to test value writing
    console.log('\n📝 Testing simple Excel value writing...');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');
    
    // Test different ways of writing values
    worksheet.getCell('A1').value = 1500;
    worksheet.getCell('A1').numFmt = '₹#,##0.00';
    
    worksheet.getCell('A2').value = 99;
    worksheet.getCell('A2').numFmt = '₹#,##0.00';
    
    worksheet.getCell('A3').value = 2500;
    worksheet.getCell('A3').numFmt = '₹#,##0.00';
    
    worksheet.getCell('A4').value = 4099;
    worksheet.getCell('A4').numFmt = '₹#,##0.00';
    
    worksheet.getCell('B1').value = 'Direct Value';
    worksheet.getCell('B2').value = 'Formatted Value';
    
    await workbook.xlsx.writeFile('debug-simple.xlsx');
    console.log('✅ Simple Excel file created: debug-simple.xlsx');

    // Test 3: Generate full report
    console.log('\n📈 Testing full report generation...');
    const fullWorkbook = await exporter.generateExcelReport(testTransactions, testOptions);
    await fullWorkbook.xlsx.writeFile('debug-full-report.xlsx');
    console.log('✅ Full report created: debug-full-report.xlsx');

    // Test 4: Check cell values directly
    console.log('\n🔬 Testing cell value inspection...');
    const testWorkbook = new ExcelJS.Workbook();
    const testSheet = testWorkbook.addWorksheet('Cell Test');
    
    const testCell = testSheet.getCell('A1');
    testCell.value = 1500;
    testCell.numFmt = '₹#,##0.00';
    
    console.log(`Cell value: ${testCell.value}`);
    console.log(`Cell number format: ${testCell.numFmt}`);
    console.log(`Cell type: ${typeof testCell.value}`);

    await testWorkbook.xlsx.writeFile('debug-cell-test.xlsx');
    console.log('✅ Cell test file created: debug-cell-test.xlsx');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

debugExcelGeneration();
