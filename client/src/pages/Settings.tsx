import { useState, useEffect } from "react";
import { Save, RefreshCw, Shield, Bell, Cpu, Sliders, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { settingsApi } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";

interface Settings {
  businessName: string;
  currency: string;
  timezone: string;
  autoExecuteThreshold: number;
  maxRetryAttempts: number;
  cooldownPeriodHours: number;
  emailNotifications: boolean;
  webhookUrl: string;
  aiModelPreference: string;
  confidenceThreshold: number;
}

interface AIStatus {
  engine: string;
  model: string | null;
  available: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

  const { data: aiStatus } = useFetch<AIStatus>(
    () => fetch("/api/ai/status").then((res) => res.json()),
    []
  );

  useEffect(() => {
    settingsApi.get().then((data) => setSettings(data as unknown as Settings));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await settingsApi.update(settings as unknown as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof Settings, value: unknown) => {
    if (settings) setSettings({ ...settings, [key]: value });
  };

  if (!settings) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  const sections = [
    { id: "general", label: "General", icon: Sliders },
    { id: "recovery", label: "Recovery Rules", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "ai", label: "AI Configuration", icon: Cpu },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-5xl">
      {/* Section Nav */}
      <div className="md:w-56 shrink-0">
        <div className="sticky top-24 space-y-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                activeSection === s.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <s.icon className={cn("h-4 w-4", activeSection === s.id ? "text-violet-400" : "text-slate-400")} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">
        {/* General */}
        {activeSection === "general" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="h-4 w-4 text-violet-600" />
              General Platform Settings
            </h3>
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Business Name</label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Default Currency</label>
                  <input
                    type="text"
                    value={settings.currency}
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Timezone</label>
                  <input
                    type="text"
                    value={settings.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recovery Rules */}
        {activeSection === "recovery" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="h-4 w-4 text-violet-600" />
              Bounded Recovery Rules & Guardrail Limits
            </h3>
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Max Retry Attempts Limit</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxRetryAttempts}
                  onChange={(e) => update("maxRetryAttempts", parseInt(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">Rule 1: Maximum number of outreach retries before auto-stopping</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cooldown Period (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.cooldownPeriodHours}
                  onChange={(e) => update("cooldownPeriodHours", parseInt(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">Rule 5: Minimum hours required between customer outreach retries</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">AI Confidence Threshold</label>
                  <span className="font-bold text-violet-600">{Math.round(settings.confidenceThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(settings.confidenceThreshold * 100)}
                  onChange={(e) => update("confidenceThreshold", parseFloat(e.target.value) / 100)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">Rule 4: Require manual approval if AI confidence falls below this threshold</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeSection === "notifications" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Bell className="h-4 w-4 text-violet-600" />
              Notification Preferences
            </h3>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Email Notifications</p>
                  <p className="text-slate-400 text-[11px]">Receive email alerts for key recovery events</p>
                </div>
                <button
                  onClick={() => update("emailNotifications", !settings.emailNotifications)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    settings.emailNotifications ? "bg-violet-600" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    settings.emailNotifications ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Configuration */}
        {activeSection === "ai" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Cpu className="h-4 w-4 text-violet-600" />
              AI Agent Status & Provider Configuration
            </h3>

            {/* AI Engine Status Card */}
            <div className={cn(
              "rounded-2xl border p-5 space-y-3",
              aiStatus?.available
                ? "bg-gradient-to-r from-violet-50/80 via-indigo-50/50 to-blue-50/80 border-violet-200"
                : "bg-amber-50/60 border-amber-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600 fill-violet-600" />
                  <h4 className="text-sm font-bold text-slate-900">Active AI Provider</h4>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs",
                  aiStatus?.available
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {aiStatus?.available ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Connected & Ready
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                      Mock Engine Active
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                <div className="rounded-xl bg-white/90 border border-slate-200 p-3 shadow-2xs">
                  <span className="text-slate-400 font-medium block text-[11px] uppercase tracking-wider">Engine</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block uppercase">
                    {aiStatus?.engine || "Groq"}
                  </span>
                </div>

                <div className="rounded-xl bg-white/90 border border-slate-200 p-3 shadow-2xs">
                  <span className="text-slate-400 font-medium block text-[11px] uppercase tracking-wider">Model</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {aiStatus?.model || "llama-3.3-70b-versatile"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium pt-1">
                {aiStatus?.available
                  ? "Groq Llama-3.3-70B model handles root-cause diagnosis, confidence scoring, and recovery intervention recommendations with server-side validation."
                  : "Using deterministic fallback rules. Set GROQ_API_KEY in server environment to enable Groq LLM."}
              </p>
            </div>

            <div className="text-xs text-slate-400 italic">
              Note: API credentials are stored securely server-side and never exposed to the client.
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-violet-700 transition-all disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Settings updated successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
