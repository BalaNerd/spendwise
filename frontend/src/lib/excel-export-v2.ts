import * as ExcelJS from 'exceljs';

export interface Transaction {
  date: string;
  amount: number;
  category: string;
  type: 'expense' | 'subscription';
  recurring: boolean;
}

export interface ExportOptions {
  transactions: Transaction[];
  monthlyBudget?: number;
  netSettlementPosition?: number;
  currentMonth?: string; // YYYY-MM format
  previousMonth?: string; // YYYY-MM format
}

export interface CalculatedMetrics {
  totalExpenses: number;
  totalSubscriptions: number;
  totalSpend: number;
  growthPercent: number;
  budgetUsagePercent: number;
  netSettlementPosition: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrend: MonthlyTrend[];
}

export interface CategoryBreakdown {
  category: string;
  totalAmount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  totalExpenses: number;
  totalSubscriptions: number;
  totalSpend: number;
}

export class SpendWiseExcelExporter {
  private workbook: ExcelJS.Workbook;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  private calculateMetrics(transactions: Transaction[], options: ExportOptions): CalculatedMetrics {
    // Filter transactions by type
    const expenses = transactions.filter(t => t.type === 'expense');
    const subscriptions = transactions.filter(t => t.type === 'subscription');

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalSubscriptions = subscriptions.reduce((sum, t) => sum + t.amount, 0);
    const totalSpend = totalExpenses + totalSubscriptions;

    // Calculate growth percentage
    let growthPercent = 0;
    if (options.currentMonth && options.previousMonth) {
      const currentMonthTransactions = transactions.filter(t => 
        t.date.startsWith(options.currentMonth!)
      );
      const previousMonthTransactions = transactions.filter(t => 
        t.date.startsWith(options.previousMonth!)
      );
      
      const currentMonthTotal = currentMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
      const previousMonthTotal = previousMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      if (previousMonthTotal > 0) {
        growthPercent = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
      }
    }

    // Calculate budget usage
    const budgetUsagePercent = options.monthlyBudget && options.monthlyBudget > 0 
      ? (totalSpend / options.monthlyBudget) * 100 
      : 0;

    // Calculate category breakdown
    const categoryMap = new Map<string, number>();
    transactions.forEach(t => {
      const current = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, current + t.amount);
    });

    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([category, totalAmount]) => ({
        category,
        totalAmount,
        percentage: totalSpend > 0 ? (totalAmount / totalSpend) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Calculate monthly trend
    const monthlyMap = new Map<string, { expenses: number; subscriptions: number }>();
    transactions.forEach(t => {
      const month = t.date.substring(0,7); // YYYY-MM
      const current = monthlyMap.get(month) || { expenses: 0, subscriptions: 0 };
      
      if (t.type === 'expense') {
        current.expenses += t.amount;
      } else {
        current.subscriptions += t.amount;
      }
      
      monthlyMap.set(month, current);
    });

    const monthlyTrend: MonthlyTrend[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        totalExpenses: data.expenses,
        totalSubscriptions: data.subscriptions,
        totalSpend: data.expenses + data.subscriptions
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalExpenses,
      totalSubscriptions,
      totalSpend,
      growthPercent,
      budgetUsagePercent,
      netSettlementPosition: options.netSettlementPosition || 0,
      categoryBreakdown,
      monthlyTrend
    };
  }

  private createHeaderSection(sheet: ExcelJS.Worksheet): void {
    // Navy background for headers
    const navyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF0B1E3D' }
    };

    // White bold font for headers
    const whiteFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
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
    titleCell.alignment = { vertical: 'middle' as const, horizontal: 'center' as const };

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
    subtitleCell.alignment = { vertical: 'middle' as const, horizontal: 'center' as const };
  }

