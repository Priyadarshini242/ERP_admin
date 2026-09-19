import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Calculator,
  ClipboardCheck,
  ClipboardList,
  Contact,
  Factory,
  FileBarChart,
  FileMinus,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  GitBranch,
  Landmark,
  Layers,
  LayoutDashboard,
  Network,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  PercentCircle,
  PieChart,
  Receipt,
  ScrollText,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Truck,
  Undo2,
  UserPlus,
  Users,
  Warehouse,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
  children?: NavItem[];
  /** route has no page yet — the placeholder screen explains what will live there */
  soon?: boolean;
}

/** A module = one icon in the left rail + its own menu panel (the second sidebar). */
export interface NavModule {
  key: string;
  /** short label under the rail icon */
  label: string;
  /** heading of the menu panel */
  title: string;
  subtitle: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const MODULES: NavModule[] = [
  {
    key: "exec",
    label: "EXEC",
    title: "Executive",
    subtitle: "Company overview, approvals & setup",
    icon: LayoutDashboard,
    items: [
      {
        label: "Executive Dashboard",
        icon: PieChart,
        children: [
          { label: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Business Overview", href: "/exec/overview", icon: BarChart3, soon: true },
        ],
      },
      {
        label: "Approvals",
        icon: ClipboardCheck,
        children: [
          { label: "Approval Inbox", href: "/approvals", icon: ClipboardCheck },
          { label: "Pending Verification", href: "/approvals?status=PENDING", icon: ClipboardList },
          { label: "Rejected Documents", href: "/approvals?status=REJECTED", icon: FileMinus },
        ],
      },
      {
        label: "Reports",
        icon: BarChart3,
        children: [
          { label: "Financial Reports", href: "/register/reports", icon: FileBarChart },
          { label: "Sales Reporting", href: "/register/reports?tab=sales-summary", icon: PieChart },
          { label: "Purchase Reporting", href: "/register/reports?tab=purchase-summary", icon: PieChart },
          { label: "Stock Valuation", href: "/inventory/stock/management?view=product", icon: Warehouse },
        ],
      },
      {
        label: "Company Setup",
        icon: Building2,
        children: [
          { label: "Company Profile", href: "/settings", icon: Building2 },
          { label: "Users & Roles", href: "/exec/users", icon: Users, soon: true },
          { label: "Document Numbering", href: "/exec/numbering", icon: ScrollText, soon: true },
        ],
      },
    ],
  },
  {
    key: "fin",
    label: "FIN",
    title: "Finance",
    subtitle: "Accounting, vouchers & financial reporting",
    icon: Landmark,
    items: [
      {
        label: "Finance Dashboard",
        icon: BookOpen,
        children: [
          { label: "My Dashboard", href: "/dashboard", icon: PieChart },
          { label: "Voucher Verification", href: "/approvals", icon: ClipboardCheck },
          { label: "Chart Of Accounts", href: "/register/ac-ledger", icon: Network },
          { label: "Chart of Cost Centers", href: "/finance/cost-centers", icon: Network, soon: true },
        ],
      },
      {
        label: "Registers",
        icon: ClipboardList,
        children: [
          { label: "Accounting Ledgers", href: "/register/ac-ledger", icon: BookOpen },
          { label: "Accounting Register", href: "/finance/registers/accounting", icon: BookOpen, soon: true },
          { label: "Journal Register", href: "/finance/registers/journal", icon: ScrollText, soon: true },
        ],
      },
      {
        label: "Transactions",
        icon: ArrowLeftRight,
        children: [
          { label: "Cash Payment Voucher", href: "/finance/vouchers/cash-payment", icon: Banknote, soon: true },
          { label: "Bank Payment Voucher", href: "/finance/vouchers/bank-payment", icon: Landmark, soon: true },
          { label: "Cash Receipt Voucher", href: "/finance/vouchers/cash-receipt", icon: Wallet, soon: true },
          { label: "Bank Receipt Voucher", href: "/finance/vouchers/bank-receipt", icon: FileText, soon: true },
          { label: "Sales Voucher", href: "/finance/vouchers/sales", icon: Receipt, soon: true },
          { label: "Purchase Voucher", href: "/finance/vouchers/purchase", icon: ShoppingCart, soon: true },
          { label: "Journal Voucher", href: "/finance/vouchers/journal", icon: BookOpen, soon: true },
        ],
      },
      {
        label: "Reports",
        icon: BarChart3,
        children: [
          { label: "Financial Reports", href: "/register/reports", icon: FileBarChart },
          { label: "Bills Receivable", href: "/register/reports?tab=outstanding&type=receivable", icon: FileSpreadsheet },
          { label: "Bills Payable", href: "/register/reports?tab=outstanding&type=payable", icon: FileSpreadsheet },
        ],
      },
      { label: "Cost Accounting", href: "/finance/cost-accounting", icon: Calculator, soon: true },
    ],
  },
  {
    key: "gst",
    label: "GST",
    title: "GST / Tax",
    subtitle: "Tax registers, e-invoicing & returns",
    icon: PercentCircle,
    items: [
      {
        label: "Sales",
        icon: Store,
        children: [
          { label: "Sales Invoice Register", href: "/sales/register", icon: Receipt },
          { label: "Credit Note Register", href: "/sales/credit-notes", icon: FileMinus },
          { label: "eInvoice Log Register", href: "/gst/einvoice-log", icon: FileText, soon: true },
          { label: "Proforma Invoices", href: "/gst/proforma-invoices", icon: FileText, soon: true },
        ],
      },
      {
        label: "Purchase",
        icon: ShoppingCart,
        children: [
          { label: "Purchase Invoice Register", href: "/purchase/register", icon: Receipt },
          { label: "Debit Note Register", href: "/purchase/debit-notes", icon: FilePlus },
        ],
      },
      {
        label: "Reports",
        icon: BarChart3,
        children: [
          { label: "GST Returns", href: "/register/reports?tab=gst-summary", icon: PercentCircle },
          { label: "Sales Reporting", href: "/register/reports?tab=sales-summary", icon: PieChart },
          { label: "Revenue Reporting", href: "/gst/revenue-reporting", icon: PieChart, soon: true },
        ],
      },
    ],
  },
  {
    key: "ims",
    label: "IMS",
    title: "Inventory Management",
    subtitle: "Masters, order processing & stock control",
    icon: Boxes,
    items: [
      {
        label: "Master Data",
        icon: Users,
        children: [
          { label: "Client Leads", href: "/masters/parties?role=customer", icon: UserPlus },
          { label: "Suppliers", href: "/masters/parties?role=vendor", icon: Building2 },
          { label: "Stock Inventory", href: "/masters/products", icon: Package },
        ],
      },
      {
        label: "Sales Processing",
        icon: ShoppingBag,
        children: [
          { label: "Material Requests", href: "/ims/material-requests", icon: ClipboardList, soon: true },
          { label: "Quotations To Clients", href: "/ims/quotations", icon: FileText, soon: true },
          { label: "Sales Orders", href: "/sales/orders", icon: ClipboardList },
          { label: "Delivery Note", href: "/ims/delivery-notes", icon: Truck, soon: true },
        ],
      },
      {
        label: "Procurement Processing",
        icon: ShoppingCart,
        children: [
          { label: "RFQ Database", href: "/ims/rfq", icon: FileText, soon: true },
          { label: "Quotation Analysis", href: "/ims/quotation-analysis", icon: BarChart3, soon: true },
          { label: "Purchase Orders", href: "/purchase/orders", icon: ClipboardList },
          { label: "Material Receipts", href: "/ims/material-receipts", icon: PackageCheck, soon: true },
        ],
      },
      {
        label: "Stock",
        icon: Warehouse,
        children: [
          { label: "Stock Management", href: "/inventory/stock/management", icon: ArrowLeftRight },
          { label: "Batch & Expiry", href: "/inventory/stock/management?view=batch", icon: Layers },
          { label: "Stock Adjustments", href: "/inventory/stock/adjustment", icon: SlidersHorizontal },
        ],
      },
      {
        label: "Returns",
        icon: Undo2,
        children: [
          { label: "Sales Returns", href: "/returns/sales", icon: PackageCheck },
          { label: "Purchase Returns", href: "/returns/purchase", icon: PackageMinus },
          { label: "Returns Report", href: "/returns/report", icon: FileText },
        ],
      },
      { label: "Approvals", href: "/approvals", icon: ClipboardCheck },
    ],
  },
  {
    key: "mfg",
    label: "MFG",
    title: "Manufacturing",
    subtitle: "BOMs, work orders, QC & batch traceability",
    icon: Factory,
    items: [
      { label: "Production Dashboard", href: "/manufacturing", icon: PieChart },
      {
        label: "Product Structure",
        icon: Layers,
        children: [
          { label: "Bill of Materials", href: "/manufacturing/boms", icon: Layers },
          { label: "Stock Inventory", href: "/masters/products", icon: Package },
        ],
      },
      {
        label: "Production Processing",
        icon: Factory,
        children: [
          { label: "Work Orders", href: "/manufacturing/orders", icon: ClipboardList },
          { label: "Material Issues", href: "/manufacturing/issues", icon: Truck },
          { label: "Production Receipts", href: "/manufacturing/receipts", icon: PackagePlus },
        ],
      },
      {
        label: "Quality Control",
        icon: FlaskConical,
        children: [
          { label: "QC Inspections", href: "/manufacturing/qc", icon: FlaskConical },
          { label: "Batch & Expiry", href: "/inventory/stock/management?view=batch", icon: Layers },
        ],
      },
      {
        label: "Traceability",
        icon: GitBranch,
        children: [
          { label: "Genealogy & Recall", href: "/manufacturing/genealogy", icon: GitBranch },
          { label: "Stock Adjustments", href: "/inventory/stock/adjustment", icon: SlidersHorizontal },
        ],
      },
    ],
  },
];

export const NAV_FOOTER: NavItem[] = [{ label: "Settings", href: "/settings", icon: Settings }];

/** Entry (form) pages are opened from buttons, not the menu — listed here only for the Ctrl+K search. */
export const ENTRY_PAGES: { label: string; href: string; path: string }[] = [
  { label: "Create Sales Order", href: "/sales/orders/new", path: "IMS › Sales Processing" },
  { label: "New Sales Invoice", href: "/sales/register/new", path: "GST › Sales" },
  { label: "New Credit Note", href: "/sales/credit-notes/new", path: "GST › Sales" },
  { label: "Create PO", href: "/purchase/orders/new", path: "IMS › Procurement Processing" },
  { label: "New Purchase Bill", href: "/purchase/register/new", path: "GST › Purchase" },
  { label: "New Debit Note", href: "/purchase/debit-notes/new", path: "GST › Purchase" },
  { label: "New Sales Return", href: "/returns/sales/new", path: "IMS › Returns" },
  { label: "New Purchase Return", href: "/returns/purchase/new", path: "IMS › Returns" },
  { label: "New Bill of Materials", href: "/manufacturing/boms/new", path: "MFG › Production" },
  { label: "Create Work Order", href: "/manufacturing/orders/new", path: "MFG › Production" },
  { label: "New Material Issue", href: "/manufacturing/issues/new", path: "MFG › Production" },
  { label: "New Production Receipt", href: "/manufacturing/receipts/new", path: "MFG › Production" },
  { label: "New QC Inspection", href: "/manufacturing/qc/new", path: "MFG › Production" },
];

/** Every menu entry of one module, flattened with its breadcrumb trail. */
export function flattenModule(m: NavModule): { label: string; href: string; path: string; soon?: boolean }[] {
  const out: { label: string; href: string; path: string; soon?: boolean }[] = [];
  const walk = (items: NavItem[], trail: string[]) => {
    for (const it of items) {
      const p = [...trail, it.label];
      if (it.href) out.push({ label: it.label, href: it.href, path: trail.join(" › "), soon: it.soon });
      if (it.children) walk(it.children, p);
    }
  };
  walk(m.items, [m.label]);
  return out;
}

/** Flat list of every navigable page (used by the Ctrl+K search). */
export function flattenNav(): { label: string; href: string; path: string }[] {
  const seen = new Set<string>();
  const out: { label: string; href: string; path: string }[] = [];
  for (const m of MODULES) {
    for (const e of flattenModule(m)) {
      const key = `${e.href}|${e.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: e.label, href: e.href, path: e.path });
    }
  }
  for (const f of NAV_FOOTER) if (f.href) out.push({ label: f.label, href: f.href, path: "System" });
  return [...out, ...ENTRY_PAGES];
}

/** Which module owns a path — longest matching href wins; manufacturing/inventory default to IMS. */
export function moduleForPath(pathname: string): NavModule {
  let best: { m: NavModule; len: number } | null = null;
  for (const m of MODULES) {
    for (const e of flattenModule(m)) {
      const href = e.href.split("?")[0];
      if (pathname === href || pathname.startsWith(`${href}/`)) {
        if (!best || href.length > best.len) best = { m, len: href.length };
      }
    }
  }
  if (best) return best.m;
  const prefix = MODULES.find((m) => pathname.startsWith(`/${m.key}/`));
  return prefix ?? MODULES[0];
}

/** The menu entry (if any) for a path, with its trail — used by the placeholder screen. */
export function findMenuEntry(pathname: string): { module: NavModule; trail: string[]; item: NavItem; siblings: NavItem[] } | null {
  for (const m of MODULES) {
    const stack: { items: NavItem[]; trail: string[] }[] = [{ items: m.items, trail: [] }];
    while (stack.length) {
      const { items, trail } = stack.pop()!;
      for (const it of items) {
        if (it.href && it.href.split("?")[0] === pathname) return { module: m, trail, item: it, siblings: items };
        if (it.children) stack.push({ items: it.children, trail: [...trail, it.label] });
      }
    }
  }
  return null;
}
