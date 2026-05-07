import ExcelJS from 'exceljs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

/**
 * Validate font object to prevent undefined properties
 */
const validateFont = (font) => {
  if (!font || typeof font !== 'object') {
    console.error('❌ Invalid font object:', font);
    return {
      name: 'Calibri',
      family: 2,
      size: 12,
      bold: false,
      italic: false,
      underline: false,
      color: { argb: 'FF000000' }
    };
  }
  
  // Ensure all required properties exist with defaults
  return {
    name: font.name || 'Calibri',
    family: font.family || 2,
    size: font.size || 12,
    bold: font.bold || false,
    italic: font.italic || false,
    underline: font.underline || false,
    color: font.color || { argb: 'FF000000' }
  };
};

export class SpendWiseExcelExporter {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  /**
   * Calculate all financial metrics from transactions
   */
  async calculateMetricsFromDatabase(transactions, options = {}) {
    // Handle empty data
    if (!transactions || transactions.length === 0) {
      return {
        totalExpenses: 0,
        totalSubscriptions: 0,
        totalSpend: 0,
        growthPercent: 0,
        budgetUsagePercent: 0,
        netSettlementPosition: options.netSettlementPosition || 0,
        categoryBreakdown: [],
        monthlyTrend: []
      };
    }

    // For export, rely solely on the provided transactions and options.
    // This keeps the XLSX in sync with what the user sees in the UI and
    // avoids any backend/Supabase mismatches.
    const totalExpenses = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalSubscriptions = 0;
    const totalSpend = totalExpenses + totalSubscriptions;
    const txMonthlyBudget = Number(options.monthlyBudget || 0);

    // Simple category breakdown and monthly trend directly from transactions
    const categoryMap = new Map();
    transactions.forEach((t) => {
      if (!t || typeof t.amount !== 'number') return;
      const category = t.category || 'Uncategorized';
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + Number(t.amount));
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, totalAmount]) => ({
        category,
        totalAmount,
        percentage: totalExpenses > 0 ? totalAmount / totalExpenses : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const monthlyMap = new Map();
    transactions.forEach((t) => {
      if (!t || !t.date || typeof t.amount !== 'number') return;
      const month = t.date.substring(0, 7);
      const current = monthlyMap.get(month) || { expenses: 0 };
      current.expenses += Number(t.amount);
      monthlyMap.set(month, current);
    });

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        totalExpenses: data.expenses,
        totalSubscriptions: 0,
        totalSpend: data.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const budgetUsagePercent = txMonthlyBudget > 0 ? totalSpend / txMonthlyBudget : 0;

    return {
      totalExpenses,
      totalSubscriptions,
      totalSpend,
      growthPercent: 0,
      budgetUsagePercent,
      netSettlementPosition: options.netSettlementPosition || 0,
      categoryBreakdown,
      monthlyTrend,
    };

    // NOTE: The code below is kept for reference but is no longer used,
    // since we return early using transaction-only calculations above.
    let profile, user;
    try {
      const result = await supabase.auth.getUser();
      user = result.data?.user;
      if (!user) throw new Error('User not authenticated');
      
      const profileResult = await supabase
        .from('users')
        .select('monthly_budget')
        .eq('id', user.id)
        .single();
      profile = profileResult.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      profile = { monthly_budget: options.monthlyBudget || 0 };
    }
    
    const monthlyBudget = Number(profile?.monthly_budget || options.monthlyBudget || 0);

    // Get subscriptions (monthly equivalent) - like frontend does
    // NOTE: DB-backed subscription logic retained below is no longer used,
    // as we return early using transaction-only calculations above.

    // NOTE: Legacy Supabase-backed metric calculation removed; metrics
    // are now computed earlier directly from the provided transactions.
  }

  /**
   * Generate category pie chart using Chart.js
   */
  async generateCategoryPieChart(categoryBreakdown) {
    if (!categoryBreakdown || categoryBreakdown.length === 0) {
      return null;
    }

    // Defensive: ensure all category breakdown items have required properties
    const validBreakdown = categoryBreakdown.filter(cat => 
      cat && 
      typeof cat.category !== 'undefined' && 
      typeof cat.totalAmount === 'number'
    );

    if (validBreakdown.length === 0) {
      return null;
    }

    const width = 600;
    const height = 400;
    const chartRenderer = new ChartJSNodeCanvas({ width, height });

    const colors = [
      '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
      '#06B6D4', '#8B5CF6', '#EF4444', '#F97316', '#84CC16'
    ];

    const configuration = {
      type: 'pie',
      data: {
        labels: validBreakdown.map(cat => cat.category || 'Uncategorized'),
        datasets: [{
          data: validBreakdown.map(cat => cat.totalAmount),
          backgroundColor: colors.slice(0, validBreakdown.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                family: 'Calibri',
                size: 12
              },
              padding: 15
            }
          },
          title: {
            display: true,
            text: 'Category Distribution',
            font: {
              family: 'Calibri',
              size: 16,
              weight: 'bold'
            },
            padding: 20
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                // Defensive: ensure context and label exist
                if (!context || !context.label) {
                  return 'No data';
                }
                
                const value = context.parsed || 0;
                const total = context.dataset?.data?.reduce((a, b) => a + b, 0) || 0;
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return `${context.label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    return await chartRenderer.renderToBuffer(configuration);
  }

  /**
   * Generate monthly trend bar chart using Chart.js
   */
  async generateMonthlyTrendChart(monthlyTrend) {
    if (!monthlyTrend || monthlyTrend.length === 0) {
      return null;
    }

    // Defensive: ensure all trend items have required properties
    const validTrend = monthlyTrend.filter(trend => 
      trend && 
      typeof trend.month !== 'undefined' && 
      typeof trend.totalSpend === 'number'
    );

    if (validTrend.length === 0) {
      return null;
    }

    const width = 800;
    const height = 400;
    const chartRenderer = new ChartJSNodeCanvas({ width, height });

    const configuration = {
      type: 'bar',
      data: {
        labels: validTrend.map(trend => {
          const date = new Date(trend.month + '-01');
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        datasets: [{
          label: 'Total Spend',
          data: validTrend.map(trend => trend.totalSpend),
          backgroundColor: '#4F46E5',
          borderColor: '#4F46E5',
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Monthly Spend Trend',
            font: {
              family: 'Calibri',
              size: 16,
              weight: 'bold'
            },
            padding: 20
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Total: ₹${context.parsed.y.toLocaleString('en-IN')}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₹' + value.toLocaleString('en-IN');
              },
              font: {
                family: 'Calibri',
                size: 11
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            ticks: {
              font: {
                family: 'Calibri',
                size: 11
              }
            },
            grid: {
              display: false
            }
          }
        }
      }
    };

    return await chartRenderer.renderToBuffer(configuration);
  }

  /**
   * Create header section with title and date
   */
  createHeaderSection(sheet) {
    // Navy background for headers
    const navyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0B1E3D' }
    };

    // White bold font for headers
    const whiteFont = {
      name: 'Calibri',
      family: 2,
      size: 14,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    // Main title
    sheet.mergeCells('A1:F2');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'SpendWise Financial Report';
    titleCell.font = whiteFont;
    titleCell.fill = navyFill;
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Subtitle with date
    sheet.mergeCells('A3:F3');
    const subtitleCell = sheet.getCell('A3');
    subtitleCell.value = `Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;
    subtitleCell.font = whiteFont;
    subtitleCell.fill = navyFill;
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  /**
   * Create KPI metrics section
   */
  createKPISection(sheet, metrics) {
    let currentRow = 5;

    // Defensive: ensure metrics object exists
    if (!metrics || typeof metrics !== 'object') {
      console.error('❌ Invalid metrics object:', metrics);
      return currentRow;
    }

    // Header font for table headers
    const headerFont = {
      name: 'Calibri',
      family: 2,
      size: 12,
      bold: true,
      color: { argb: 'FF000000' }
    };

    // Large metric font for KPIs
    const metricFont = {
      name: 'Calibri',
      family: 2,
      size: 20,
      bold: true,
      color: { argb: 'FF000000' }
    };

    // Table font for data
    const tableFont = {
      name: 'Calibri',
      family: 2,
      size: 11,
      color: { argb: 'FF000000' }
    };

    // Validate fonts to ensure they have required properties
    const validatedHeaderFont = validateFont(headerFont);
    const validatedMetricFont = validateFont(metricFont);

    const kpis = [
      { label: 'Total Expenses', value: metrics.totalExpenses, isPercentage: false },
      { label: 'Total Subscriptions', value: metrics.totalSubscriptions, isPercentage: false },
      { label: 'Total Spend', value: metrics.totalSpend, isPercentage: false },
      { label: 'Growth %', value: metrics.growthPercent, isPercentage: true },
      { label: 'Budget Usage %', value: metrics.budgetUsagePercent, isPercentage: true },
      { label: 'Net Settlement Position', value: metrics.netSettlementPosition, isPercentage: false }
    ];

    // Defensive: validate KPI values
    kpis.forEach(kpi => {
      if (typeof kpi.value === 'undefined') {
        kpi.value = 0;
      }
    });

    // Navy background for headers
    const navyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0B1E3D' }
    };

    // Light grey background for sections
    const lightGreyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' }
    };

    // Thin border for cells
    const borderThin = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    kpis.forEach((kpi, index) => {
      const startCol = (index % 2) * 3 + 1;
      const endCol = startCol + 2;

      // Label row
      const labelCell = sheet.getCell(currentRow, startCol);
      labelCell.value = kpi.label;
      labelCell.font = validatedHeaderFont;
      labelCell.fill = navyFill;
      labelCell.border = borderThin;
      labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.mergeCells(currentRow, startCol, currentRow, endCol);

      // Value row
      const valueCell = sheet.getCell(currentRow + 1, startCol);
      
      // Determine color based on value
      let fontColor = { argb: 'FF000000' };
      if (kpi.isPercentage) {
        if (kpi.label === 'Growth %') {
          if (kpi.value > 0) fontColor = { argb: 'FFDC2626' }; // Red for positive growth (more spending)
          else if (kpi.value < 0) fontColor = { argb: 'FF10B981' }; // Green for negative growth (less spending)
        } else if (kpi.label === 'Budget Usage %') {
          if (kpi.value > 90) fontColor = { argb: 'FFDC2626' }; // Red for high usage
          else if (kpi.value > 60) fontColor = { argb: 'FFF59E0B' }; // Amber for medium usage
          else fontColor = { argb: 'FF10B981' }; // Green for low usage
        }
      } else if (kpi.label === 'Net Settlement Position') {
        if (kpi.value >= 0) fontColor = { argb: 'FF10B981' }; // Green for positive
        else fontColor = { argb: 'FFDC2626' }; // Red for negative
      }

      const valueFont = { ...validatedMetricFont, color: fontColor };
      
      if (kpi.isPercentage) {
        valueCell.value = `${kpi.value.toFixed(1)}%`;
      } else {
        valueCell.value = kpi.value;
        valueCell.numFmt = '₹#,##0.00';
      }
      
      valueCell.font = valueFont;
      valueCell.fill = lightGreyFill;
      valueCell.border = borderThin;
      valueCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.mergeCells(currentRow + 1, startCol, currentRow + 1, endCol);

      if (index % 2 === 1) currentRow += 3;
    });

    return currentRow + 3;
  }

  /**
   * Create transactions table
   */
  createTransactionsTable(sheet, transactions, startRow) {
    let currentRow = startRow + 2;

    // Handle no data
    if (!transactions || transactions.length === 0) {
      const noDataCell = sheet.getCell(currentRow, 1);
      noDataCell.value = 'No transaction data available';
      noDataCell.font = { name: 'Calibri', size: 12, italic: true, color: { argb: 'FF6B7280' } };
      sheet.mergeCells(currentRow, 1, currentRow, 5);
      return currentRow + 1;
    }

    // Section header
    const sectionHeaderCell = sheet.getCell(currentRow, 1);
    sectionHeaderCell.value = 'Transaction Details';
    const metricFont = {
      name: 'Calibri',
      family: 2,
      size: 14,
      bold: true,
      color: { argb: 'FF000000' }
    };
    const validatedMetricFont = validateFont(metricFont);
    
    sectionHeaderCell.font = validatedMetricFont;
    sectionHeaderCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.mergeCells(currentRow, 1, currentRow, 5);
    currentRow++;

    // Table headers
    const headerFont = {
      name: 'Calibri',
      family: 2,
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    // Defensive: validate header font
    const validatedHeaderFont = validateFont(headerFont);

    const navyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0B1E3D' }
    };

    // Light grey background for zebra striping
    const lightGreyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' }
    };

    const borderThin = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    const headers = ['Date', 'Amount', 'Category', 'Type', 'Recurring'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = validatedHeaderFont;
      cell.fill = navyFill;
      cell.border = borderThin;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    currentRow++;

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Table data
    sortedTransactions.forEach((transaction, index) => {
      const row = currentRow + index;

      // Date
      const dateCell = sheet.getCell(row, 1);
      dateCell.value = new Date(transaction.date);
      dateCell.numFmt = 'dd-mmm-yyyy';
      dateCell.border = borderThin;

      // Amount
      const amountCell = sheet.getCell(row, 2);
      amountCell.value = transaction.amount;
      amountCell.numFmt = '₹#,##0.00';
      amountCell.border = borderThin;

      // Category
      const categoryCell = sheet.getCell(row, 3);
      categoryCell.value = transaction.category || 'Uncategorized';
      categoryCell.border = borderThin;

      // Type
      const typeCell = sheet.getCell(row, 4);
      typeCell.value = transaction.type;
      typeCell.border = borderThin;

      // Recurring
      const recurringCell = sheet.getCell(row, 5);
      recurringCell.value = transaction.recurring ? 'Yes' : 'No';
      recurringCell.border = borderThin;

      // Zebra striping
      if (index % 2 === 0) {
        for (let col = 1; col <= 5; col++) {
          const cell = sheet.getCell(row, col);
          cell.fill = lightGreyFill;
        }
      }
    });

    // Set column widths
    sheet.getColumn(1).width = 15; // Date
    sheet.getColumn(2).width = 15; // Amount
    sheet.getColumn(3).width = 20; // Category
    sheet.getColumn(4).width = 15; // Type
    sheet.getColumn(5).width = 12; // Recurring

    return currentRow + sortedTransactions.length;
  }

  /**
   * Create category breakdown table
   */
  createCategoryBreakdownTable(sheet, categoryBreakdown, startRow) {
    let currentRow = startRow + 2;

    // Handle no data
    if (!categoryBreakdown || categoryBreakdown.length === 0) {
      const noDataCell = sheet.getCell(currentRow, 1);
      noDataCell.value = 'No category data available';
      noDataCell.font = { name: 'Calibri', size: 12, italic: true, color: { argb: 'FF6B7280' } };
      sheet.mergeCells(currentRow, 1, currentRow, 3);
      return currentRow + 1;
    }

    // Defensive: filter valid category breakdown items
    const validCategories = categoryBreakdown.filter(cat => 
      cat && 
      typeof cat.category !== 'undefined' && 
      typeof cat.totalAmount === 'number'
    );

    if (validCategories.length === 0) {
      const noDataCell = sheet.getCell(currentRow, 1);
      noDataCell.value = 'No valid category data available';
      noDataCell.font = { name: 'Calibri', size: 12, italic: true, color: { argb: 'FF6B7280' } };
      sheet.mergeCells(currentRow, 1, currentRow, 3);
      return currentRow + 1;
    }

    // Light grey background for zebra striping
    const categoryLightGreyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' }
    };

    // Thin border for cells
    const categoryBorderThin = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    // Header font for table headers
    const headerFont = {
      name: 'Calibri',
      family: 2,
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    // Table data
    const tableFont = {
      name: 'Calibri',
      family: 2,
      size: 11,
      color: { argb: 'FF000000' }
    };

    // Defensive: validate font objects
    const validatedHeaderFont = validateFont(headerFont);
    const validatedTableFont = validateFont(tableFont);

    // Navy background for headers
    const navyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0B1E3D' }
    };

    const headers = ['Category', 'Amount', 'Percentage'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = validatedHeaderFont;
      cell.fill = navyFill;
      cell.border = categoryBorderThin;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    currentRow++;

    // Light grey background for zebra striping
    const lightGreyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' }
    };

    validCategories.forEach((category, index) => {
      const row = currentRow + index;

      // Category
      const categoryCell = sheet.getCell(row, 1);
      categoryCell.value = category.category || 'Uncategorized';
      categoryCell.border = categoryBorderThin;

      // Amount
      const amountCell = sheet.getCell(row, 2);
      amountCell.value = category.totalAmount;
      amountCell.numFmt = '₹#,##0.00';
      amountCell.border = categoryBorderThin;

      // Percentage
      const percentageCell = sheet.getCell(row, 3);
      percentageCell.value = category.percentage;
      percentageCell.numFmt = '0.0%';
      percentageCell.border = categoryBorderThin;

      // Zebra striping
      if (index % 2 === 0) {
        for (let col = 1; col <= 3; col++) {
          const cell = sheet.getCell(row, col);
          cell.fill = categoryLightGreyFill;
        }
      }
    });

    // Total row
    const totalRow = currentRow + validCategories.length;
    const totalCell = sheet.getCell(totalRow, 1);
    totalCell.value = 'TOTAL';
    totalCell.font = { ...validatedTableFont, bold: true };
    totalCell.border = categoryBorderThin;

    const totalAmountCell = sheet.getCell(totalRow, 2);
    const totalAmount = validCategories.reduce((sum, cat) => sum + cat.totalAmount, 0);
    totalAmountCell.value = totalAmount;
    totalAmountCell.numFmt = '₹#,##0.00';
    totalAmountCell.font = { ...validatedTableFont, bold: true };
    totalAmountCell.border = categoryBorderThin;

    const totalPercentageCell = sheet.getCell(totalRow, 3);
    totalPercentageCell.value = 1;
    totalPercentageCell.numFmt = '0.0%';
    totalPercentageCell.font = { ...validatedTableFont, bold: true };
    totalPercentageCell.border = categoryBorderThin;

    return totalRow + 1;
  }

  /**
   * Insert chart image into worksheet
   */
  insertChartImage(sheet, imageBuffer, startRow, startCol, width, height) {
    if (!imageBuffer) return startRow;

    const imageId = this.workbook.addImage({
      buffer: imageBuffer,
      extension: 'png'
    });

    const excelWidth = width / 7; // pixels to Excel column units
    const excelHeight = height / 20; // pixels to Excel row units

    sheet.addImage(imageId, {
      tl: { col: startCol - 1, row: startRow - 1 },
      ext: { width: excelWidth * 7, height: excelHeight * 20 }
    });

    return startRow + Math.ceil(excelHeight);
  }

  async generateExcelReport(transactions, options = {}) {
    console.log('📈 Starting Excel report generation...');
    
    // Validate inputs
    if (!transactions || !Array.isArray(transactions)) {
      throw new Error('Invalid transactions data provided');
    }
    
    console.log(`📊 Processing ${transactions.length} transactions...`);
    console.log('📋 Transaction sample:', JSON.stringify(transactions.slice(0, 2), null, 2));

    // Calculate metrics using database data (like frontend)
    const metrics = await this.calculateMetricsFromDatabase(transactions, options);
    console.log('✅ Metrics calculated successfully');

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    console.log('📓 Workbook created');
    
    // Create Executive Dashboard Sheet with safe name
    const dashboardSheet = workbook.addWorksheet('Executive Dashboard');
    console.log('📋 Dashboard worksheet created');
    
    // Validate worksheet before proceeding
    if (!dashboardSheet) {
      throw new Error('Failed to create dashboard worksheet');
    }
    
    // Create KPI section
    const kpiEndRow = this.createKPISection(dashboardSheet, metrics);
    console.log('✅ KPI section created');

    // Create transactions table
    const transactionsEndRow = this.createTransactionsTable(dashboardSheet, transactions, kpiEndRow);
    console.log('✅ Transactions table created');

    // Create category breakdown table
    const categoryEndRow = this.createCategoryBreakdownTable(dashboardSheet, metrics.categoryBreakdown, transactionsEndRow);
    console.log('✅ Category breakdown table created');

    // Generate and insert category pie chart (with error handling)
    try {
      console.log('🎨 Generating category pie chart...');
      const pieChartBuffer = await this.generateCategoryPieChart(metrics.categoryBreakdown);
      if (pieChartBuffer) {
        const chartRow1 = this.insertChartImage(dashboardSheet, pieChartBuffer, categoryEndRow + 2, 1, 600, 400);
        console.log('✅ Category pie chart inserted');
      } else {
        console.log('⚠️ Category pie chart generation returned null');
      }
    } catch (chartError) {
      console.error('⚠️ Failed to generate category pie chart:', chartError.message);
      // Continue without chart
    }

    // Generate and insert monthly trend chart (with error handling)
    try {
      console.log('📈 Generating monthly trend chart...');
      const trendChartBuffer = await this.generateMonthlyTrendChart(metrics.monthlyTrend);
      if (trendChartBuffer) {
        this.insertChartImage(dashboardSheet, trendChartBuffer, categoryEndRow + 2, 1, 800, 400);
        console.log('✅ Monthly trend chart inserted');
      } else {
        console.log('⚠️ Monthly trend chart generation returned null');
      }
    } catch (chartError) {
      console.error('⚠️ Failed to generate monthly trend chart:', chartError.message);
      // Continue without chart
    }

    // Freeze top rows
    dashboardSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Protect sheet (optional) - with error handling
    try {
      dashboardSheet.protect('spendwise123', {
        selectLockedCells: true,
        formatCells: false,
        formatRows: false,
        formatColumns: false,
        insertRows: false,
        insertColumns: false,
        deleteRows: false,
        deleteColumns: false
      });
      console.log('✅ Sheet protected');
    } catch (protectError) {
      console.error('⚠️ Failed to protect sheet:', protectError.message);
      // Continue without protection
    }

    console.log('✅ Excel report generation completed');
    return workbook;
  }

  /**
   * Static method to create and export Excel report
   */
  static async createReport(transactions, options = {}) {
    const exporter = new SpendWiseExcelExporter();
    const workbook = await exporter.generateExcelReport(transactions, options);
    return workbook;
  }
}
