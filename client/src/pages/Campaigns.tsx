import { useState } from "react";
import {
  Plus,
  Play,
  Pause,
  CheckCircle2,
  RefreshCw,
  Mail,
  MessageSquare,
  Link2,
  Zap,
  Target,
  Calendar,
  TrendingUp,
  X,
} from "lucide-react";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { campaignsApi } from "@/lib/api";
import type { RecoveryCampaign, CampaignType, CampaignStatus } from "@/types";

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  SMART_RETRY: { icon: RefreshCw, color: "bg-blue-50 text-blue-600 border-blue-200" },
  EMAIL: { icon: Mail, color: "bg-violet-50 text-violet-600 border-violet-200" },
  SMS: { icon: MessageSquare, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  PAYMENT_LINK: { icon: Link2, color: "bg-amber-50 text-amber-600 border-amber-200" },
  MIXED: { icon: Zap, color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
};

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", type: "SMART_RETRY" as CampaignType, description: "" });

  const { data: campaigns, loading, refetch } = useFetch<(RecoveryCampaign & { _count?: { opportunities: number } })[]>(
    () => campaignsApi.getAll(),
    []
  );

  const handleCreate = async () => {
    if (!newCampaign.name) return;
    try {
      await campaignsApi.create(newCampaign);
      setShowCreate(false);
      setNewCampaign({ name: "", type: "SMART_RETRY", description: "" });
      refetch();
    } catch {
      // handle error
    }
  };

  const handleStatusUpdate = async (id: string, status: CampaignStatus) => {
    try {
      await campaignsApi.update(id, { status });
      refetch();
    } catch {
      // handle error
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{campaigns?.length || 0} campaigns total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Campaign Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-60 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const typeInfo = typeIcons[campaign.type] || typeIcons.MIXED;
            const TypeIcon = typeInfo.icon;
            const progressPct = campaign.targetCount > 0
              ? Math.round((campaign.recoveredCount / campaign.targetCount) * 100)
              : 0;

            return (
              <div key={campaign.id} className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                {/* Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", typeInfo.color)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{campaign.name}</h3>
                        <p className="text-xs text-slate-400">{campaign.type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider",
                      getStatusColor(campaign.status)
                    )}>
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{campaign.description}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="px-5 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Targets</p>
                    <p className="text-sm font-bold text-slate-900">{campaign.targetCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Recovered</p>
                    <p className="text-sm font-bold text-emerald-600">{campaign.recoveredCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Amount</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(campaign.recoveredAmount)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400">Recovery Progress</span>
                    <span className="text-[11px] font-semibold text-slate-600">{progressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-5 pt-3">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {campaign.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(campaign.startDate)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {formatCurrency(campaign.totalAtRisk)} at risk
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {campaign.status === "DRAFT" && (
                      <button
                        onClick={() => handleStatusUpdate(campaign.id, "ACTIVE")}
                        className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-50 transition-colors"
                        title="Activate"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {campaign.status === "ACTIVE" && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(campaign.id, "PAUSED")}
                          className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 transition-colors"
                          title="Pause"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(campaign.id, "COMPLETED")}
                          className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-50 transition-colors"
                          title="Complete"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {campaign.status === "PAUSED" && (
                      <button
                        onClick={() => handleStatusUpdate(campaign.id, "ACTIVE")}
                        className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors"
                        title="Resume"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200">
          <Target className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm">No campaigns yet</p>
          <p className="text-xs mt-1">Create your first recovery campaign</p>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">New Campaign</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g., September Recovery Push"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Campaign Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["SMART_RETRY", "EMAIL", "SMS", "PAYMENT_LINK", "MIXED"] as CampaignType[]).map((type) => {
                    const info = typeIcons[type] || typeIcons.MIXED;
                    const Icon = info.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setNewCampaign({ ...newCampaign, type })}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                          newCampaign.type === type
                            ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Icon className="h-4 w-4 text-slate-600" />
                        {type.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Brief description of the campaign goal..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newCampaign.name}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
