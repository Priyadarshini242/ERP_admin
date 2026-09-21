/**
 * Sample data used when the API is unreachable, so the UI can be reviewed without a backend.
 * Enabled by default; set NEXT_PUBLIC_DEMO_FALLBACK=false to disable.
 */
export const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_FALLBACK !== "false";

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10) + "T00:00:00.000Z";

const customers = ["ABC Traders", "Walk-in Customer", "Global Mart", "Fresh Retail", "Metro Wholesale", "Sunrise Pharmacy", "City Care Clinic"];
const vendors = ["Sri Distributors", "National Supplies", "Prime Traders", "Global Imports", "City Wholesalers", "Medico Supplies"];
const productsList = [
  { id: 1, sku: "P001", name: "Dove Soap 100g", unit: "PCS", category: "Personal Care", hsnCode: "3401", purchasePrice: "38.00", sellingPrice: "45.00", mrp: "50.00", taxRate: "18", reorderLevel: "20", stockQty: "5" },
  { id: 2, sku: "P002", name: "Ariel Detergent 1kg", unit: "PCS", category: "Household", hsnCode: "3402", purchasePrice: "180.00", sellingPrice: "215.00", mrp: "230.00", taxRate: "18", reorderLevel: "15", stockQty: "0" },
  { id: 3, sku: "P003", name: "Sunflower Oil 1L", unit: "PCS", category: "Grocery", hsnCode: "1512", purchasePrice: "125.00", sellingPrice: "142.00", mrp: "150.00", taxRate: "5", reorderLevel: "24", stockQty: "8" },
  { id: 4, sku: "P004", name: "Toothpaste 100g", unit: "PCS", category: "Personal Care", hsnCode: "3306", purchasePrice: "62.00", sellingPrice: "78.00", mrp: "85.00", taxRate: "18", reorderLevel: "30", stockQty: "12" },
  { id: 5, sku: "P005", name: "Tea Powder 250g", unit: "PCS", category: "Grocery", hsnCode: "0902", purchasePrice: "95.00", sellingPrice: "118.00", mrp: "125.00", taxRate: "5", reorderLevel: "20", stockQty: "0" },
  { id: 6, sku: "P006", name: "Basmati Rice 5kg", unit: "BAG", category: "Grocery", hsnCode: "1006", purchasePrice: "520.00", sellingPrice: "610.00", mrp: "650.00", taxRate: "5", reorderLevel: "10", stockQty: "64" },
  { id: 7, sku: "P007", name: "Paracetamol 500mg (10s)", unit: "STRIP", category: "Pharma", hsnCode: "3004", purchasePrice: "9.50", sellingPrice: "14.00", mrp: "15.00", taxRate: "12", reorderLevel: "200", stockQty: "1240" },
  { id: 8, sku: "P008", name: "Hand Sanitizer 500ml", unit: "PCS", category: "Pharma", hsnCode: "3808", purchasePrice: "110.00", sellingPrice: "149.00", mrp: "160.00", taxRate: "18", reorderLevel: "40", stockQty: "96" },
];

const totals = (grand: number, rate = 18, interstate = false) => {
  const taxable = Math.round((grand / (1 + rate / 100)) * 100) / 100;
  const tax = Math.round((grand - taxable) * 100) / 100;
  return {
    subtotal: taxable.toFixed(2),
    discountAmount: "0.00",
    taxableAmount: taxable.toFixed(2),
    cgstAmount: interstate ? "0.00" : (tax / 2).toFixed(2),
    sgstAmount: interstate ? "0.00" : (tax / 2).toFixed(2),
    igstAmount: interstate ? tax.toFixed(2) : "0.00",
    taxAmount: tax.toFixed(2),
    roundOff: "0.00",
    grandTotal: grand.toFixed(2),
    isInterstate: interstate,
  };
};

