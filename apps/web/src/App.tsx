import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Shell from "./components/Shell";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import JobIntake from "./pages/JobIntake";
import Plugins from "./pages/Plugins";
import Runs from "./pages/Runs";
import Candidates from "./pages/Candidates";
import CandidateProfile from "./pages/CandidateProfile";
import Slate from "./pages/Slate";
import Outreach from "./pages/Outreach";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Automation from "./pages/Automation";
import Agents from "./pages/Agents";
import Availability from "./pages/Availability";
import AdminPortal from "./pages/AdminPortal";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token, ready, user } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="min-h-screen grid place-items-center text-teal-300">Loading…</div>;
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function RequireAdmin({children}:{children:JSX.Element}) {
  const {token,ready,user}=useAuth();
  if(!ready) return <div className="min-h-screen grid place-items-center">Loading...</div>;
  if(!token) return <Navigate to="/login" replace />;
  if(user?.role!=="admin") return <Navigate to="/app" replace />;
  return children;
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/availability/:token" element={<Availability />} />
      <Route path="/admin" element={<RequireAdmin><AdminPortal /></RequireAdmin>} />
      <Route element={<RequireAuth><Shell /></RequireAuth>}>
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/jobs" element={<Jobs />} />
        <Route path="/app/jobs/new" element={<JobIntake />} />
        <Route path="/app/jobs/:id/slate" element={<Slate />} />
        <Route path="/app/plugins" element={<Plugins />} />
        <Route path="/app/runs" element={<Runs />} />
        <Route path="/app/automation" element={<Automation />} />
        <Route path="/app/agents" element={<Agents />} />
        <Route path="/app/candidates" element={<Candidates />} />
        <Route path="/app/candidates/:id" element={<CandidateProfile />} />
        <Route path="/app/outreach" element={<Outreach />} />
        <Route path="/app/analytics" element={<Analytics />} />
        <Route path="/app/billing" element={<Billing />} />
        <Route path="/app/settings" element={<Settings />} />
        <Route path="/app/privacy" element={<Privacy />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
