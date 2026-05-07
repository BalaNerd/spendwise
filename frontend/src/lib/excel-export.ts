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
  private navyFill: ExcelJS.FillPattern;
  private lightGreyFill: ExcelJS.FillPattern;
  private whiteFont: Partial<ExcelJS.Font>;
  private headerFont: Partial<ExcelJS.Font>;
  private metricFont: Partial<ExcelJS.Font>;
  private tableFont: Partial<ExcelJS.Font>;
  private borderThin: Partial<ExcelJS.Borders>;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'SpendWise';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();

    // Colors chosen to match SpendWise UI (Tailwind slate tones).
    this.navyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // slate-900
    };
    this.lightGreyFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }, // slate-100
    };

    this.whiteFont = {
      name: 'Inter',
      size: 18,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    this.headerFont = {
      name: 'Inter',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    this.metricFont = {
      name: 'Inter',
      size: 14,
      bold: true,
      color: { argb: 'FF0F172A' },
    };
    this.tableFont = {
      name: 'Inter',
      size: 11,
      color: { argb: 'FF0F172A' },
    };

    this.borderThin = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
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
      const month = t.date.substring(0, 7); // YYYY-MM
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

  private applyCellStyle(
    cell: ExcelJS.Cell,
    font?: Partial<ExcelJS.Font>,
    fill?: ExcelJS.FillPattern,
    border?: Partial<ExcelJS.Borders>,
    alignment?: Partial<ExcelJS.Alignment>
  ): void {
    if (font) cell.font = font;
    if (fill) cell.fill = fill;
    if (border) cell.border = border;
    if (alignment) cell.alignment = alignment;
  }

  private createHeaderSection(sheet: ExcelJS.Worksheet): void {
    // Main title
    sheet.mergeCells('A1:F2');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'SpendWise Financial Report';
    this.applyCellStyle(titleCell, this.whiteFont, this.navyFill, undefined, {
      vertical: 'middle',
      horizontal: 'center'
    });

    // Subtitle with date
    sheet.mergeCells('A3:F3');
    const subtitleCell = sheet.getCell('A3');
    subtitleCell.value = `Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;
    this.applyCellStyle(subtitleCell, this.headerFont, this.navyFill, undefined, {
      vertical: 'middle',
      horizontal: 'center'
    });
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

    kpis.forEach((kpi, index) => {
      const startCol = (index % 2) * 3 + 1;
      const endCol = startCol + 2;

      // Label row
      const labelCell = sheet.getCell(currentRow, startCol);
      labelCell.value = kpi.label;
      this.applyCellStyle(labelCell, this.headerFont, this.navyFill, this.borderThin, {
        vertical: 'middle',
        horizontal: 'center'
      });
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

      const valueFont = { ...this.metricFont, color: fontColor };
      
      if (kpi.isPercentage) {
        valueCell.value = `${kpi.value.toFixed(1)}%`;
      } else {
        valueCell.value = kpi.value;
        valueCell.numFmt = '₹#,##0.00';
      }
      
      this.applyCellStyle(valueCell, valueFont, this.lightGreyFill, this.borderThin, {
        vertical: 'middle',
        horizontal: 'center'
      });
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
    this.applyCellStyle(sectionHeaderCell, this.metricFont, undefined, undefined, {
      vertical: 'middle',
      horizontal: 'left'
    });
    sheet.mergeCells(currentRow, 1, currentRow, 5);
    currentRow++;

    // Table headers
    const headers = ['Date', 'Amount', 'Category', 'Type', 'Recurring'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(currentRow, index + 1);
      cell.value = header;
      this.applyCellStyle(cell, this.headerFont, this.navyFill, this.borderThin, {
        vertical: 'middle',
        horizontal: 'center'
      });
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
      this.applyCellStyle(dateCell, this.tableFont, undefined, this.borderThin);

      // Amount
      const amountCell = sheet.getCell(row, 2);
      amountCell.value = transaction.amount;
      amountCell.numFmt = '₹#,##0.00';
      this.applyCellStyle(amountCell, this.tableFont, undefined, this.borderThin);

      // Category
      const categoryCell = sheet.getCell(row, 3);
      categoryCell.value = transaction.category || 'Uncategorized';
      this.applyCellStyle(categoryCell, this.tableFont, undefined, this.borderThin);

      // Type
      const typeCell = sheet.getCell(row, 4);
      typeCell.value = transaction.type;
      this.applyCellStyle(typeCell, this.tableFont, undefined, this.borderThin);

      // Recurring
      const recurringCell = sheet.getCell(row, 5);
      recurringCell.value = transaction.recurring ? 'Yes' : 'No';
      this.applyCellStyle(recurringCell, this.tableFont, undefined, this.borderThin);

      // Zebra striping
      if (index % 2 === 0) {
        for (let col = 1; col <= 5; col++) {
          sheet.getCell(row, col).fill = this.lightGreyFill;
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
    sectionHeaderCell.value = 'Category Breakdown';
    this.applyCellStyle(sectionHeaderCell, this.metricFont, undefined, undefined, {
      vertical: 'middle',
      horizontal: 'left'
    });
    sheet.mergeCells(currentRow, 1, currentRow, 3);
    currentRow++;

    // Table headers
    const headers = ['Category', 'Amount', 'Percentage'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(currentRow, index + 1);
      cell.value = header;
      this.applyCellStyle(cell, this.headerFont, this.navyFill, this.borderThin, {
        vertical: 'middle',
        horizontal: 'center'
      });
    });
    currentRow++;

    // Table data
    categoryBreakdown.forEach((category, index) => {
      const row = currentRow + index;

      // Category
      const categoryCell = sheet.getCell(row, 1);
      categoryCell.value = category.category;
      this.applyCellStyle(categoryCell, this.tableFont, undefined, this.borderThin);

      // Amount
      const amountCell = sheet.getCell(row, 2);
      amountCell.value = category.totalAmount;
      amountCell.numFmt = '₹#,##0.00';
      this.applyCellStyle(amountCell, this.tableFont, undefined, this.borderThin);

      // Percentage
      const percentageCell = sheet.getCell(row, 3);
      percentageCell.value = category.percentage;
      percentageCell.numFmt = '0.0%';
      this.applyCellStyle(percentageCell, this.tableFont, undefined, this.borderThin);

      // Zebra striping
      if (index % 2 === 0) {
        for (let col = 1; col <= 3; col++) {
          sheet.getCell(row, col).fill = this.lightGreyFill;
        }
      }
    });

    // Total row
    const totalRow = currentRow + categoryBreakdown.length;
    const totalCell = sheet.getCell(totalRow, 1);
    totalCell.value = 'TOTAL';
    this.applyCellStyle(totalCell, { ...this.tableFont, bold: true }, undefined, this.borderThin);

    const totalAmountCell = sheet.getCell(totalRow, 2);
    const totalAmount = categoryBreakdown.reduce((sum, cat) => sum + cat.totalAmount, 0);
    totalAmountCell.value = totalAmount;
    totalAmountCell.numFmt = '₹#,##0.00';
    this.applyCellStyle(totalAmountCell, { ...this.tableFont, bold: true }, undefined, this.borderThin);

    const totalPercentageCell = sheet.getCell(totalRow, 3);
    totalPercentageCell.value = 100.0;
    totalPercentageCell.numFmt = '0.0%';
    this.applyCellStyle(totalPercentageCell, { ...this.tableFont, bold: true }, undefined, this.borderThin);

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
    sectionHeaderCell.value = 'Monthly Trend';
    this.applyCellStyle(sectionHeaderCell, this.metricFont, undefined, undefined, {
      vertical: 'middle',
      horizontal: 'left'
    });
    sheet.mergeCells(currentRow, 1, currentRow, 4);
    currentRow++;

    // Table headers
    const headers = ['Month', 'Total Expenses', 'Subscriptions', 'Total Spend'];
    headers.forEach((header, index) => {
      const cell = sheet.getCell(currentRow, index + 1);
      cell.value = header;
      this.applyCellStyle(cell, this.headerFont, this.navyFill, this.borderThin, {
        vertical: 'middle',
        horizontal: 'center'
      });
    });
    currentRow++;

    // Table data
    monthlyTrend.forEach((trend, index) => {
      const row = currentRow + index;

      // Month (format YYYY-MM to Month YYYY)
      const monthCell = sheet.getCell(row, 1);
      const date = new Date(trend.month + '-01');
      monthCell.value = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      this.applyCellStyle(monthCell, this.tableFont, undefined, this.borderThin);

      // Total Expenses
      const expensesCell = sheet.getCell(row, 2);
      expensesCell.value = trend.totalExpenses;
      expensesCell.numFmt = '₹#,##0.00';
      this.applyCellStyle(expensesCell, this.tableFont, undefined, this.borderThin);

      // Subscriptions
      const subscriptionsCell = sheet.getCell(row, 3);
      subscriptionsCell.value = trend.totalSubscriptions;
      subscriptionsCell.numFmt = '₹#,##0.00';
      this.applyCellStyle(subscriptionsCell, this.tableFont, undefined, this.borderThin);

      // Total Spend
      const totalSpendCell = sheet.getCell(row, 4);
      totalSpendCell.value = trend.totalSpend;
      totalSpendCell.numFmt = '₹#,##0.00';
      this.applyCellStyle(totalSpendCell, this.tableFont, undefined, this.borderThin);

      // Zebra striping
      if (index % 2 === 0) {
        for (let col = 1; col <= 4; col++) {
          sheet.getCell(row, col).fill = this.lightGreyFill;
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
    dashboardSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Protect the sheet (optional - remove if you want users to edit)
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
