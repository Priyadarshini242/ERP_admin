"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CreditCard, PackageCheck, ReceiptText, Search, ShoppingBag, ShoppingCart, Trash2, Wallet } from "lucide-react";

import { useList, type ProductLite } from "@/lib/hooks";

const currency = (value: number) => `₹${value.toFixed(2)}`;

type Item = {
  id: number;
  name: string;
  sku: string;
  price: number;
  qty: number;
};

export default function PosTerminalPage() {
  const [query, setQuery] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const { items: catalog } = useList<ProductLite>("/masters/products", { active: true, pageSize: 200 });
  const [items, setItems] = useState<Item[]>([]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (catalog ?? [])
      .filter((p) => {
        const name = (p.name ?? "").toLowerCase();
        const sku = (p.sku ?? "").toLowerCase();
        const hsn = (p.hsnCode ?? "").toLowerCase();
        return name.includes(q) || sku.includes(q) || hsn.includes(q);
      })
      .slice(0, 8);
  }, [catalog, query]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = 0;
  const total = subtotal - discount;

  const addItem = (product: ProductLite) => {
    const price = Number(product.sellingPrice ?? 0);
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { id: product.id, name: product.name, sku: product.sku, price, qty: 1 }];
    });
    setQuery("");
  };

  const updateQty = (id: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="h-[calc(100vh-140px)] min-h-[720px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-full">
        <div className="flex min-w-0 flex-1 flex-col border-r border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between border-b border-slate-200 bg-brand-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white shadow-sm">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800">POS Terminal</h1>
                  <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                    Shop
                  </span>
                </div>
                <p className="text-xs text-slate-500">Platform Owner · Wed, 23 Sep, 2026</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
                Fullscreen
              </button>
              <button className="rounded-md border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
                Camera
              </button>
              <button className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-brand-700">
                Scanner ON
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, SKU or barcode — then press Enter to add"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

          </div>

          <div className="flex-1 overflow-hidden px-4 pb-4">
            <div className="h-full overflow-auto rounded-xl border border-slate-200 bg-white">
              <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-brand-50 px-4 text-sm font-semibold text-slate-800">
                <span>Cart Items (0)</span>
              </div>

              {items.length === 0 ? (
                <div className="flex h-[calc(100%-48px)] items-center justify-center text-center text-slate-400">
                  <div>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-300">
                      <ShoppingCart className="h-8 w-8" />
                    </div>
                    <p className="text-xl font-medium text-slate-500">Cart is empty</p>
                    <p className="mt-2 text-sm text-slate-400">Scan a barcode or search to add items</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <PackageCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.sku}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="h-8 w-8 rounded-md border border-slate-200 bg-white text-lg text-slate-600 hover:bg-slate-100">
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-slate-700">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="h-8 w-8 rounded-md border border-slate-200 bg-white text-lg text-slate-600 hover:bg-slate-100">
                          +
                        </button>
                      </div>

                      <div className="w-20 text-right text-sm font-semibold text-slate-800">{currency(item.price * item.qty)}</div>
                      <button onClick={() => removeItem(item.id)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="w-[360px] border-l border-slate-200 bg-slate-50 p-4">
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Customer</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Mobile required</span>
              </div>
              <label className="block text-xs text-slate-500">Mobile number * (required to save)</label>
              <input
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="Mobile number"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Cash Customer</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Wallet className="h-4 w-4" />
                Payment
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "CASH", label: "Cash", icon: Wallet },
                  { key: "CARD", label: "Card", icon: CreditCard },
                  { key: "UPI", label: "UPI", icon: ReceiptText },
                ].map((option) => {
                  const Icon = option.icon;
                  const active = paymentMode === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setPaymentMode(option.key as "CASH" | "CARD" | "UPI")}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        active ? "border-brand-500 bg-brand-600 text-white shadow-sm" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Cash received</span>
                <span className="font-semibold text-slate-800">0</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span className="font-medium">{currency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Discount</span>
                  <span className="font-medium text-red-500">- {currency(discount)}</span>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between text-lg font-bold text-slate-800">
                    <span>Total</span>
                    <span className="text-brand-600">{currency(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-400">
              <ArrowLeft className="h-4 w-4" />
              Save & Print — {currency(total)}
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600">
              <ArrowLeft className="h-5 w-5 rotate-180" />
            </button>
          </div>
        </aside>
      </div>

      {query && filteredProducts.length > 0 && (
        <div className="absolute left-4 top-[116px] z-10 w-[440px] rounded-xl border border-brand-300 bg-[#eafaf5] p-1.5 shadow-lg shadow-brand-100/60">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => addItem(product)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition hover:bg-white/60"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-slate-800">{product.name}</div>
                <div className="mt-0.5 text-[10px] text-slate-600">
                  SKU: {product.sku} · Stock: {Number(product.stockQty ?? 0)} {product.unit || "PCS"}
                </div>
              </div>
              <div className="ml-3 whitespace-nowrap text-[13px] font-bold text-slate-800">{currency(Number(product.sellingPrice ?? 0))}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
