import type {
  Expense,
  InventoryReport,
  InventorySaleLine,
  PnlOrderRow,
  PnlPurchaseRow,
  PnlReport,
} from '@/hooks/useAdmin';
import type { Row, Workbook, Worksheet } from 'exceljs';

/**
 * Excel (.xlsx) exports for the admin reports.
 *
 * Both exporters accept an object fetched with `?detail=1`, which adds the
 * row-level arrays (sale lines, per-order P&L, purchases) that make the
 * workbooks useful — without it they'd only contain the on-screen aggregates.
 *
 * Each workbook opens with a KPI "Overview" sheet and then breaks the period
 * down by day, product, stock health, payment method, supplier and so on. Every
 * table gets a title band, frozen header, filter dropdowns, money/percent
 * number formats, totals line and red highlighting for negative figures.
 *
 * exceljs is imported dynamically (type-only above, so nothing is bundled)
 * and only loads when someone actually clicks Export.
 */

const MONEY = '#,##0';
const PERCENT = '0.0%';
const EMERALD = 'FF059669';
const EMERALD_DARK = 'FF065F46';
const EMERALD_PALE = 'FFECFDF5';
const SLATE = 'FF64748B';
const NEGATIVE = 'FFDC2626';
const RULE = 'FF94A3B8';

/** Raw driver timestamp (`2026-09-11 13:53:57.563`) or ISO → `2026-09-11 13:53`. */
function toDisplayDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const m = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (m) return `${m[1]} ${m[2]}`;
  const d = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return d ? d[1] : value;
}

/** Any timestamp / date string → `2026-09-11`. */
function toDisplayDay(value: string | null | undefined): string {
  if (!value) return '';
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : value;
}

/** Round to 2dp — used before handing a fraction to a percent cell. */
function percentile(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Guard against divide-by-zero when computing ratios and shares. */
function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0;
}

function downloadWorkbook(buffer: ArrayBuffer, fileName: string) {
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

function safeFileName(value: string): string {
  return value.replace(/[^\p{L}\p{N}-]+/gu, '-').toLowerCase();
}

/* ───────────────────────────── table sheets ───────────────────────────── */

type ColumnDef = {
  header: string;
  key: string;
  width: number;
  /** Whole-currency format + red when negative. */
  money?: boolean;
  /** Count format. */
  int?: boolean;
  /** Fraction rendered as a percentage. */
  percent?: boolean;
};

type Table = {
  sheet: Worksheet;
  columns: ColumnDef[];
  /** Row index of the first data row (header sits just above it). */
  firstDataRow: number;
};

/** Styled sheet: emerald title band, subtitle, frozen filtered header row. */
function addTableSheet(
  workbook: Workbook,
  name: string,
  title: string,
  subtitle: string,
  columns: ColumnDef[],
  tabColor = EMERALD
): Table {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.properties.tabColor = { argb: tabColor };

  columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width;
  });

  const lastCol = sheet.getColumn(columns.length).letter;
  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: EMERALD_DARK } };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 24;

  sheet.mergeCells(`A2:${lastCol}2`);
  const subCell = sheet.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { size: 10, italic: true, color: { argb: SLATE } };
  sheet.getRow(2).height = 15;

  const headerRow = sheet.getRow(4);
  columns.forEach((col, i) => {
    headerRow.getCell(i + 1).value = col.header;
  });
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columns.length },
  };

  return { sheet, columns, firstDataRow: 5 };
}

/** Append a data row (array-ordered so we can skip exceljs key mapping). */
function pushRow(table: Table, record: Record<string, unknown>): Row {
  return table.sheet.addRow(table.columns.map((col) => record[col.key] ?? null));
}

/** Apply number formats + negative highlighting across every data row. */
function applyColumnFormats(table: Table, throughRow?: Row) {
  const { sheet, columns, firstDataRow } = table;
  const end = throughRow ? throughRow.number : sheet.rowCount;
  for (let r = firstDataRow; r <= end; r++) {
    const row = sheet.getRow(r);
    columns.forEach((col, i) => {
      if (!col.money && !col.int && !col.percent) return;
      const cell = row.getCell(i + 1);
      if (cell.value === null || cell.value === undefined || cell.value === '') return;
      if (col.percent) {
        cell.numFmt = PERCENT;
      } else {
        cell.numFmt = MONEY;
        if (col.money && typeof cell.value === 'number' && cell.value < 0) {
          cell.font = { color: { argb: NEGATIVE } };
        }
      }
    });
  }
}

/** Bold totals line with a rule above it, keeping red for negative money. */
function styleTotalsRow(row: Row, columns: ColumnDef[]) {
  row.font = { bold: true };
  row.border = { top: { style: 'thin', color: { argb: RULE } } };
  row.eachCell((cell, colNumber) => {
    const col = columns[colNumber - 1];
    if (col?.money && typeof cell.value === 'number' && cell.value < 0) {
      cell.font = { bold: true, color: { argb: NEGATIVE } };
    }
  });
}

/* ──────────────────────────── summary sheets ──────────────────────────── */

