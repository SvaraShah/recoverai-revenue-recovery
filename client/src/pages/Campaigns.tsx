import { useState } from "react";
import {
  Plus,
  Play,
  Pause,
  RefreshCw,
  Mail,
  MessageSquare,
  Link2,
  Zap,
  Megaphone,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useFetch } from "@/hooks/useFetch";
import { campaignsApi } from "@/lib/api";
import type { RecoveryCampaign, CampaignType, CampaignStatus } from "@/types";
import ErrorState from "@/components/ErrorState";

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  SMART_RETRY: { icon: RefreshCw, color: "bg-blue-50 text-blue-700 border-blue-200" },
  EMAIL: { icon: Mail, color: "bg-violet-50 text-violet-700 border-violet-200" },
  SMS: { icon: MessageSquare, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PAYMENT_LINK: { icon: Link2, color: "bg-amber-50 text-amber-700 border-amber-200" },
  MIXED: { icon: Zap, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

export default function CampaignsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", type: "SMART_RETRY" as CampaignType, description: "" });

  const {
    data: campaigns,
    loading,
    error,
    refetch,
  } = useFetch<(RecoveryCampaign & { _count?: { opportunities: number } })[]>(
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

  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

  if (error && safeCampaigns.length === 0) {
    return (
      <ErrorState
        title="Failed to load campaigns"
        message={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Recovery Campaign Workspace</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Grouped outreach strategies across Smart Retry, Payment Links, WhatsApp, and Email vectors
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Campaign Cards Grid */}
      {loading && safeCampaigns.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-60 rounded-2xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : safeCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {safeCampaigns.map((campaign) => {
            const typeKey = campaign.type || "MIXED";
            const typeInfo = typeIcons[typeKey] || typeIcons.MIXED;
            const TypeIcon = typeInfo.icon;
            const target = Number(campaign.targetCount) || 0;
            const recovered = Number(campaign.recoveredCount) || 0;
            const progressPct = target > 0 ? Math.round((recovered / target) * 100) : 0;

            return (
              <div key={campaign.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-sm transition-all space-y-4">
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border shrink-0", typeInfo.color)}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{campaign.name || "Campaign"}</h3>
                      <p className="text-[11px] text-slate-400 font-medium">Type: {typeKey.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    campaign.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    campaign.status === "PAUSED" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-slate-100 text-slate-600 border-slate-200"
                  )}>
                    {campaign.status || "DRAFT"}
                  </span>
                </div>

                {campaign.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{campaign.description}</p>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Recovery Conversion Rate</span>
                    <span className="text-violet-700 font-bold">{progressPct}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                {/* Performance Metrics Row */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Targets</p>
                    <p className="font-bold text-slate-900 mt-0.5">{target}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recovered</p>
                    <p className="font-bold text-emerald-700 mt-0.5">{recovered}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Revenue</p>
                    <p className="font-bold text-slate-900 mt-0.5">{formatCurrency(Number(campaign.recoveredAmount) || 0)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {campaign.createdAt ? `Created ${formatDate(campaign.createdAt)}` : "Recently Created"}
                  </span>
                  {campaign.status === "ACTIVE" ? (
                    <button
                      onClick={() => handleStatusUpdate(campaign.id, "PAUSED")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      <Pause className="h-3.5 w-3.5" /> Pause Campaign
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusUpdate(campaign.id, "ACTIVE")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5" /> Activate Campaign
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Megaphone className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">No campaigns configured</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Recovery Campaign</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 UPI Retry Blitz"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Outreach Type</label>
                <select
                  value={newCampaign.type}
                  onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value as CampaignType })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium bg-white"
                >
                  <option value="SMART_RETRY">Smart Retry</option>
                  <option value="PAYMENT_LINK">Payment Link</option>
                  <option value="EMAIL">Email Outreach</option>
                  <option value="SMS">SMS Outreach</option>
                  <option value="MIXED">Mixed Strategy</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  placeholder="Targeting failed high-value payment attempts..."
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-violet-500 h-20"
                />
              </div>
              <button
                onClick={handleCreate}
                className="w-full rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-md mt-2"
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