const items = (n: number) =>
  productsList.slice(0, n).map((p, i) => ({
    id: i + 1,
    productId: p.id,
    product: { id: p.id, sku: p.sku, name: p.name, unit: p.unit },
    description: p.name,
    quantity: String(10 * (i + 1)),
    unitPrice: p.sellingPrice,
    discountPct: "0.00",
    taxRate: p.taxRate,
    taxableAmount: (Number(p.sellingPrice) * 10 * (i + 1)).toFixed(2),
    taxAmount: ((Number(p.sellingPrice) * 10 * (i + 1) * Number(p.taxRate)) / 100).toFixed(2),
    lineTotal: (Number(p.sellingPrice) * 10 * (i + 1) * (1 + Number(p.taxRate) / 100)).toFixed(2),
  }));

const wh = { id: 1, code: "MAIN", name: "Main Warehouse" };
const by = { id: 1, fullName: "T. Sivasundaram" };

function page<T>(rows: T[], extra: Record<string, unknown> = {}) {
  return { items: rows, total: rows.length, page: 1, pageSize: rows.length || 20, pages: 1, demo: true, ...extra };
}

const doc = (i: number, no: string, dateField: string, partyKey: "customer" | "vendor", names: string[], amounts: number[], statuses: string[]) => ({
  id: i + 1,
  no,
  [dateField]: iso(i),
  [partyKey]: { id: i + 1, name: names[i % names.length], code: `P-0000${i + 1}`, gstin: i % 2 === 0 ? "33AAACA1234A1Z5" : null, stateCode: "33", customerType: i % 2 === 0 ? "B2B" : "B2C" },
  customerType: i % 2 === 0 ? "B2B" : "B2C",
  status: statuses[i % statuses.length],
  paymentStatus: i % 3 === 0 ? "PAID" : i % 3 === 1 ? "PARTIAL" : "UNPAID",
  amountPaid: i % 3 === 0 ? amounts[i % amounts.length].toFixed(2) : "0.00",
  warehouse: wh,
  createdBy: by,
  items: items(2 + (i % 3)),
  payments: [],
  ...totals(amounts[i % amounts.length], 18, i % 4 === 3),
});

const salesAmounts = [25430, 3250, 18760, 5400, 42180, 12900, 7650, 31200];
const purchaseAmounts = [55200, 32450, 18900, 76300, 41600, 22750, 9800, 64100];

