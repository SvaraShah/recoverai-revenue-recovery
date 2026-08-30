import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import OverviewPage from "@/pages/Overview";
import TransactionsPage from "@/pages/Transactions";
import RecoveryPage from "@/pages/Recovery";
import InsightsPage from "@/pages/Insights";
import CampaignsPage from "@/pages/Campaigns";
import AnalyticsPage from "@/pages/Analytics";
import SettingsPage from "@/pages/Settings";
import AuditLogPage from "@/pages/AuditLog";

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