  private createKPISection(sheet: ExcelJS.Worksheet, metrics: CalculatedMetrics): number {
    let currentRow = 5;

    const kpis = [
      { label: 'Total Expenses', value: metrics.totalExpenses, isPercentage: false },
      { label: 'Total Subscriptions', value: metrics.totalSubscriptions, isPercentage: false },
      { label: 'Total Spend', value: metrics.totalSpend, isPercentage: false },
      { label: 'Growth %', value: metrics.growthPercent, isPercentage: true },
      { label: 'Budget Usage %', value: metrics.budgetUsagePercent, isPercentage: true },
      { label: 'Net Settlement Position', value: metrics.netSettlementPosition, isPercentage: false }
    ];

    // Header font for table headers
    const headerFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    // Large metric font for KPIs
    const metricFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 20,
      bold: true,
      color: { argb: 'FF000000' }
    };

    // Navy background for headers
    const navyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF0B1E3D' }
    };

    // Light grey background for sections
    const lightGreyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFF8F9FA' }
    };

    // Thin border for cells
    const borderThin = {
      top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } }
    };

    kpis.forEach((kpi, index) => {
      const startCol = (index % 2) * 3 + 1;
      const endCol = startCol + 2;

      // Label row
      const labelCell = sheet.getCell(currentRow, startCol);
      labelCell.value = kpi.label;
      labelCell.font = headerFont;
      labelCell.fill = navyFill;
      labelCell.border = borderThin;
      labelCell.alignment = { vertical: 'middle' as const, horizontal: 'center' as const };
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

      const valueFont = { ...metricFont, color: fontColor };
      
      if (kpi.isPercentage) {
        valueCell.value = `${kpi.value.toFixed(1)}%`;
      } else {
        valueCell.value = kpi.value;
        valueCell.numFmt = '₹#,##0.00';
      }
      
      valueCell.font = valueFont;
      valueCell.fill = lightGreyFill;
      valueCell.border = borderThin;
      valueCell.alignment = { vertical: 'middle' as const, horizontal: 'center' as const };
      sheet.mergeCells(currentRow + 1, startCol, currentRow + 1, endCol);

      if (index % 2 === 1) currentRow += 3;
    });

    return currentRow + 3;
  }

  private createTransactionsTable(sheet: ExcelJS.Worksheet, transactions: Transaction[], startRow: number): number {
    let currentRow = startRow + 2;

    // Section header
    const sectionHeaderCell = sheet.getCell(currentRow, 1);
    sectionHeaderCell.value = 'Transaction Details';
    const metricFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 14,
      bold: true,
      color: { argb: 'FF000000' }
    };
    sectionHeaderCell.font = metricFont;
    sectionHeaderCell.alignment = { vertical: 'middle' as const, horizontal: 'left' as const };
    sheet.mergeCells(currentRow, 1, currentRow, 5);
    currentRow++;

    // Table headers
    const headerFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    const navyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF0B1E3D' }
    };

    const borderThin = {
      top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } }
    };

    const headers = ['Date', 'Amount', 'Category', 'Type', 'Recurring'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = headerFont;
      cell.fill = navyFill;
      cell.border = borderThin;
      cell.alignment = { vertical: 'middle' as const, horizontal: 'center' as const };
    });
    currentRow++;

    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Table data
    const tableFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 11,
      color: { argb: 'FF000000' }
    };

    const lightGreyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFF8F9FA' }
    };

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

  private createCategoryBreakdownTable(sheet: ExcelJS.Worksheet, categoryBreakdown: CategoryBreakdown[], startRow: number): number {
    let currentRow = startRow + 2;

    // Section header
    const sectionHeaderCell = sheet.getCell(currentRow, 1);
    const metricFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 14,
      bold: true,
      color: { argb: 'FF000000' }
    };
    sectionHeaderCell.font = metricFont;
    sectionHeaderCell.alignment = { vertical: 'middle' as const, horizontal: 'left' as const };
    sheet.mergeCells(currentRow, 1, currentRow, 3);
    currentRow++;

    // Table headers
    const headerFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    const navyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF0B1E3D' }
    };

    const borderThin = {
      top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } }
    };

    const headers = ['Category', 'Amount', 'Percentage'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = headerFont;
      cell.fill = navyFill;
      cell.border = borderThin;
      cell.alignment = { vertical: 'middle' as const, horizontal: 'center' as const };
    });
    currentRow++;

    // Table data
    const tableFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 11,
      color: { argb: 'FF000000' }
    };

    const lightGreyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFF8F9FA' }
    };

    categoryBreakdown.forEach((category, index) => {
      const row = currentRow + index;

      // Category
      const categoryCell = sheet.getCell(row, 1);
      categoryCell.value = category.category;
      categoryCell.border = borderThin;

      // Amount
      const amountCell = sheet.getCell(row, 2);
      amountCell.value = category.totalAmount;
      amountCell.numFmt = '₹#,##0.00';
      amountCell.border = borderThin;

      // Percentage
      const percentageCell = sheet.getCell(row, 3);
      percentageCell.value = category.percentage;
      percentageCell.numFmt = '0.0%';
      percentageCell.border = borderThin;

      // Zebra striping
      if (index % 2 === 0) {
        for (let col = 1; col <= 3; col++) {
          const cell = sheet.getCell(row, col);
          cell.fill = lightGreyFill;
        }
      }
    });

    // Total row
    const totalRow = currentRow + categoryBreakdown.length;
    const totalCell = sheet.getCell(totalRow, 1);
    totalCell.value = 'TOTAL';
    totalCell.font = { ...tableFont, bold: true };
    totalCell.border = borderThin;

    const totalAmountCell = sheet.getCell(totalRow, 2);
    const totalAmount = categoryBreakdown.reduce((sum, cat) => sum + cat.totalAmount, 0);
    totalAmountCell.value = totalAmount;
    totalAmountCell.numFmt = '₹#,##0.00';
    totalAmountCell.font = { ...tableFont, bold: true };
    totalAmountCell.border = borderThin;

    const totalPercentageCell = sheet.getCell(totalRow, 3);
    totalPercentageCell.value = 100.0;
    totalPercentageCell.numFmt = '0.0%';
    totalPercentageCell.font = { ...tableFont, bold: true };
    totalPercentageCell.border = borderThin;

    // Set column widths
    sheet.getColumn(1).width = 25; // Category
    sheet.getColumn(2).width = 15; // Amount
    sheet.getColumn(3).width = 12; // Percentage

    return totalRow + 1;
  }

  private createMonthlyTrendTable(sheet: ExcelJS.Worksheet, monthlyTrend: MonthlyTrend[], startRow: number): number {
    let currentRow = startRow + 2;

    // Section header
    const sectionHeaderCell = sheet.getCell(currentRow, 1);
    const metricFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 14,
      bold: true,
      color: { argb: 'FF000000' }
    };
    sectionHeaderCell.font = metricFont;
    sectionHeaderCell.alignment = { vertical: 'middle' as const, horizontal: 'left' as const };
    sheet.mergeCells(currentRow, 1, currentRow, 4);
    currentRow++;

    // Table headers
    const headerFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };

    const navyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FF0B1E3D' }
    };

    const borderThin = {
      top: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } }
    };

    const headers = ['Month', 'Total Expenses', 'Subscriptions', 'Total Spend'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = headerFont;
      cell.fill = navyFill;
      cell.border = borderThin;
      cell.alignment = { vertical: 'middle' as const, horizontal: 'center' as const };
    });
    currentRow++;

    // Table data
    const tableFont = {
      name: 'Calibri',
      family: 2 as const,
      scheme: 'minor' as const,
      charset: 1 as const,
      size: 11,
      color: { argb: 'FF000000' }
    };

    const lightGreyFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: 'FFF8F9FA' }
    };

    monthlyTrend.forEach((trend, index) => {
      const row = currentRow + index;

      // Month (format YYYY-MM to Month YYYY)
      const monthCell = sheet.getCell(row, 1);
      const date = new Date(trend.month + '-01');
      monthCell.value = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      monthCell.border = borderThin;

      // Total Expenses
      const expensesCell = sheet.getCell(row, 2);
      expensesCell.value = trend.totalExpenses;
      expensesCell.numFmt = '₹#,##0.00';
      expensesCell.border = borderThin;

      // Subscriptions
      const subscriptionsCell = sheet.getCell(row, 3);
      subscriptionsCell.value = trend.totalSubscriptions;
      subscriptionsCell.numFmt = '₹#,##0.00';
      subscriptionsCell.border = borderThin;

      // Total Spend
      const totalSpendCell = sheet.getCell(row, 4);
      totalSpendCell.value = trend.totalSpend;
      totalSpendCell.numFmt = '₹#,##0.00';
      totalSpendCell.border = borderThin;

      // Zebra striping
      if (index % 2 === 0) {
        for (let col = 1; col <= 4; col++) {
          const cell = sheet.getCell(row, col);
          cell.fill = lightGreyFill;
        }
      }
    });

    // Set column widths
    sheet.getColumn(1).width = 20; // Month
    sheet.getColumn(2).width = 15; // Total Expenses
    sheet.getColumn(3).width = 15; // Subscriptions
    sheet.getColumn(4).width = 15; // Total Spend

    return currentRow + monthlyTrend.length;
  }

  public async generateExcelReport(options: ExportOptions): Promise<Buffer> {
    // Calculate metrics
    const metrics = this.calculateMetrics(options.transactions, options);

    // Create Executive Dashboard sheet
    const dashboardSheet = this.workbook.addWorksheet('Executive Dashboard');

    // Create header section
    this.createHeaderSection(dashboardSheet);

    // Create KPI section
    const kpiEndRow = this.createKPISection(dashboardSheet, metrics);

    // Create transactions table
    const transactionsEndRow = this.createTransactionsTable(dashboardSheet, options.transactions, kpiEndRow);

    // Create category breakdown table
    const categoryEndRow = this.createCategoryBreakdownTable(dashboardSheet, metrics.categoryBreakdown, transactionsEndRow);

    // Create monthly trend table
    this.createMonthlyTrendTable(dashboardSheet, metrics.monthlyTrend, categoryEndRow);

    // Freeze top rows
    dashboardSheet.views = [{ state: 'frozen' as const, ySplit: 4 }];

    // Protect sheet (optional - remove if you want users to edit)
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

    // Generate buffer
    const buffer = await this.workbook.xlsx.writeBuffer();
    // exceljs returns ArrayBuffer in the browser and Buffer in Node. We keep the public
    // API typed as Buffer for now but cast safely for Next.js type-checking.
    return buffer as unknown as Buffer;
  }

  public static async createReport(options: ExportOptions): Promise<Buffer> {
    const exporter = new SpendWiseExcelExporter();
    return await exporter.generateExcelReport(options);
  }
}

// Example usage:
/*
const transactions: Transaction[] = [
  { date: '2024-02-15', amount: 1500, category: 'Food & Dining', type: 'expense', recurring: false },
  { date: '2024-02-10', amount: 99, category: 'Netflix', type: 'subscription', recurring: true },
  { date: '2024-02-05', amount: 2500, category: 'Rent', type: 'expense', recurring: true },
  { date: '2024-01-20', amount: 1200, category: 'Shopping', type: 'expense', recurring: false },
  { date: '2024-01-15', amount: 99, category: 'Netflix', type: 'subscription', recurring: true },
];

const options: ExportOptions = {
  transactions,
  monthlyBudget: 10000,
  netSettlementPosition: 500,
  currentMonth: '2024-02',
  previousMonth: '2024-01'
};

const buffer = await SpendWiseExcelExporter.createReport(options);
// Save buffer to file or send as response
*/