export function demoFor(path: string): Record<string, unknown> | null {
  if (!DEMO_ENABLED) return null;
  const p = path.split("?")[0];

  if (p === "/sales/invoices")
    return page(
      salesAmounts.map((_, i) => ({ ...doc(i, `INV-0000${i + 1}`, "invoiceDate", "customer", customers, salesAmounts, ["POSTED", "POSTED", "DRAFT", "POSTED"]), invoiceNo: `INV-0000${i + 1}`, dueDate: iso(i - 30) })),
      { summary: { taxableAmount: "1054602.00", taxAmount: "190628.00", grandTotal: "1245230.00", amountPaid: "812400.00", outstanding: "432830.00" } },
    );
  if (p === "/purchase/invoices")
    return page(
      purchaseAmounts.map((_, i) => ({ ...doc(i, `BILL-0000${i + 1}`, "invoiceDate", "vendor", vendors, purchaseAmounts, ["POSTED", "POSTED", "DRAFT", "POSTED"]), billNo: `BILL-0000${i + 1}`, vendorInvoiceNo: `SD/24-25/${120 + i}` })),
      { summary: { taxableAmount: "742754.00", taxAmount: "133696.00", grandTotal: "876450.00", amountPaid: "610200.00", outstanding: "266250.00" } },
    );
  if (p === "/sales/orders")
    return page(salesAmounts.slice(0, 6).map((_, i) => ({ ...doc(i, `SO-0000${i + 1}`, "orderDate", "customer", customers, salesAmounts, ["CONFIRMED", "DRAFT", "PARTIAL", "COMPLETED", "CANCELLED"]), orderNo: `SO-0000${i + 1}`, deliveryDate: iso(i - 7), reference: i % 2 ? `PO/${1000 + i}` : null, invoices: [] })));
  if (p === "/purchase/orders")
    return page(purchaseAmounts.slice(0, 6).map((_, i) => ({ ...doc(i, `PO-0000${i + 1}`, "poDate", "vendor", vendors, purchaseAmounts, ["CONFIRMED", "DRAFT", "PARTIAL", "COMPLETED"]), poNo: `PO-0000${i + 1}`, expectedDate: iso(i - 10), bills: [] })));
  if (p === "/sales/credit-notes")
    return page(salesAmounts.slice(0, 4).map((_, i) => ({ ...doc(i, `CN-0000${i + 1}`, "noteDate", "customer", customers, [2450, 1180, 5600, 980], ["POSTED", "DRAFT"]), noteNo: `CN-0000${i + 1}`, reason: ["DAMAGED", "EXCESS", "WRONG_ITEM", "OTHER"][i], invoice: { id: i + 1, invoiceNo: `INV-0000${i + 1}` } })), { summary: { taxableAmount: "8652.00", taxAmount: "1558.00", grandTotal: "10210.00" } });
  if (p === "/purchase/debit-notes")
    return page(purchaseAmounts.slice(0, 4).map((_, i) => ({ ...doc(i, `DN-0000${i + 1}`, "noteDate", "vendor", vendors, [3200, 1750, 8400, 2100], ["POSTED", "DRAFT"]), noteNo: `DN-0000${i + 1}`, reason: ["DEFECTIVE", "EXPIRED", "EXCESS", "OTHER"][i], purchaseInvoice: { id: i + 1, billNo: `BILL-0000${i + 1}` } })), { summary: { taxableAmount: "13093.00", taxAmount: "2357.00", grandTotal: "15450.00" } });
  if (p === "/returns/sales")
    return page(salesAmounts.slice(0, 5).map((_, i) => ({ ...doc(i, `SR-0000${i + 1}`, "returnDate", "customer", customers, [1450, 3980, 760, 2200, 5100], ["POSTED", "DRAFT", "POSTED"]), returnNo: `SR-0000${i + 1}`, reason: ["DAMAGED", "EXPIRED", "WRONG_ITEM", "EXCESS", "OTHER"][i], restock: i % 2 === 0, invoice: { id: i + 1, invoiceNo: `INV-0000${i + 1}` } })), { summary: { taxableAmount: "11432.00", taxAmount: "2058.00", grandTotal: "13490.00" } });
  if (p === "/returns/purchase")
    return page(purchaseAmounts.slice(0, 4).map((_, i) => ({ ...doc(i, `PR-0000${i + 1}`, "returnDate", "vendor", vendors, [6200, 2850, 1400, 9100], ["POSTED", "DRAFT"]), returnNo: `PR-0000${i + 1}`, reason: ["DEFECTIVE", "DAMAGED", "EXPIRED", "OTHER"][i], purchaseInvoice: { id: i + 1, billNo: `BILL-0000${i + 1}` } })), { summary: { taxableAmount: "16568.00", taxAmount: "2982.00", grandTotal: "19550.00" } });
  if (p === "/inventory/adjustments")
    return page([0, 1, 2].map((i) => ({ id: i + 1, adjustmentNo: `ADJ-0000${i + 1}`, adjustmentDate: iso(i * 3), warehouse: wh, reason: ["PHYSICAL_COUNT", "DAMAGE", "EXPIRY"][i], status: ["POSTED", "DRAFT", "POSTED"][i], notes: i === 0 ? "Month-end count" : null, createdBy: by, items: productsList.slice(i, i + 3).map((p, j) => ({ id: j + 1, productId: p.id, product: { id: p.id, sku: p.sku, name: p.name, unit: p.unit }, qtyBefore: String(20 + j * 5), qtyChange: String(j % 2 ? -3 : 4), qtyAfter: String(20 + j * 5 + (j % 2 ? -3 : 4)), unitCost: p.purchasePrice, note: null })) })));
  if (p === "/inventory/stock")
    return page(
      productsList.map((pr, i) => ({ id: i + 1, product: pr, warehouse: wh, quantity: pr.stockQty, value: (Number(pr.stockQty) * Number(pr.purchasePrice)).toFixed(2), reorderLevel: pr.reorderLevel, isLow: Number(pr.reorderLevel) > 0 && Number(pr.stockQty) <= Number(pr.reorderLevel), updatedAt: iso(0) })),
      { summary: { totalQty: "1425", totalValue: "2560320.00", lowStockCount: 5 } },
    );
  if (p === "/inventory/stock/movements")
    return page([0, 1, 2, 3, 4].map((i) => ({ id: i + 1, movementDate: iso(i), direction: i % 2 ? "OUT" : "IN", quantity: String(10 + i * 5), balanceAfter: String(100 - i * 7), refType: ["PURCHASE_INVOICE", "SALES_INVOICE", "ADJUSTMENT", "SALES_INVOICE", "TRANSFER"][i], refNo: ["BILL-00003", "INV-00007", "ADJ-00001", "INV-00006", null][i], note: null, product: productsList[0], warehouse: wh, createdBy: by })));
  if (p === "/masters/products") return page(productsList.map((pr) => ({ ...pr, isActive: true, description: null })));
  if (p === "/masters/parties")
    return page(
      [...customers.map((nme, i) => ({ id: i + 1, code: `C-0000${i + 1}`, name: nme, partyType: "CUSTOMER", customerType: i % 2 === 0 ? "B2B" : "B2C", gstin: i % 2 === 0 ? `33AAACA123${i}A1Z5` : null, phone: `98400 000${i}1`, email: null, city: "Chennai", state: "Tamil Nadu", stateCode: "33", creditLimit: i % 2 === 0 ? "200000.00" : "0.00", creditDays: i % 2 === 0 ? 30 : 0, isActive: true })),
      ...vendors.map((nme, i) => ({ id: 20 + i, code: `V-0000${i + 1}`, name: nme, partyType: "VENDOR", customerType: null, gstin: `29AAACS55${i}0A1ZK`, phone: `98410 111${i}2`, email: null, city: "Bengaluru", state: "Karnataka", stateCode: "29", creditLimit: "0.00", creditDays: 45, isActive: true }))],
    );
  if (p === "/masters/warehouses") return { items: [wh, { id: 2, code: "SEC", name: "Secondary Store", isDefault: false, isActive: true }] };
  if (p === "/register/ledgers")
    return page(
      [
        ["1100", "Cash", "ASSET", "184200.00", "DR"], ["1110", "Bank", "ASSET", "1256400.00", "DR"], ["1200", "Accounts Receivable (Sundry Debtors)", "ASSET", "432830.00", "DR"], ["1300", "Inventory", "ASSET", "2560320.00", "DR"], ["1400", "GST Input (ITC)", "ASSET", "133696.00", "DR"],
        ["2100", "Accounts Payable (Sundry Creditors)", "LIABILITY", "266250.00", "CR"], ["2200", "GST Output", "LIABILITY", "190628.00", "CR"], ["3100", "Capital", "EQUITY", "3500000.00", "CR"], ["4100", "Sales", "INCOME", "1054602.00", "CR"], ["4200", "Sales Returns", "INCOME", "11432.00", "DR"],
        ["5100", "Purchases", "EXPENSE", "742754.00", "DR"], ["5200", "Purchase Returns", "EXPENSE", "16568.00", "CR"], ["5300", "Inventory Adjustment", "EXPENSE", "2140.00", "DR"], ["5900", "Round Off", "EXPENSE", "12.00", "DR"],
      ].map(([code, name, group, balance, type], i) => ({ id: i + 1, code, name, group, parent: null, parentId: null, openingBalance: "0.00", openingType: "DR", isSystem: true, isActive: true, balance, balanceType: type })),
    );
  if (p === "/approvals/summary") return { pending: 4, actionable: 3, rejected: 1, approvedAwaitingPost: 1, byLevel: { "1": 2, "2": 1, "3": 1 } };
  if (p === "/approvals/queue")
    return page([
      { docType: "SALES_INVOICE", docId: 1, docLabel: "Sales invoice", docNo: "INV-00001", date: iso(0), party: "ABC Traders", grandTotal: "25430.00", approvalStatus: "PENDING", level: 1, createdBy: by, submittedAt: iso(1), listHref: "/sales/register", can: { approve: true, reject: true } },
      { docType: "PURCHASE_INVOICE", docId: 2, docLabel: "Purchase invoice", docNo: "BILL-00002", date: iso(1), party: "National Supplies", grandTotal: "32450.00", approvalStatus: "PENDING", level: 2, createdBy: by, submittedAt: iso(2), listHref: "/purchase/register", can: { approve: true, reject: true } },
      { docType: "STOCK_ADJUSTMENT", docId: 3, docLabel: "Stock adjustment", docNo: "ADJ-00003", date: iso(2), party: null, grandTotal: null, approvalStatus: "PENDING", level: 1, createdBy: by, submittedAt: iso(3), listHref: "/inventory/stock/adjustment", can: { approve: true, reject: true } },
      { docType: "SALES_ORDER", docId: 4, docLabel: "Sales order", docNo: "SO-00004", date: iso(3), party: "Metro Wholesale", grandTotal: "42180.00", approvalStatus: "REJECTED", level: 1, createdBy: by, submittedAt: iso(4), listHref: "/sales/orders", can: { approve: false, reject: false } },
      { docType: "PURCHASE_INVOICE", docId: 5, docLabel: "Purchase invoice", docNo: "BILL-00005", date: iso(4), party: "Sri Distributors", grandTotal: "55200.00", approvalStatus: "APPROVED", level: 0, createdBy: by, submittedAt: iso(5), listHref: "/purchase/register", can: { approve: false, reject: false } },
    ]);
  if (p === "/manufacturing/summary")
    return { openOrders: 4, inProgress: 2, completedThisMonth: 18, qcPending: 3, quarantinedBatches: 1, wipValue: "184500.00", demo: true };
  if (p === "/manufacturing/orders")
    return page([
      { id: 1, orderNo: "WO-00021", product: productsList[5], fgBatchNo: "FG-260921-01", plannedQty: "500", producedQty: "320", unit: "BAG", issuedCost: "162000.00", absorbedCost: "103680.00", status: "IN_PROGRESS", approvalStatus: "APPROVED" },
      { id: 2, orderNo: "WO-00022", product: productsList[7], fgBatchNo: "FG-260920-02", plannedQty: "300", producedQty: "0", unit: "PCS", issuedCost: "72000.00", absorbedCost: "0.00", status: "RELEASED", approvalStatus: "APPROVED" },
      { id: 3, orderNo: "WO-00020", product: productsList[6], fgBatchNo: "FG-260918-03", plannedQty: "1200", producedQty: "1200", unit: "STRIP", issuedCost: "11400.00", absorbedCost: "11400.00", status: "COMPLETED", approvalStatus: "APPROVED" },
      { id: 4, orderNo: "WO-00023", product: productsList[3], fgBatchNo: "FG-260921-04", plannedQty: "800", producedQty: "0", unit: "PCS", issuedCost: "49600.00", absorbedCost: "0.00", status: "DRAFT", approvalStatus: "PENDING" },
    ]);
  if (p === "/manufacturing/qc")
    return page([
      { id: 1, inspectionNo: "QC-00018", batch: { batchNo: "FG-260921-01" }, type: "FINISHED", inspectionDate: iso(0), status: "DRAFT" },
      { id: 2, inspectionNo: "QC-00017", batch: { batchNo: "RM-260920-07" }, type: "INCOMING", inspectionDate: iso(1), status: "DRAFT" },
      { id: 3, inspectionNo: "QC-00016", batch: { batchNo: "FG-260918-03" }, type: "RETEST", inspectionDate: iso(2), status: "DRAFT" },
    ]);
  if (p.startsWith("/register/reports/")) {
    const report = p.slice("/register/reports/".length);
    if (report === "trial-balance") return { rows: [{ code: "1100", name: "Cash", group: "ASSET", debit: "184200.00", credit: "0.00" }, { code: "4100", name: "Sales", group: "INCOME", debit: "0.00", credit: "1054602.00" }], totals: { debit: "184200.00", credit: "1054602.00", difference: "870402.00" } };
    if (report === "outstanding") return { type: "receivable", total: "432830.00", ageing: { "0-30": "214300.00", "31-60": "122130.00", "61-90": "0.00", "90+": "96400.00" }, parties: [{ name: "ABC Traders", invoices: 3, oldestDue: iso(42), overdue: "96400.00", outstanding: "182430.00" }, { name: "Metro Wholesale", invoices: 2, oldestDue: iso(18), overdue: "0.00", outstanding: "74600.00" }] };
    if (report === "day-book") return { vouchers: [{ voucherType: "SALES", voucherNo: "INV-00001", entryDate: iso(0), debit: "25430.00", narration: "Retail sale", lines: [{ id: 1, ledger: { code: "1200", name: "Accounts Receivable" }, debit: "25430.00", credit: "0.00" }, { id: 2, ledger: { code: "4100", name: "Sales" }, debit: "0.00", credit: "25430.00" }] }], totals: { debit: "25430.00", credit: "25430.00" } };
    if (report === "gst-summary") return { rows: [{ rate: "18", taxable: "1054602.00", cgst: "94749.00", sgst: "94749.00", igst: "0.00", tax: "189498.00" }, { rate: "5", taxable: "128400.00", cgst: "3210.00", sgst: "3210.00", igst: "0.00", tax: "6420.00" }], totals: { taxable: "1183002.00", tax: "195918.00" } };
    return { months: [{ month: "Sep 2026", count: 148, taxable: "1054602.00", tax: "190628.00", b2b: "842300.00", b2c: "402930.00", total: "1245230.00" }], count: 148, total: "1245230.00" };
  }
  return null;
}

