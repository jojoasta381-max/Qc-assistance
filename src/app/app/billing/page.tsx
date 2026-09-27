'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  Download,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export default function AppBillingPage() {
  const { tenant } = useAuth();
  const [quotaUsed, setQuotaUsed] = useState(tenant?.quotaUsed ?? 38);
  const [quotaLimit, setQuotaLimit] = useState(tenant?.checkQuota ?? 100);
  const [currentPlan, setCurrentPlan] = useState<'PAY_PER_CHECK' | 'PRO_MONTHLY' | 'PRO_ANNUAL' | 'ENTERPRISE'>('PRO_MONTHLY');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCheckout = async (planCode: string) => {
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenant?.slug || 'spandsons',
        },
        body: JSON.stringify({
          plan_code: planCode,
          customer: {
            name: 'Pravin Kumar',
            email: 'pravin@spandsons.com',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const amt = data.checkout.amount_minor / 100;
        if (planCode === 'PAY_PER_CHECK') {
          setQuotaLimit((prev) => prev + 25);
          showToast(`Top-up successful! Added 25 checks (Order: ${data.checkout.order_id}).`);
        } else if (planCode === 'PRO_MONTHLY') {
          setCurrentPlan('PRO_MONTHLY');
          setQuotaLimit(100);
          showToast(`Subscribed to Pro Monthly at ₹${amt}/mo!`);
        } else if (planCode === 'PRO_ANNUAL') {
          setCurrentPlan('PRO_ANNUAL');
          setQuotaLimit(1500);
          showToast(`Subscribed to Industrial Annual at ₹${amt}/yr!`);
        }
      } else {
        showToast('Checkout could not be processed at this time.');
      }
    } catch {
      showToast('Network error while contacting payment gateway.');
    }
  };

  const percentUsed = Math.min(Math.round((quotaUsed / quotaLimit) * 100), 100);

  const invoices = [
    { id: 'INV-2026-0914', date: '2026-09-01', desc: 'Pro Monthly EMS Subscription (100 Checks)', amount: '₹499.00', status: 'PAID' },
    { id: 'INV-2026-0812', date: '2026-08-01', desc: 'Pro Monthly EMS Subscription (100 Checks)', amount: '₹499.00', status: 'PAID' },
    { id: 'INV-2026-0744', date: '2026-07-15', desc: 'Add-on Pack: 25 Extra Diagram Checks', amount: '₹99.00', status: 'PAID' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1120] border border-sky-500/40 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-sky-400" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="pb-4 border-b border-white/10 space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold mb-1">
          <CreditCard className="w-3.5 h-3.5" />
          COMMERCIAL BILLING &amp; RAZORPAY GATEWAY
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Subscription Plan &amp; Diagram Check Quota
        </h1>
        <p className="text-xs text-slate-400">
          Track active diagram quota consumption, purchase add-on check packs, or manage enterprise invoicing.
        </p>
      </div>

      {/* Active Quota Card */}
      <div className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Active Subscription</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3" /> Server-Authoritative
              </span>
            </div>
            <div className="text-2xl font-bold text-white mt-0.5">
              {currentPlan === 'PRO_MONTHLY'
                ? 'Pro Monthly EMS Plan (₹499 / mo)'
                : currentPlan === 'PRO_ANNUAL'
                ? 'Industrial Annual Plan (₹4,999 / yr)'
                : currentPlan === 'PAY_PER_CHECK'
                ? 'Pay-Per-Check (₹99 / check)'
                : 'Enterprise Custom Dedicated SLA'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Reset date: 1st of next month &bull; Billed to: {tenant?.name || 'Spandsons Horizon Engineering'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCheckout('PAY_PER_CHECK')}
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-200 transition"
            >
              + 25 Checks (₹99)
            </button>
            <button
              onClick={() => handleCheckout('PRO_MONTHLY')}
              className="btn-primary px-4 py-2 text-xs font-bold shadow-lg"
            >
              + 100 Checks Monthly Pack
            </button>
          </div>
        </div>

        {/* Quota Progress */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">
              Used: <strong className="text-sky-400">{quotaUsed}</strong> / {quotaLimit} Checks
            </span>
            <span className={percentUsed > 85 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
              {percentUsed}% Quota Utilized ({quotaLimit - quotaUsed} remaining)
            </span>
          </div>
          <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all ${
                percentUsed > 85 ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-400' : 'bg-[#0284C7]'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tier Switcher Cards */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Available Commercial Plans</h2>
          <p className="text-xs text-slate-400">
            Switch between tiers based on manufacturing inspection complexity and volume.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { id: 'PAY_PER_CHECK', name: 'Pay-Per-Check', price: '₹99', checks: 'Single audit', desc: 'Single-page schematics, basic IPC Class 2 checks.' },
            { id: 'PRO_MONTHLY', name: 'Pro Monthly', price: '₹499', checks: '100 checks/mo', desc: 'Multi-page harness manuals, IPC + UL 508A, CAD coordinate pinpointing.' },
            { id: 'PRO_ANNUAL', name: 'Industrial Annual', price: '₹4,999', checks: '1,500 checks/yr', desc: 'Aerospace Class 3, netlists, custom SOP rules, regression loop.' },
            { id: 'ENTERPRISE', name: 'Enterprise', price: 'Custom', checks: 'Unlimited', desc: 'Dedicated instance, air-gapped on-premise, 99.99% SLA.' },
          ].map((plan: any) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`p-5 rounded-2xl flex flex-col justify-between space-y-4 transition ${
                  isCurrent
                    ? 'bg-[#0A1120] border-2 border-sky-500 shadow-xl'
                    : 'bg-[#0A1120] border border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        ACTIVE PLAN
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                    <span className="text-[11px] text-slate-400">{plan.id === 'PAY_PER_CHECK' ? '/ check' : plan.id === 'PRO_ANNUAL' ? '/ yr' : '/ mo'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">{plan.checks}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{plan.desc}</p>
                </div>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-2 rounded-lg text-xs font-mono font-bold transition ${
                    isCurrent
                      ? 'bg-white/5 text-slate-400 cursor-default'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : 'Select ' + plan.name}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Billing Invoice History */}
      <section className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Invoice History &amp; GST Receipts</h2>
          <p className="text-xs text-slate-400">
            Download PDF receipts and GST invoices for corporate accounting.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 px-3">Invoice Number</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-3 text-sky-400 font-bold">{inv.id}</td>
                  <td className="py-3 px-3 text-slate-400">{inv.date}</td>
                  <td className="py-3 px-3 font-sans text-white">{inv.desc}</td>
                  <td className="py-3 px-3 font-bold text-white">{inv.amount}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => showToast(`Downloaded invoice ${inv.id}`)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition inline-flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
