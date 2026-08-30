import { useState } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Sparkles,
  Eye,
} from "lucide-react";
import { cn, formatCurrency, formatDate, getStatusColor, truncateId } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { transactionsApi } from "@/lib/api";
import type { PaginatedResponse, Transaction } from "@/types";

const statusTabs = [
  { value: "ALL", label: "All" },
  { value: "FAILED", label: "Failed" },
  { value: "DECLINED", label: "Declined" },
  { value: "ABANDONED", label: "Abandoned" },
  { value: "SUCCESS", label: "Success" },
  { value: "PENDING", label: "Pending" },
];

const methodIcons: Record<string, React.ElementType> = {
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  UPI: Smartphone,
  NET_BANKING: Building2,
  WALLET: Wallet,
  EMI: CreditCard,
};

export default function TransactionsPage() {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const { data, loading, refetch } = useFetch<PaginatedResponse<Transaction>>(
    () =>
      transactionsApi.getAll({
        status,
        search,
        page: String(page),
        limit: "15",
      }),
    [status, search, page]
  );

  const { data: detail } = useFetch<Transaction | null>(
    () => (detailId ? transactionsApi.getById(detailId) : Promise.resolve(null)),
    [detailId]
  );

  const handleAnalyze = async (txId: string) => {
    setAnalyzing(txId);
    try {
      await transactionsApi.analyze(txId);
      refetch();
    } catch {
      // handle error
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatus(tab.value); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                  status === tab.value
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, name, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 w-full sm:w-72 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-14 border-b border-slate-100 animate-pulse bg-slate-50/50" />
            ))}
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Failure Reason</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Recovery</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((tx) => {
                    const MethodIcon = methodIcons[tx.paymentMethod] || CreditCard;
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-600">
                            {truncateId(tx.externalId)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-800">{tx.customer?.name || "—"}</p>
                            <p className="text-xs text-slate-400">{tx.customer?.email || ""}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                            getStatusColor(tx.status)
                          )}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MethodIcon className="h-4 w-4 text-slate-400" />
                            <span className="text-xs text-slate-600">
                              {tx.paymentMethod.replace(/_/g, " ")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {tx.failureReason ? (
                            <span className="text-xs text-slate-600">
                              {tx.failureReason.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.recoveryOpportunity ? (
                            <div className="flex items-center justify-center gap-1">
                              <div className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                                tx.recoveryOpportunity.recoveryScore >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                tx.recoveryOpportunity.recoveryScore >= 40 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-red-50 text-red-700 border-red-200"
                              )}>
                                {tx.recoveryOpportunity.recoveryScore}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setDetailId(tx.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {tx.status !== "SUCCESS" && !tx.recoveryOpportunity && (
                              <button
                                onClick={() => handleAnalyze(tx.id)}
                                disabled={analyzing === tx.id}
                                className={cn(
                                  "p-1.5 rounded-md transition-colors",
                                  analyzing === tx.id
                                    ? "text-blue-400 animate-pulse-subtle"
                                    : "text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                                )}
                                title="AI Analyze"
                              >
                                <Sparkles className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-sm text-slate-500">
                Showing {(data.page - 1) * data.limit + 1}–
                {Math.min(data.page * data.limit, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                        page === pageNum
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                  disabled={page === data.totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Filter className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-sm">No transactions found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailId(null)}>
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Transaction Details</h3>
              <button onClick={() => setDetailId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Amount</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(detail.amount)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", getStatusColor(detail.status))}>
                    {detail.status}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Payment Method</p>
                  <p className="font-medium text-slate-700">{detail.paymentMethod.replace(/_/g, " ")}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Gateway</p>
                  <p className="font-medium text-slate-700">{detail.gateway}</p>
                </div>
              </div>
              {detail.failureReason && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs text-red-500 mb-1">Failure Reason</p>
                  <p className="font-medium text-red-700">{detail.failureReason.replace(/_/g, " ")}</p>
                  {detail.failureMessage && (
                    <p className="text-xs text-red-600 mt-1">{detail.failureMessage}</p>
                  )}
                </div>
              )}
              {detail.customer && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Customer</p>
                  <p className="font-medium text-slate-700">{detail.customer.name}</p>
                  <p className="text-xs text-slate-500">{detail.customer.email}</p>
                </div>
              )}
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400 mb-1">Transaction ID</p>
                <p className="font-mono text-xs text-slate-600 break-all">{detail.externalId}</p>
              </div>
            </div>
            {detail.status !== "SUCCESS" && !detail.recoveryOpportunity && (
              <button
                onClick={() => { handleAnalyze(detail.id); setDetailId(null); }}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Run AI Analysis
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