type Summary = {
  sheet: Worksheet;
  section: (label: string) => void;
  metric: (
    label: string,
    value: string | number,
    note?: string,
    format?: 'money' | 'percent' | 'int'
  ) => void;
  strong: (
    label: string,
    value: string | number,
    note?: string,
    format?: 'money' | 'percent' | 'int'
  ) => void;
  blank: () => void;
};

/** KPI sheet: labelled sections of metric / value / note rows. */
function addSummarySheet(
  workbook: Workbook,
  name: string,
  title: string,
  subtitle: string,
  tabColor = EMERALD_DARK
): Summary {
  const sheet = workbook.addWorksheet(name, {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.properties.tabColor = { argb: tabColor };
  sheet.getColumn(1).width = 38;
  sheet.getColumn(2).width = 24;
  sheet.getColumn(3).width = 58;

  sheet.mergeCells('A1:C1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 15, color: { argb: EMERALD_DARK } };
  titleCell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 26;

  sheet.mergeCells('A2:C2');
  const subCell = sheet.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { size: 10, italic: true, color: { argb: SLATE } };
  sheet.getRow(2).height = 16;

  let rowIndex = 4;
  const write = (
    label: string,
    value: string | number,
    note: string | undefined,
    format: 'money' | 'percent' | 'int' | undefined,
    bold: boolean
  ) => {
    const row = sheet.getRow(rowIndex++);
    row.getCell(1).value = label;
    const valueCell = row.getCell(2);
    valueCell.value = value;
    if (format === 'money') valueCell.numFmt = MONEY;
    if (format === 'int') valueCell.numFmt = MONEY;
    if (format === 'percent') valueCell.numFmt = PERCENT;
    if (bold) row.font = { bold: true };
    if (format === 'money' && typeof value === 'number' && value < 0) {
      valueCell.font = { bold, color: { argb: NEGATIVE } };
    } else if (bold) {
      valueCell.font = { bold: true };
    }
    const noteCell = row.getCell(3);
    noteCell.value = note ?? '';
    noteCell.font = { size: 10, color: { argb: SLATE } };
  };

  return {
    sheet,
    section: (label: string) => {
      const row = sheet.getRow(rowIndex++);
      row.getCell(1).value = label;
      for (let c = 1; c <= 3; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD_PALE } };
      }
      row.font = { bold: true, color: { argb: EMERALD_DARK } };
    },
    metric: (label, value, note, format) => write(label, value, note, format, false),
    strong: (label, value, note, format) => write(label, value, note, format, true),
    blank: () => {
      rowIndex++;
    },
  };
}

/* ───────────────────────────── inventory report ───────────────────────────── */

type DailySales = {
  date: string;
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
};

/** Collapse sold lines into one row per calendar day. */
function buildDailySales(lines: InventorySaleLine[]): DailySales[] {
  const map = new Map<string, DailySales & { orderSet: Set<string> }>();
  for (const line of lines) {
    const day = toDisplayDay(line.date);
    let entry = map.get(day);
    if (!entry) {
      entry = {
        date: day,
        orders: 0,
        units: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        orderSet: new Set<string>(),
      };
      map.set(day, entry);
    }
    entry.units += line.quantity;
    entry.revenue += line.revenue;
    entry.cost += line.cost;
    entry.profit += line.profit;
    entry.orderSet.add(line.orderNumber);
  }
  return [...map.values()]
    .map((entry) => ({ ...entry, orders: entry.orderSet.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Build the inventory workbook and return its bytes. */
export async function buildInventoryWorkbook(
  report: InventoryReport,
  inventoryName: string,
  range: { from?: string; to?: string }
): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tuktak Admin';
  workbook.created = new Date();

  const s = report.summary;
  const period = `${range.from ?? 'Beginning'} → ${range.to ?? 'Today'}`;
  const generated = new Date().toLocaleString();
  const subtitle = `${inventoryName}  ·  Period: ${period}  ·  Generated: ${generated}`;
  const sales = report.salesDetail ?? [];
  const stock = report.stockRows ?? [];
  const products = report.rows;
  const daily = buildDailySales(sales);

  const orderCount = new Set(sales.map((x) => x.orderNumber)).size;
  const margin = ratio(s.profit, s.revenue);
  const stockUnits = stock.reduce((n, r) => n + r.quantity, 0);
  const stockValue = stock.reduce((n, r) => n + r.stockValue, 0);
  const outOfStock = stock.filter((r) => r.quantity <= 0);
  const lowStock = stock.filter((r) => r.status === 'Low Stock');
  const inStock = stock.filter((r) => r.status === 'In Stock');
  const byRevenue = [...products].sort((a, b) => b.revenue - a.revenue);
  const byProfit = [...products].sort((a, b) => b.profit - a.profit);
  const byUnits = [...products].sort((a, b) => b.qty_sold - a.qty_sold);
  const byMargin = products
    .filter((p) => p.revenue > 0)
    .sort((a, b) => ratio(b.profit, b.revenue) - ratio(a.profit, a.revenue));
  const bestDay = [...daily].sort((a, b) => b.revenue - a.revenue)[0];
  const topRevenue = byRevenue[0];
  const topProfit = byProfit[0];
  const topUnits = byUnits[0];
  const topMargin = byMargin[0];

  /* ── Overview ── */
  const overview = addSummarySheet(workbook, 'Overview', 'Inventory Report', subtitle);
  overview.section('Sales Performance');
  overview.metric('Orders', orderCount, 'Distinct orders in period');
  overview.metric('Units Sold', s.units_sold);
  overview.metric('Revenue', s.revenue, 'Line-item price × quantity', 'money');
  overview.metric('Cost of Goods Sold', s.cost, 'Snapshot cost, else product cost', 'money');
  overview.strong('Gross Profit', s.profit, 'Revenue − COGS', 'money');
  overview.metric('Gross Margin', margin, 'Gross Profit ÷ Revenue', 'percent');
  overview.metric('Average Order Value', ratio(s.revenue, orderCount), 'Revenue ÷ Orders', 'money');
  overview.metric('Average Selling Price', ratio(s.revenue, s.units_sold), 'Revenue ÷ Units', 'money');
  overview.metric('Active Selling Days', daily.length, 'Days with at least one sale');
  overview.blank();

  overview.section('Stock Position (current, all periods)');
  overview.metric('Products Tracked', stock.length);
  overview.metric('Units in Stock', stockUnits);
  overview.metric('Stock Value (at cost)', stockValue, 'Units × product cost', 'money');
  overview.metric('In Stock', inStock.length);
  overview.metric('Low Stock', lowStock.length, 'At or below reorder threshold');
  overview.metric('Out of Stock', outOfStock.length);
  overview.blank();

  overview.section('Highlights');
  overview.metric(
    'Top Product by Revenue',
    topRevenue?.name ?? '—',
    topRevenue ? `Revenue ${Math.round(topRevenue.revenue).toLocaleString()}` : ''
  );
  overview.metric(
    'Top Product by Profit',
    topProfit?.name ?? '—',
    topProfit ? `Profit ${Math.round(topProfit.profit).toLocaleString()}` : ''
  );
  overview.metric(
    'Best Seller by Units',
    topUnits?.name ?? '—',
    topUnits ? `${topUnits.qty_sold.toLocaleString()} units` : ''
  );
  overview.metric(
    'Highest Margin (with sales)',
    topMargin?.name ?? '—',
    topMargin ? `${percentile(ratio(topMargin.profit, topMargin.revenue) * 100).toFixed(1)}%` : ''
  );
  overview.metric(
    'Best Sales Day',
    bestDay?.date ?? '—',
    bestDay ? `Revenue ${Math.round(bestDay.revenue).toLocaleString()}` : ''
  );

  /* ── Daily Trend ── */
  const trend = addTableSheet(
    workbook,
    'Daily Trend',
    'Daily Sales Trend',
    subtitle,
    [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Orders', key: 'orders', width: 9, int: true },
      { header: 'Units', key: 'units', width: 9, int: true },
      { header: 'Revenue', key: 'revenue', width: 14, money: true },
      { header: 'COGS', key: 'cost', width: 14, money: true },
      { header: 'Gross Profit', key: 'profit', width: 14, money: true },
      { header: 'Margin %', key: 'margin', width: 11, percent: true },
      { header: 'Revenue / Order', key: 'aov', width: 15, money: true },
    ]
  );
  for (const day of daily) {
    pushRow(trend, {
      date: day.date,
      orders: day.orders,
      units: day.units,
      revenue: day.revenue,
      cost: day.cost,
      profit: day.profit,
      margin: percentile(ratio(day.profit, day.revenue)),
      aov: Math.round(ratio(day.revenue, day.orders)),
    });
  }
  const trendTotals = pushRow(trend, {
    date: 'TOTAL',
    orders: daily.reduce((n, d) => n + d.orders, 0),
    units: s.units_sold,
    revenue: s.revenue,
    cost: s.cost,
    profit: s.profit,
    margin: percentile(margin),
    aov: Math.round(ratio(s.revenue, orderCount)),
  });
  applyColumnFormats(trend);
  styleTotalsRow(trendTotals, trend.columns);

  /* ── Products ── */
  const productTable = addTableSheet(
    workbook,
    'Products',
    'Product Performance',
    subtitle,
    [
      { header: 'Rank', key: 'rank', width: 7, int: true },
      { header: 'Product', key: 'name', width: 40 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Qty Sold', key: 'qty', width: 10, int: true },
      { header: 'Unit Cost', key: 'unit_cost', width: 12, money: true },
      { header: 'Avg Sale Price', key: 'avg_price', width: 14, money: true },
      { header: 'Revenue', key: 'revenue', width: 14, money: true },
      { header: 'Revenue %', key: 'revenue_share', width: 11, percent: true },
      { header: 'COGS', key: 'cost', width: 14, money: true },
      { header: 'Gross Profit', key: 'profit', width: 14, money: true },
      { header: 'Profit %', key: 'profit_share', width: 11, percent: true },
      { header: 'Margin %', key: 'margin', width: 11, percent: true },
      { header: 'In Stock', key: 'stock', width: 10, int: true },
    ]
  );
  byRevenue.forEach((row, i) => {
    pushRow(productTable, {
      rank: i + 1,
      name: row.name,
      sku: row.sku ?? '',
      qty: row.qty_sold,
      unit_cost: row.unit_cost ?? 0,
      avg_price: Math.round(row.avg_sale_price ?? 0),
      revenue: row.revenue,
      revenue_share: percentile(ratio(row.revenue, s.revenue)),
      cost: row.cost_total,
      profit: row.profit,
      profit_share: percentile(ratio(row.profit, s.profit)),
      margin: percentile(ratio(row.profit, row.revenue)),
      stock: row.current_stock,
    });
  });
  const productTotals = pushRow(productTable, {
    name: 'TOTAL',
    qty: s.units_sold,
    revenue: s.revenue,
    revenue_share: s.revenue > 0 ? 1 : 0,
    cost: s.cost,
    profit: s.profit,
    profit_share: s.profit > 0 ? 1 : 0,
    margin: percentile(margin),
  });
  applyColumnFormats(productTable);
  styleTotalsRow(productTotals, productTable.columns);

  /* ── Stock Levels ── */
  const stockTable = addTableSheet(
    workbook,
    'Stock Levels',
    'Stock On Hand',
    subtitle,
    [
      { header: 'Product', key: 'name', width: 40 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 11, int: true },
      { header: 'Unit Cost', key: 'unit_cost', width: 13, money: true },
      { header: 'Stock Value', key: 'stock_value', width: 15, money: true },
      { header: 'Value %', key: 'value_share', width: 11, percent: true },
      { header: 'Status', key: 'status', width: 14 },
    ],
    'FF0EA5E9'
  );
  for (const row of [...stock].sort((a, b) => b.stockValue - a.stockValue)) {
    pushRow(stockTable, {
      name: row.name,
      sku: row.sku ?? '',
      quantity: row.quantity,
      unit_cost: row.unitCost,
      stock_value: row.stockValue,
      value_share: percentile(ratio(row.stockValue, stockValue)),
      status: row.status,
    });
  }
  const stockTotals = pushRow(stockTable, {
    name: 'TOTAL',
    quantity: stockUnits,
    stock_value: stockValue,
    value_share: stockValue > 0 ? 1 : 0,
  });
  applyColumnFormats(stockTable);
  styleTotalsRow(stockTotals, stockTable.columns);

  /* ── Stock Alerts ── */
  const alertTable = addTableSheet(
    workbook,
    'Stock Alerts',
    'Reorder Watchlist (out of stock & low stock)',
    subtitle,
    [
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Product', key: 'name', width: 40 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Quantity', key: 'quantity', width: 11, int: true },
      { header: 'Unit Cost', key: 'unit_cost', width: 13, money: true },
      { header: 'Stock Value', key: 'stock_value', width: 15, money: true },
    ],
    'FFF59E0B'
  );
  const alerts = [
    ...outOfStock.sort((a, b) => a.name.localeCompare(b.name)),
    ...lowStock.sort((a, b) => a.quantity - b.quantity),
  ];
  for (const row of alerts) {
    pushRow(alertTable, {
      status: row.status,
      name: row.name,
      sku: row.sku ?? '',
      quantity: row.quantity,
      unit_cost: row.unitCost,
      stock_value: row.stockValue,
    });
  }
  applyColumnFormats(alertTable);
  if (alerts.length > 0) {
    const alertTotals = pushRow(alertTable, {
      status: 'TOTAL',
      name: `${alerts.length} products`,
      quantity: alerts.reduce((n, r) => n + r.quantity, 0),
      stock_value: alerts.reduce((n, r) => n + r.stockValue, 0),
    });
    styleTotalsRow(alertTotals, alertTable.columns);
  }

  /* ── Sales Detail ── */
  const detail = addTableSheet(
    workbook,
    'Sales Detail',
    'Sold Line Items',
    subtitle,
    [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Order #', key: 'order', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Product', key: 'product', width: 40 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Qty', key: 'qty', width: 7, int: true },
      { header: 'Unit Price', key: 'unit_price', width: 13, money: true },
      { header: 'Revenue', key: 'revenue', width: 14, money: true },
      { header: 'Unit Cost', key: 'unit_cost', width: 13, money: true },
      { header: 'Cost', key: 'cost', width: 14, money: true },
      { header: 'Gross Profit', key: 'profit', width: 14, money: true },
      { header: 'Margin %', key: 'margin', width: 11, percent: true },
    ],
    'FF6366F1'
  );
  for (const line of sales) {
    pushRow(detail, {
      date: toDisplayDateTime(line.date),
      order: line.orderNumber,
      status: line.status,
      customer: line.customer,
      product: line.productName,
      sku: line.sku ?? '',
      qty: line.quantity,
      unit_price: line.unitPrice,
      revenue: line.revenue,
      unit_cost: line.unitCost,
      cost: line.cost,
      profit: line.profit,
      margin: percentile(ratio(line.profit, line.revenue)),
    });
  }
  const detailTotals = pushRow(detail, {
    product: 'TOTAL',
    qty: sales.reduce((n, l) => n + l.quantity, 0),
    revenue: sales.reduce((n, l) => n + l.revenue, 0),
    cost: sales.reduce((n, l) => n + l.cost, 0),
    profit: sales.reduce((n, l) => n + l.profit, 0),
  });
  applyColumnFormats(detail);
  styleTotalsRow(detailTotals, detail.columns);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/* ──────────────────────────────── P&L report ──────────────────────────────── */

type DailyPnl = {
  date: string;
  orders: number;
  units: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  discounts: number;
  shipping: number;
  expenses: number;
  net: number;
};

/** One row per day: order metrics plus operating expenses paid that day. */
function buildDailyPnl(
  orders: PnlOrderRow[],
  expenses: Expense[],
  purchases: PnlPurchaseRow[]
): DailyPnl[] {
  const map = new Map<string, DailyPnl>();
  const ensure = (date: string): DailyPnl => {
    let entry = map.get(date);
    if (!entry) {
      entry = {
        date,
        orders: 0,
        units: 0,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        discounts: 0,
        shipping: 0,
        expenses: 0,
        net: 0,
      };
      map.set(date, entry);
    }
    return entry;
  };

  for (const o of orders) {
    const entry = ensure(toDisplayDay(o.date));
    entry.orders += 1;
    entry.units += o.units;
    entry.revenue += o.revenue;
    entry.cogs += o.cogs;
    entry.grossProfit += o.grossProfit;
    entry.discounts += o.discount;
    entry.shipping += o.shipping;
  }
  for (const e of expenses) ensure(toDisplayDay(e.date)).expenses += e.amount;
  for (const p of purchases) ensure(toDisplayDay(p.date)).expenses += p.paid;

  return [...map.values()]
    .map((entry) => ({ ...entry, net: entry.grossProfit - entry.expenses }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Build the P&L workbook and return its bytes. */
export async function buildPnlWorkbook(
  pnl: PnlReport,
  expenses: Expense[],
  range: { from?: string; to?: string }
): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tuktak Admin';
  workbook.created = new Date();

  const period = `${range.from ?? 'Beginning'} → ${range.to ?? 'Today'}`;
  const generated = new Date().toLocaleString();
  const subtitle = `Period: ${period}  ·  Generated: ${generated}`;
  const orders = pnl.orderRows ?? [];
  const productRows = pnl.productRows ?? [];
  const purchases = pnl.purchaseRows ?? [];

  const soldOrders = orders.length || pnl.orderCount;
  const aov = ratio(pnl.revenue, soldOrders);
  const grossMargin = ratio(pnl.grossProfit, pnl.revenue);
  const netMargin = ratio(pnl.netProfit, pnl.revenue);
  const expenseRatio = ratio(pnl.totalExpenses, pnl.revenue);
  const daily = buildDailyPnl(orders, expenses, purchases);

  /* ── Profit & Loss statement ── */
  const statement = addSummarySheet(workbook, 'Profit & Loss', 'Profit & Loss Statement', subtitle);
  statement.section('Sales');
  statement.metric('Orders', pnl.orderCount, 'Sold orders only');
  statement.metric('Units Sold', pnl.unitsSold);
  statement.metric('Average Order Value', aov, 'Revenue ÷ Orders', 'money');
  statement.blank();
  statement.section('Profit & Loss');
  statement.metric('Revenue', pnl.revenue, 'Line-item price × qty (pre-discount)', 'money');
  statement.metric('Cost of Goods Sold', pnl.cogs, 'Snapshot cost, else product cost', 'money');
  statement.strong('Gross Profit', pnl.grossProfit, 'Revenue − COGS', 'money');
  statement.metric('Gross Margin', grossMargin, 'Gross Profit ÷ Revenue', 'percent');
  statement.blank();
  statement.strong('Operating Expenses', pnl.totalExpenses, 'Includes supplier payments', 'money');
  for (const row of pnl.expensesByCategory) {
    statement.metric(
      `   ${row.category}`,
      row.total,
      row.category === 'Supplier Payments' ? 'Cash paid to suppliers in the period' : undefined,
      'money'
    );
  }
  statement.metric('Expense Ratio', expenseRatio, 'Expenses ÷ Revenue', 'percent');
  statement.strong('NET PROFIT', pnl.netProfit, 'Gross Profit − Total Expenses', 'money');
  statement.metric('Net Margin', netMargin, 'Net Profit ÷ Revenue', 'percent');
  statement.blank();
  statement.section('Reference figures (not deducted from net profit)');
  statement.metric('Shipping Income', pnl.shippingIncome, 'Charged to customers', 'money');
  statement.metric('Discounts Given', pnl.discountsGiven, 'Not netted off revenue', 'money');
  statement.metric('Supplier Purchases (total)', pnl.purchaseTotal, 'Goods bought, paid or not', 'money');
  statement.metric(
    'Paid to Suppliers',
    pnl.supplierPayments,
    `${Math.max(0, pnl.purchaseTotal - pnl.supplierPayments).toLocaleString()} still due`,
    'money'
  );

  /* ── Daily Trend ── */
  const trend = addTableSheet(
    workbook,
    'Daily Trend',
    'Daily Profit & Loss',
    subtitle,
    [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Orders', key: 'orders', width: 9, int: true },
      { header: 'Units', key: 'units', width: 9, int: true },
      { header: 'Revenue', key: 'revenue', width: 14, money: true },
      { header: 'COGS', key: 'cogs', width: 14, money: true },
      { header: 'Gross Profit', key: 'gross', width: 14, money: true },
      { header: 'Discounts', key: 'discounts', width: 12, money: true },
      { header: 'Shipping', key: 'shipping', width: 12, money: true },
      { header: 'Expenses', key: 'expenses', width: 14, money: true },
      { header: 'Net Profit', key: 'net', width: 14, money: true },
      { header: 'Margin %', key: 'margin', width: 11, percent: true },
    ]
  );
  for (const day of daily) {
    pushRow(trend, {
      date: day.date,
      orders: day.orders,
      units: day.units,
      revenue: day.revenue,
      cogs: day.cogs,
      gross: day.grossProfit,
      discounts: day.discounts,
      shipping: day.shipping,
      expenses: day.expenses,
      net: day.net,
      margin: percentile(ratio(day.grossProfit, day.revenue)),
    });
  }
  const trendTotals = pushRow(trend, {
    date: 'TOTAL',
    orders: daily.reduce((n, d) => n + d.orders, 0),
    units: pnl.unitsSold,
    revenue: pnl.revenue,
    cogs: pnl.cogs,
    gross: pnl.grossProfit,
    discounts: pnl.discountsGiven,
    shipping: pnl.shippingIncome,
    expenses: pnl.totalExpenses,
    net: pnl.netProfit,
    margin: percentile(grossMargin),
  });
  applyColumnFormats(trend);
  styleTotalsRow(trendTotals, trend.columns);

  /* ── Order Detail ── */
  const ordersSheet = addTableSheet(
    workbook,
    'Order Detail',
    'Per-Order Profitability',
    subtitle,
    [
      { header: 'Order #', key: 'order', width: 16 },
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Payment', key: 'payment', width: 14 },
      { header: 'Pay Status', key: 'payStatus', width: 12 },
      { header: 'Units', key: 'units', width: 7, int: true },
      { header: 'Revenue', key: 'revenue', width: 14, money: true },
      { header: 'COGS', key: 'cogs', width: 14, money: true },
      { header: 'Gross Profit', key: 'profit', width: 14, money: true },
      { header: 'Margin %', key: 'margin', width: 11, percent: true },
      { header: 'Discount', key: 'discount', width: 12, money: true },
      { header: 'Tax', key: 'tax', width: 12, money: true },
      { header: 'Shipping', key: 'shipping', width: 12, money: true },
      { header: 'Order Total', key: 'total', width: 14, money: true },
    ],
    'FF6366F1'
  );
  for (const o of orders) {
    pushRow(ordersSheet, {
      order: o.orderNumber,
      date: toDisplayDateTime(o.date),
      customer: o.customer,
      status: o.status,
      payment: o.paymentMethod ?? '',
      payStatus: o.paymentStatus ?? '',
      units: o.units,
      revenue: o.revenue,
      cogs: o.cogs,
      profit: o.grossProfit,
      margin: percentile(ratio(o.grossProfit, o.revenue)),
      discount: o.discount,
      tax: o.tax,
      shipping: o.shipping,
      total: o.total,
    });
  }
  const orderTotals = pushRow(ordersSheet, {
    order: 'TOTAL',
    units: orders.reduce((n, o) => n + o.units, 0),
    revenue: orders.reduce((n, o) => n + o.revenue, 0),
    cogs: orders.reduce((n, o) => n + o.cogs, 0),
    profit: orders.reduce((n, o) => n + o.grossProfit, 0),
    discount: orders.reduce((n, o) => n + o.discount, 0),
    tax: orders.reduce((n, o) => n + o.tax, 0),
    shipping: orders.reduce((n, o) => n + o.shipping, 0),
    total: orders.reduce((n, o) => n + o.total, 0),
  });
  applyColumnFormats(ordersSheet);
  styleTotalsRow(orderTotals, ordersSheet.columns);

  /* ── Product Profitability (with Pareto) ── */
  const productSheet = addTableSheet(
    workbook,
    'Product Profitability',
    'Product Profitability & Pareto',
    subtitle,
    [
      { header: 'Rank', key: 'rank', width: 7, int: true },
      { header: 'Product', key: 'name', width: 40 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Qty Sold', key: 'qty', width: 10, int: true },
      { header: 'Revenue', key: 'revenue', width: 14, money: true },
      { header: 'Revenue %', key: 'revenue_share', width: 11, percent: true },
      { header: 'COGS', key: 'cogs', width: 14, money: true },
      { header: 'Gross Profit', key: 'profit', width: 14, money: true },
      { header: 'Profit %', key: 'profit_share', width: 11, percent: true },
      { header: 'Margin %', key: 'margin', width: 11, percent: true },
      { header: 'Cumulative Revenue %', key: 'cumulative', width: 20, percent: true },
    ],
    'FF0EA5E9'
  );
  const totalProductRevenue = productRows.reduce((n, p) => n + p.revenue, 0);
  const totalProductProfit = productRows.reduce((n, p) => n + p.grossProfit, 0);
  let runningRevenue = 0;
  productRows.forEach((p, i) => {
    runningRevenue += p.revenue;
    pushRow(productSheet, {
      rank: i + 1,
      name: p.name,
      sku: p.sku ?? '',
      qty: p.qtySold,
      revenue: p.revenue,
      revenue_share: percentile(ratio(p.revenue, totalProductRevenue)),
      cogs: p.cogs,
      profit: p.grossProfit,
      profit_share: percentile(ratio(p.grossProfit, totalProductProfit)),
      margin: percentile(ratio(p.grossProfit, p.revenue)),
      cumulative: percentile(ratio(runningRevenue, totalProductRevenue)),
    });
  });
  const productTotals = pushRow(productSheet, {
    name: 'TOTAL',
    qty: productRows.reduce((n, p) => n + p.qtySold, 0),
    revenue: totalProductRevenue,
    revenue_share: totalProductRevenue > 0 ? 1 : 0,
    cogs: productRows.reduce((n, p) => n + p.cogs, 0),
    profit: totalProductProfit,
    profit_share: totalProductProfit > 0 ? 1 : 0,
  });
  applyColumnFormats(productSheet);
  styleTotalsRow(productTotals, productSheet.columns);

  /* ── Payment Mix ── */
  const paymentMap = new Map<
    string,
    { method: string; orders: number; units: number; revenue: number; cogs: number; profit: number }
  >();
  for (const o of orders) {
    const method = o.paymentMethod?.trim() || 'Unspecified';
    let entry = paymentMap.get(method);
    if (!entry) {
      entry = { method, orders: 0, units: 0, revenue: 0, cogs: 0, profit: 0 };
      paymentMap.set(method, entry);
    }
    entry.orders += 1;
    entry.units += o.units;
    entry.revenue += o.revenue;
    entry.cogs += o.cogs;
    entry.profit += o.grossProfit;
  }
  const paymentTable = addTableSheet(
    workbook,
    'Payment Mix',
    'Revenue by Payment Method',
    subtitle,
    [
      { header: 'Payment Method', key: 'method', width: 20 },
      { header: 'Orders', key: 'orders', width: 10, int: true },
      { header: 'Units', key: 'units', width: 10, int: true },
      { header: 'Revenue', key: 'revenue', width: 14, money: true },
      { header: 'Revenue %', key: 'share', width: 11, percent: true },
      { header: 'COGS', key: 'cogs', width: 14, money: true },
      { header: 'Gross Profit', key: 'profit', width: 14, money: true },
      { header: 'Margin %', key: 'margin', width: 11, percent: true },
      { header: 'Revenue / Order', key: 'aov', width: 15, money: true },
    ],
    'FF8B5CF6'
  );
  const paymentRows = [...paymentMap.values()].sort((a, b) => b.revenue - a.revenue);
  const totalPaymentRevenue = paymentRows.reduce((n, p) => n + p.revenue, 0);
  for (const row of paymentRows) {
    pushRow(paymentTable, {
      method: row.method,
      orders: row.orders,
      units: row.units,
      revenue: row.revenue,
      share: percentile(ratio(row.revenue, totalPaymentRevenue)),
      cogs: row.cogs,
      profit: row.profit,
      margin: percentile(ratio(row.profit, row.revenue)),
      aov: Math.round(ratio(row.revenue, row.orders)),
    });
  }
  const paymentTotals = pushRow(paymentTable, {
    method: 'TOTAL',
    orders: paymentRows.reduce((n, p) => n + p.orders, 0),
    units: paymentRows.reduce((n, p) => n + p.units, 0),
    revenue: totalPaymentRevenue,
    share: totalPaymentRevenue > 0 ? 1 : 0,
    cogs: paymentRows.reduce((n, p) => n + p.cogs, 0),
    profit: paymentRows.reduce((n, p) => n + p.profit, 0),
  });
  applyColumnFormats(paymentTable);
  styleTotalsRow(paymentTotals, paymentTable.columns);

  /* ── Expenses ── */
  const expenseTable = addTableSheet(
    workbook,
    'Expenses',
    'Operating Expenses',
    subtitle,
    [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Amount', key: 'amount', width: 14, money: true },
      { header: '% of Expenses', key: 'share', width: 14, percent: true },
      { header: 'Note', key: 'note', width: 46 },
    ],
    'FFF59E0B'
  );
  const totalExpenses = expenses.reduce((n, e) => n + e.amount, 0);
  for (const expense of expenses) {
    pushRow(expenseTable, {
      date: toDisplayDay(expense.date),
      category: expense.category,
      amount: expense.amount,
      share: percentile(ratio(expense.amount, totalExpenses)),
      note: expense.note ?? '',
    });
  }
  const expenseTotals = pushRow(expenseTable, {
    category: 'TOTAL',
    amount: totalExpenses,
    share: totalExpenses > 0 ? 1 : 0,
  });
  applyColumnFormats(expenseTable);
  styleTotalsRow(expenseTotals, expenseTable.columns);

  /* ── Supplier Dues (aggregated) ── */
  const supplierMap = new Map<
    string,
    { supplier: string; purchases: number; total: number; paid: number; due: number }
  >();
  for (const p of purchases) {
    let entry = supplierMap.get(p.supplier);
    if (!entry) {
      entry = { supplier: p.supplier, purchases: 0, total: 0, paid: 0, due: 0 };
      supplierMap.set(p.supplier, entry);
    }
    entry.purchases += 1;
    entry.total += p.total;
    entry.paid += p.paid;
    entry.due += p.due;
  }
  const supplierTable = addTableSheet(
    workbook,
    'Supplier Dues',
    'Outstanding Balance by Supplier',
    subtitle,
    [
      { header: 'Supplier', key: 'supplier', width: 30 },
      { header: 'Purchases', key: 'purchases', width: 11, int: true },
      { header: 'Total Purchased', key: 'total', width: 16, money: true },
      { header: 'Paid', key: 'paid', width: 14, money: true },
      { header: 'Due', key: 'due', width: 14, money: true },
      { header: '% Paid', key: 'paid_share', width: 11, percent: true },
    ],
    'FFEF4444'
  );
  const supplierRows = [...supplierMap.values()].sort((a, b) => b.due - a.due);
  for (const row of supplierRows) {
    pushRow(supplierTable, {
      supplier: row.supplier,
      purchases: row.purchases,
      total: row.total,
      paid: row.paid,
      due: row.due,
      paid_share: percentile(ratio(row.paid, row.total)),
    });
  }
  const supplierTotals = pushRow(supplierTable, {
    supplier: 'TOTAL',
    purchases: supplierRows.reduce((n, s) => n + s.purchases, 0),
    total: supplierRows.reduce((n, s) => n + s.total, 0),
    paid: supplierRows.reduce((n, s) => n + s.paid, 0),
    due: supplierRows.reduce((n, s) => n + s.due, 0),
  });
  applyColumnFormats(supplierTable);
  styleTotalsRow(supplierTotals, supplierTable.columns);

  /* ── Purchases & Dues (ledger) ── */
  const purchasesSheet = addTableSheet(
    workbook,
    'Purchases & Dues',
    'Supplier Purchase Ledger',
    subtitle,
    [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Supplier', key: 'supplier', width: 26 },
      { header: 'Description', key: 'description', width: 34 },
      { header: 'Total', key: 'total', width: 14, money: true },
      { header: 'Paid', key: 'paid', width: 14, money: true },
      { header: 'Due', key: 'due', width: 14, money: true },
      { header: 'Status', key: 'status', width: 12 },
    ],
    'FFEF4444'
  );
  for (const p of purchases) {
    pushRow(purchasesSheet, {
      date: toDisplayDay(p.date),
      supplier: p.supplier,
      description: p.description ?? '',
      total: p.total,
      paid: p.paid,
      due: p.due,
      status: p.due <= 0 ? 'Paid' : p.paid > 0 ? 'Partial' : 'Unpaid',
    });
  }
  const purchaseTotals = pushRow(purchasesSheet, {
    supplier: 'TOTAL',
    total: purchases.reduce((n, p) => n + p.total, 0),
    paid: purchases.reduce((n, p) => n + p.paid, 0),
    due: purchases.reduce((n, p) => n + p.due, 0),
  });
  applyColumnFormats(purchasesSheet);
  styleTotalsRow(purchaseTotals, purchasesSheet.columns);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/* ─────────────────────────────── public API ─────────────────────────────── */

/** Inventory report workbook — builds then downloads. */
export async function exportReportToXlsx(
  report: InventoryReport,
  inventoryName: string,
  range: { from?: string; to?: string }
) {
  const buffer = await buildInventoryWorkbook(report, inventoryName, range);
  downloadWorkbook(
    buffer,
    `inventory-report-${safeFileName(inventoryName)}-${range.from ?? 'start'}-${range.to ?? 'today'}.xlsx`
  );
}

/** Profit & loss workbook — builds then downloads. */
export async function exportPnlToXlsx(
  pnl: PnlReport,
  expenses: Expense[],
  range: { from?: string; to?: string }
) {
  const buffer = await buildPnlWorkbook(pnl, expenses, range);
  downloadWorkbook(
    buffer,
    `pnl-report-${range.from ?? 'start'}-${range.to ?? 'today'}.xlsx`
  );
}
