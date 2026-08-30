import { useState, useEffect } from "react";
import { Save, RefreshCw, Shield, Bell, Cpu, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { settingsApi } from "@/lib/api";

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

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
          <div key={i} className="h-40 rounded-xl border border-slate-200 bg-white animate-pulse" />
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
    <div className="flex gap-6 max-w-5xl">
      {/* Section Nav */}
      <div className="hidden md:block w-48 shrink-0">
        <div className="sticky top-24 space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeSection === s.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <s.icon className={cn("h-4 w-4", activeSection === s.id ? "text-blue-500" : "text-slate-400")} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-5">
        {/* General */}
        {(activeSection === "general") && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600" />
              General Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Business Name</label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => update("businessName", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => update("currency", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-white"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recovery Rules */}
        {(activeSection === "recovery") && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Recovery Rules
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Auto-Execute Threshold</label>
                  <span className="text-sm font-semibold text-blue-600">{settings.autoExecuteThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.autoExecuteThreshold}
                  onChange={(e) => update("autoExecuteThreshold", parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-slate-400 mt-1">Recovery actions above this score will execute automatically</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Max Retry Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxRetryAttempts}
                    onChange={(e) => update("maxRetryAttempts", parseInt(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Cooldown Period (hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={settings.cooldownPeriodHours}
                    onChange={(e) => update("cooldownPeriodHours", parseInt(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">AI Confidence Threshold</label>
                  <span className="text-sm font-semibold text-blue-600">{Math.round(settings.confidenceThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(settings.confidenceThreshold * 100)}
                  onChange={(e) => update("confidenceThreshold", parseFloat(e.target.value) / 100)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-slate-400 mt-1">Prevent automated recovery actions if AI confidence falls below this threshold</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {(activeSection === "notifications") && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              Notification Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Email Notifications</p>
                  <p className="text-xs text-slate-400">Receive email alerts for recovery events</p>
                </div>
                <button
                  onClick={() => update("emailNotifications", !settings.emailNotifications)}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    settings.emailNotifications ? "bg-blue-600" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    settings.emailNotifications ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Webhook URL</label>
                <input
                  type="url"
                  value={settings.webhookUrl}
                  onChange={(e) => update("webhookUrl", e.target.value)}
                  placeholder="https://your-webhook-endpoint.com/hook"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-xs text-slate-400 mt-1">Receive webhook notifications for all recovery events</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Configuration */}
        {(activeSection === "ai") && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600" />
              AI Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">AI Model</label>
                <select
                  value={settings.aiModelPreference}
                  onChange={(e) => update("aiModelPreference", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="mock-deterministic">Mock Deterministic Engine</option>
                  <option value="openai-gpt4" disabled>OpenAI GPT-4 (Coming Soon)</option>
                  <option value="gemini-pro" disabled>Google Gemini Pro (Coming Soon)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Current: Mock engine with deterministic scoring. LLM integration ready.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Confidence Threshold</label>
                  <span className="text-sm font-semibold text-blue-600">{(settings.confidenceThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.confidenceThreshold * 100}
                  onChange={(e) => update("confidenceThreshold", parseInt(e.target.value) / 100)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-slate-400 mt-1">Only act on AI recommendations above this confidence level</p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors",
              saved
                ? "bg-emerald-500 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
