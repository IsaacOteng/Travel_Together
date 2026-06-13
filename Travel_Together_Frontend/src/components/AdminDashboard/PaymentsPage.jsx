import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, Wallet, RotateCcw } from "lucide-react";
import { adminApi } from "../../services/api";
import toast from "react-hot-toast";

const STATUSES = ["", "pending", "held", "released", "refunded", "failed"];

const STATUS_META = {
  pending:  { bg: "bg-slate-500/15",  text: "text-slate-400"  },
  held:     { bg: "bg-blue-500/15",   text: "text-blue-400"   },
  released: { bg: "bg-green-500/15",  text: "text-green-400"  },
  refunded: { bg: "bg-purple-500/15", text: "text-purple-400" },
  failed:   { bg: "bg-red-500/15",    text: "text-red-400"    },
};

function StatusPill({ value }) {
  const m = STATUS_META[value] ?? STATUS_META.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${m.bg} ${m.text}`}>
      {value}
    </span>
  );
}

function Skeleton({ className }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className}`} />;
}

function Paginator({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-white/6">
      <span className="text-slate-500 text-xs">Page {page} of {totalPages} · {total} total</span>
      <div className="flex gap-1">
        <button disabled={page <= 1} onClick={() => onChange(p => p - 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={15} />
        </button>
        <button disabled={page >= totalPages} onClick={() => onChange(p => p + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-[#0d1f33] rounded-2xl border border-white/6 px-4 py-3 flex-1 min-w-40">
      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent}`}>GH₵{value}</p>
    </div>
  );
}

export default function PaymentsPage() {
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState("");
  const [status,   setStatus]  = useState("");
  const [page,     setPage]    = useState(1);
  const [error,    setError]   = useState(null);
  const [refunding, setRefunding] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    adminApi.getPayments({ page, search: search || undefined, status: status || undefined })
      .then(r => setData(r.data))
      .catch(() => setError("Failed to load payments."))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const refund = (id) => {
    if (refunding) return;
    setRefunding(id);
    adminApi.refundPayment(id)
      .then(() => { toast.success("Refund issued (minus fee)"); load(); })
      .catch(err => toast.error(err?.response?.data?.detail || "Refund failed"))
      .finally(() => setRefunding(null));
  };

  const s = data?.summary ?? {};

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-white font-bold text-2xl tracking-tight">Payments</h1>
        <p className="text-slate-500 text-sm mt-0.5">{data?.count ?? "—"} total payments · escrow ledger</p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="In escrow (held)" value={s.held ?? "0"}     accent="text-blue-400" />
        <SummaryCard label="Released"          value={s.released ?? "0"} accent="text-green-400" />
        <SummaryCard label="Refunded"          value={s.refunded ?? "0"} accent="text-purple-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search member email or trip…"
            className="w-full bg-[#0d1f33] border border-white/6 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FF6B35]/50 transition-colors" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(st => (
            <button key={st} onClick={() => { setStatus(st); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize
                ${status === st ? "bg-[#FF6B35] text-white" : "bg-[#0d1f33] border border-white/6 text-slate-400 hover:text-white hover:border-white/10"}`}>
              {st || "All"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm">
          <AlertTriangle size={16} className="shrink-0" /> {error}
          <button onClick={load} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      <div className="bg-[#0d1f33] rounded-2xl border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Member</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden sm:table-cell">Trip</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Amount</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5">Status</th>
                <th className="text-left text-slate-500 font-semibold uppercase tracking-wider px-5 py-3.5 hidden lg:table-cell">Ref</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5"><Skeleton className="h-3 w-32" /></td>
                    <td className="px-5 py-3.5 hidden sm:table-cell"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-3 w-14" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-5 py-3.5 hidden lg:table-cell"><Skeleton className="h-3 w-16" /></td>
                    <td className="px-5 py-3.5"><Skeleton className="h-6 w-14 rounded-lg" /></td>
                  </tr>
                ))
              ) : data?.results?.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-16">No payments match your filters.</td></tr>
              ) : data?.results?.map(p => (
                <tr key={p.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center shrink-0">
                        <Wallet size={13} className="text-[#FF6B35]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-200 font-medium truncate group-hover:text-white transition-colors">{p.user?.username || "—"}</p>
                        <p className="text-slate-500 truncate">{p.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell truncate max-w-44">{p.trip?.title}</td>
                  <td className="px-5 py-3.5 text-slate-200 font-semibold">GH₵{p.amount}</td>
                  <td className="px-5 py-3.5"><StatusPill value={p.status} /></td>
                  <td className="px-5 py-3.5 text-slate-500 font-mono hidden lg:table-cell">{p.reference_masked || "—"}</td>
                  <td className="px-5 py-3.5 text-right">
                    {p.status === "held" ? (
                      <button onClick={() => refund(p.id)} disabled={refunding === p.id}
                        className="px-3 py-1.5 rounded-lg text-amber-400/90 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors text-xs inline-flex items-center gap-1.5 disabled:opacity-50">
                        <RotateCcw size={12} /> {refunding === p.id ? "…" : "Refund"}
                      </button>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} total={data?.count ?? 0} perPage={20} onChange={setPage} />
      </div>
    </div>
  );
}
