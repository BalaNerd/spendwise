import express from 'express';
import { requireAuth, createUserClient } from '../middleware/auth.js';
import { SpendWiseExcelExporter } from '../utils/excel-export-enhanced.js';

const router = express.Router();

router.use(requireAuth);

/**
 * Enhanced Excel export endpoint with charts
 * POST /api/export/enhanced
 */
router.post('/', async (req, res) => {
  try {
    console.log('🚀 Starting enhanced Excel export...');
    console.log('📊 Request body:', {
      transactionsCount: req.body?.transactions?.length || 0,
      options: Object.keys(req.body?.options || {})
    });

    let { transactions, options = {} } = req.body || {};

    // If frontend didn't send transactions but provided a month, fetch from DB
    if ((!Array.isArray(transactions) || transactions.length === 0) && options.currentMonth) {
      console.log('🔄 No transactions provided, fetching from database using currentMonth:', options.currentMonth);
      const supabase = createUserClient(req.supabaseToken);
      const userId = req.user.id;

      const ym = String(options.currentMonth);
      const [year, month] = ym.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          date,
          amount,
          recurring,
          expense_categories ( name )
        `)
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ Failed to fetch expenses for export:', error);
      } else {
        transactions = (data || []).map((e) => ({
          date: e.date,
          amount: Number(e.amount) || 0,
          category: e.expense_categories?.name || 'Uncategorized',
          type: e.recurring ? 'subscription' : 'expense',
          recurring: !!e.recurring,
        }));
        console.log(`✅ Loaded ${transactions.length} transactions from database for export`);
      }
    }

    // Be forgiving: if still not an array, default to empty (but don't 400)
    if (!Array.isArray(transactions)) {
      console.warn('⚠️ transactions missing or invalid after DB fallback, defaulting to empty array');
      transactions = [];
    }

    console.log(`📋 Processing ${transactions.length} transactions...`);

    // Validate transaction structure
    for (const transaction of transactions) {
      if (!transaction.date || typeof transaction.amount !== 'number') {
        console.error('❌ Invalid transaction format:', transaction);
        return res.status(400).json({
          error: 'Invalid transaction format: each transaction must have date and amount'
        });
      }
      // Auto-detect type if missing
      if (!transaction.type) {
        transaction.type = transaction.recurring ? 'subscription' : 'expense';
      }
    }

    // Add Supabase token for database access
    options.supabaseToken = req.supabaseToken;
    console.log('🔐 Supabase token provided:', !!options.supabaseToken);

    console.log('📈 Generating Excel report with charts...');
    
    // Generate Excel report with charts
    const workbook = await SpendWiseExcelExporter.createReport(transactions, options);
    console.log('✅ Excel workbook generated successfully');

    // Set response headers for Excel download
    const filename = `SpendWise_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    console.log('📁 Setting headers for file:', filename);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    console.log('💾 Writing workbook to buffer...');
    
    // Safer buffer approach instead of direct write
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('✅ Buffer created, size:', buffer.length);
    
    // Validate buffer before sending
    if (!buffer || buffer.length === 0) {
      throw new Error('Generated Excel buffer is empty');
    }
    
    console.log('📤 Sending buffer to client...');
    return res.send(buffer);
    
    console.log('✅ Excel export completed successfully');

  } catch (error) {
    console.error('💥 Error in enhanced Excel export:', error);
    console.error('Stack trace:', error.stack);
    
    // Don't try to send JSON if response has already started
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate Excel report',
        details: error.message
      });
    } else {
      // If headers already sent, we can't send JSON
      console.error('❌ Response already started, cannot send error JSON');
      res.destroy();
    }
  }
});

/**
 * Get export preview (metrics only, no file download)
 * POST /api/export/preview
 */
router.post('/preview', async (req, res) => {
  try {
    const { transactions, options = {} } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({
        error: 'Invalid input: transactions array is required'
      });
    }

    // Calculate metrics only (no Excel generation)
    const exporter = new SpendWiseExcelExporter();
    const metrics = exporter.calculateMetrics(transactions, options);

    res.json({
      success: true,
      metrics,
      hasData: transactions.length > 0,
      chartData: {
        categories: metrics.categoryBreakdown,
        monthlyTrend: metrics.monthlyTrend
      }
    });

  } catch (error) {
    console.error('Error generating export preview:', error);
    res.status(500).json({
      error: 'Failed to generate preview',
      details: error.message
    });
  }
});

export default router;