/** Dashboard summary matching the reference design. */
export const DEMO_DASHBOARD = {
  company: "QuickERP",
  generatedAt: new Date().toISOString(),
  year: new Date().getFullYear(),
  cached: false,
  demo: true,
  sales: { today: "84230.00", todayCount: 9, month: "1245230.00", monthCount: 148, prevMonth: "1111812.00", growthPct: 12, year: "12845230.00" },
  purchases: { month: "876450.00", monthCount: 42, prevMonth: "811527.00", growthPct: 8, year: "9210300.00" },
  counts: { customers: 1248, customersGrowthPct: 12, suppliers: 436, suppliersGrowthPct: 6, products: 812 },
  receivables: { total: "432830.00", overdue: "96400.00", count: 37 },
  payables: { total: "266250.00", overdue: "41200.00", count: 14 },
  orders: { openSalesOrders: 11, openPurchaseOrders: 6, draftInvoices: 3 },
  inventory: { value: "2560320.00", lowStock: 3, outOfStock: 2 },
  returns: { month: "13490.00", monthCount: 5 },
  salesSeries: [],
  monthlySeries: [
    ["Jan", 92000, 61000], ["Feb", 118000, 78000], ["Mar", 104000, 71000], ["Apr", 139000, 96000], ["May", 122000, 88000], ["Jun", 151000, 104000],
    ["Jul", 143000, 97000], ["Aug", 168000, 112000], ["Sep", 182450, 121300], ["Oct", 154000, 108000], ["Nov", 171000, 119000], ["Dec", 160000, 105000],
  ].map(([month, sales, purchase]) => ({ month: String(month), sales: String(sales), purchase: String(purchase) })),
  stockAlerts: [
    { productId: 1, sku: "P001", name: "Dove Soap 100g", unit: "PCS", quantity: "5", reorderLevel: "20", status: "LOW" },
    { productId: 2, sku: "P002", name: "Ariel Detergent 1kg", unit: "PCS", quantity: "0", reorderLevel: "15", status: "OUT" },
    { productId: 3, sku: "P003", name: "Sunflower Oil 1L", unit: "PCS", quantity: "8", reorderLevel: "24", status: "LOW" },
    { productId: 4, sku: "P004", name: "Toothpaste 100g", unit: "PCS", quantity: "12", reorderLevel: "30", status: "LOW" },
    { productId: 5, sku: "P005", name: "Tea Powder 250g", unit: "PCS", quantity: "0", reorderLevel: "20", status: "OUT" },
  ],
  topProducts: [],
  recentInvoices: [
    { id: 1, invoiceNo: "INV-00148", invoiceDate: iso(0), customer: "ABC Traders", customerType: "B2B", status: "POSTED", paymentStatus: "PAID", grandTotal: "25430.00" },
    { id: 2, invoiceNo: "INV-00147", invoiceDate: iso(0), customer: "Walk-in Customer", customerType: "B2C", status: "POSTED", paymentStatus: "PAID", grandTotal: "3250.00" },
    { id: 3, invoiceNo: "INV-00146", invoiceDate: iso(1), customer: "Global Mart", customerType: "B2B", status: "DRAFT", paymentStatus: "UNPAID", grandTotal: "18760.00" },
    { id: 4, invoiceNo: "INV-00145", invoiceDate: iso(1), customer: "Fresh Retail", customerType: "B2C", status: "POSTED", paymentStatus: "PAID", grandTotal: "5400.00" },
    { id: 5, invoiceNo: "INV-00144", invoiceDate: iso(2), customer: "Metro Wholesale", customerType: "B2B", status: "POSTED", paymentStatus: "PARTIAL", grandTotal: "42180.00" },
  ],
  recentBills: [
    { id: 1, billNo: "BILL-00042", invoiceDate: iso(0), vendor: "Sri Distributors", status: "POSTED", paymentStatus: "PAID", grandTotal: "55200.00" },
    { id: 2, billNo: "BILL-00041", invoiceDate: iso(1), vendor: "National Supplies", status: "POSTED", paymentStatus: "UNPAID", grandTotal: "32450.00" },
    { id: 3, billNo: "BILL-00040", invoiceDate: iso(1), vendor: "Prime Traders", status: "DRAFT", paymentStatus: "UNPAID", grandTotal: "18900.00" },
    { id: 4, billNo: "BILL-00039", invoiceDate: iso(2), vendor: "Global Imports", status: "POSTED", paymentStatus: "PAID", grandTotal: "76300.00" },
    { id: 5, billNo: "BILL-00038", invoiceDate: iso(3), vendor: "City Wholesalers", status: "POSTED", paymentStatus: "PARTIAL", grandTotal: "41600.00" },
  ],
};

