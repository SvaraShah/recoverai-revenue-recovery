import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";

const OverviewPage = lazy(() => import("@/pages/Overview"));
const TransactionsPage = lazy(() => import("@/pages/Transactions"));
const RecoveryPage = lazy(() => import("@/pages/Recovery"));
const InsightsPage = lazy(() => import("@/pages/Insights"));
const CampaignsPage = lazy(() => import("@/pages/Campaigns"));
const AnalyticsPage = lazy(() => import("@/pages/Analytics"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const AuditLogPage = lazy(() => import("@/pages/AuditLog"));

function PageLoader() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/recovery" element={<RecoveryPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
