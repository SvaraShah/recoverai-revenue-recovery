import { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { transactionsApi, recoveryApi } from "@/lib/api";
import type { PaginatedResponse, Transaction, RecoveryOpportunity } from "@/types";
import AIAnalysisModal from "@/components/AIAnalysisModal";

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<RecoveryOpportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: response, loading, refetch } = useFetch<PaginatedResponse<Transaction>>(
    () => {
      const params: Record<string, string> = { page: String(page), limit: "15" };
      if (statusFilter && statusFilter.toUpperCase() !== "ALL") {
        params.status = statusFilter;
      }
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      return transactionsApi.getAll(params);
    },
    [page, statusFilter, searchQuery]
  );

  const handleAnalyze = async (transactionId: string) => {
    setAnalyzingId(transactionId);
    setErrorMsg(null);
    try {
      const opportunity = await transactionsApi.analyze(transactionId);
      setSelectedOpportunity(opportunity);
      setModalOpen(true);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze transaction with AI.");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleViewAnalysis = async (opportunityId: string) => {
    try {
      const opp = await recoveryApi.getById(opportunityId);
      setSelectedOpportunity(opp);
      setModalOpen(true);
    } catch {
      // handle error
    }
  };

  const filterTabs = [
    { id: "all", label: "All Transactions" },
    { id: "FAILED", label: "Failed" },
    { id: "DECLINED", label: "Declined" },
    { id: "ABANDONED", label: "Abandoned" },
    { id: "SUCCESS", label: "Successful" },
    { id: "PENDING", label: "Pending" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payment Operations</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Monitor, analyze, and recover failed payment transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 font-mono">
            {response?.total || 0} total records
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-red-800 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setPage(1); }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-200/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by customer, ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full h-8.5 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* HERO TRANSACTION TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="py-3 px-4">Transaction</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Failure Reason</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Date</th>
                <th className="py-3 px-4 text-right">AI Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="py-3.5 px-4"><div className="h-4 bg-slate-100 rounded" /></td>
                  </tr>
                ))
              ) : response?.data && response.data.length > 0 ? (
                response.data.map((tx) => {
                  const isFailed = ["FAILED", "DECLINED", "ABANDONED"].includes(tx.status);
                  const hasOpportunity = !!tx.recoveryOpportunity;
                  const isAnalyzing = analyzingId === tx.id || analyzingId === tx.externalId;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700 font-semibold">
                        {tx.externalId || tx.id.slice(0, 14)}
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{tx.customer?.name || "N/A"}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate max-w-[140px]">{tx.customer?.email || ""}</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{tx.paymentMethod.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{tx.gateway}</span>
                      </td>

                      <td className="py-3 px-4">
                        {tx.failureReason ? (
                          <span className="inline-block max-w-[160px] truncate text-[11px] font-medium text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                            {tx.failureReason.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {tx.recoveryOpportunity ? (
                          <span className={cn(
                            "inline-block font-mono font-bold text-[11px] px-2 py-0.5 rounded",
                            tx.recoveryOpportunity.recoveryScore >= 70 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            tx.recoveryOpportunity.recoveryScore >= 40 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            "bg-red-50 text-red-700 border border-red-200"
                          )}>
                            {tx.recoveryOpportunity.recoveryScore}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums text-sm">
                        {formatCurrency(tx.amount)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                          getStatusColor(tx.status)
                        )}>
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-[11px] text-slate-400 font-mono">
                        {formatDate(tx.createdAt).split(",")[0]}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {hasOpportunity ? (
                          <button
                            onClick={() => handleViewAnalysis(tx.recoveryOpportunity!.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md hover:bg-indigo-100 transition-colors shadow-2xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>AI Analysis</span>
                          </button>
                        ) : isFailed ? (
                          <button
                            onClick={() => handleAnalyze(tx.externalId || tx.id)}
                            disabled={isAnalyzing}
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 border border-indigo-700 px-3 py-1 rounded-md hover:bg-indigo-700 transition-all shadow-2xs disabled:opacity-50"
                            )}
                          >
                            {isAnalyzing ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>AI ANALYZING...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-indigo-200" />
                                <span>✦ Analyze with AI</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No transactions match current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {response && response.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
            <span className="text-slate-500 font-medium">
              Page <strong>{response.page}</strong> of <strong>{response.totalPages}</strong> ({response.total} total)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(response.totalPages, p + 1))}
                disabled={page === response.totalPages}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AIAnalysisModal
        opportunity={selectedOpportunity}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
