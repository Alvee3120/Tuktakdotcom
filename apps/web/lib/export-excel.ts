import { formatPrice } from '@/lib/utils';

import type { Expense, InventoryReport, PnlReport } from '@/hooks/useAdmin';

/**
 * Export an inventory report as a real Excel (.xlsx) workbook.
 * exceljs is imported dynamically so it never lands in the admin bundle
 * until the user actually clicks "Export".
 */
export async function exportReportToXlsx(
  report: InventoryReport,
  inventoryName: string,
  range: { from?: string; to?: string }
) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tuktak Admin';
  workbook.created = new Date();

  const money = '#,##0';

  // ── Summary sheet ──
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Metric', key: 'metric', width: 28 },
    { header: 'Value', key: 'value', width: 22 },
  ];
  summary.getRow(1).font = { bold: true };
  const s = report.summary;
  summary.addRows([
    { metric: 'Inventory', value: inventoryName },
    { metric: 'Period', value: `${range.from ?? 'Beginning'} → ${range.to ?? 'Today'}` },
    { metric: 'Units Sold', value: s.units_sold },
    { metric: 'Revenue (৳)', value: s.revenue },
    { metric: 'Cost (৳)', value: s.cost },
    { metric: 'Profit (৳)', value: s.profit },
    { metric: 'Margin (%)', value: Math.round(s.margin * 100) / 100 },
    { metric: 'Current Stock (units)', value: s.stock_units },
    { metric: 'Stock Value (৳)', value: s.stock_value },
  ]);
  for (const rowIdx of [5, 6, 7, 10]) summary.getCell(`B${rowIdx}`).numFmt = money;

  // ── Detail sheet ──
  const detail = workbook.addWorksheet('Products');
  detail.columns = [
    { header: 'Product', key: 'name', width: 40 },
    { header: 'SKU', key: 'sku', width: 16 },
    { header: 'Unit Cost', key: 'unit_cost', width: 12 },
    { header: 'Avg Sale Price', key: 'avg_sale_price', width: 14 },
    { header: 'Qty Sold', key: 'qty_sold', width: 10 },
    { header: 'Revenue', key: 'revenue', width: 14 },
    { header: 'Cost', key: 'cost_total', width: 14 },
    { header: 'Profit', key: 'profit', width: 14 },
    { header: 'In Stock', key: 'current_stock', width: 10 },
  ];
  detail.getRow(1).font = { bold: true };
  for (const row of report.rows) {
    detail.addRow({
      name: row.name,
      sku: row.sku ?? '',
      unit_cost: row.unit_cost ?? 0,
      avg_sale_price: Math.round(row.avg_sale_price ?? 0),
      qty_sold: row.qty_sold,
      revenue: row.revenue,
      cost_total: row.cost_total,
      profit: row.profit,
      current_stock: row.current_stock,
    });
  }
  for (const col of ['C', 'D', 'F', 'G', 'H']) {
    detail.getColumn(col).numFmt = money;
  }

  // ── Download ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeName = inventoryName.replace(/[^\p{L}\p{N}-]+/gu, '-').toLowerCase();
  const fileName = `inventory-report-${safeName}-${range.from ?? 'start'}-${range.to ?? 'today'}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Shared blob download helper */
function downloadWorkbookBlob(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export the P&L report (+ expense detail) as an Excel workbook.
 * Same dynamic-import strategy as the inventory export.
 */
export async function exportPnlToXlsx(
  pnl: PnlReport,
  expenses: Expense[],
  range: { from?: string; to?: string }
) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tuktak Admin';
  workbook.created = new Date();
  const money = '#,##0';

  // ── P&L sheet ──
  const sheet = workbook.addWorksheet('Profit & Loss');
  sheet.columns = [
    { header: 'Line Item', key: 'item', width: 32 },
    { header: 'Amount (৳)', key: 'amount', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRows([
    { item: 'Period', amount: `${range.from ?? 'Beginning'} → ${range.to ?? 'Today'}` },
    { item: 'Orders', amount: pnl.orderCount },
    { item: 'Units Sold', amount: pnl.unitsSold },
    { item: 'Revenue', amount: pnl.revenue },
    { item: 'Cost of Goods Sold (COGS)', amount: pnl.cogs },
    { item: 'Gross Profit', amount: pnl.grossProfit },
    { item: 'Shipping Income', amount: pnl.shippingIncome },
    { item: 'Discounts Given', amount: pnl.discountsGiven },
  ]);
  for (const row of pnl.expensesByCategory) {
    sheet.addRow({ item: `Expense — ${row.category}`, amount: row.total });
  }
  sheet.addRow({ item: 'Total Expenses', amount: pnl.totalExpenses });
  const netRow = sheet.addRow({ item: 'NET PROFIT', amount: pnl.netProfit });
  netRow.font = { bold: true };
  sheet.getColumn('B').numFmt = money;

  // ── Expense detail sheet ──
  const detail = workbook.addWorksheet('Expenses');
  detail.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Note', key: 'note', width: 40 },
  ];
  detail.getRow(1).font = { bold: true };
  for (const expense of expenses) {
    detail.addRow({
      date: expense.date,
      category: expense.category,
      amount: expense.amount,
      note: expense.note ?? '',
    });
  }
  detail.getColumn('C').numFmt = money;

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbookBlob(
    buffer as ArrayBuffer,
    `pnl-report-${range.from ?? 'start'}-${range.to ?? 'today'}.xlsx`
  );
}

/** Human-friendly ৳ label used by the report UI (re-exported for convenience) */
export { formatPrice };