export const DEMO_RETURNS_REPORT = {
  summary: { salesReturns: { count: 5, amount: "13490.00" }, purchaseReturns: { count: 4, amount: "19550.00" } },
  byReason: [
    { reason: "DAMAGED", sales: 2, purchase: 1, salesAmount: "5430.00", purchaseAmount: "2850.00" },
    { reason: "EXPIRED", sales: 1, purchase: 1, salesAmount: "3980.00", purchaseAmount: "1400.00" },
    { reason: "DEFECTIVE", sales: 0, purchase: 1, salesAmount: "0.00", purchaseAmount: "6200.00" },
    { reason: "WRONG_ITEM", sales: 1, purchase: 0, salesAmount: "760.00", purchaseAmount: "0.00" },
    { reason: "OTHER", sales: 1, purchase: 1, salesAmount: "3320.00", purchaseAmount: "9100.00" },
  ],
  byProduct: [
    { productId: 2, sku: "P002", name: "Ariel Detergent 1kg", salesQty: "12.000", purchaseQty: "24.000", amount: "7740.00" },
    { productId: 3, sku: "P003", name: "Sunflower Oil 1L", salesQty: "20.000", purchaseQty: "0.000", amount: "2840.00" },
    { productId: 1, sku: "P001", name: "Dove Soap 100g", salesQty: "36.000", purchaseQty: "48.000", amount: "3780.00" },
  ],
  monthly: ["04", "05", "06", "07", "08", "09"].map((m, i) => ({ month: `${new Date().getFullYear()}-${m}`, salesReturns: String([2100, 3400, 1800, 4200, 2900, 3650][i]), purchaseReturns: String([1500, 900, 4100, 2200, 3300, 1950][i]) })),
  recent: [
    { type: "SALES", id: 1, no: "SR-00005", date: new Date().toISOString(), party: "Metro Wholesale", reason: "OTHER", amount: "5100.00" },
    { type: "PURCHASE", id: 4, no: "PR-00004", date: new Date(Date.now() - 86400000).toISOString(), party: "Global Imports", reason: "OTHER", amount: "9100.00" },
    { type: "SALES", id: 2, no: "SR-00004", date: new Date(Date.now() - 2 * 86400000).toISOString(), party: "Fresh Retail", reason: "EXCESS", amount: "2200.00" },
    { type: "PURCHASE", id: 1, no: "PR-00001", date: new Date(Date.now() - 3 * 86400000).toISOString(), party: "Sri Distributors", reason: "DEFECTIVE", amount: "6200.00" },
  ],
};
