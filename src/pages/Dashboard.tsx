import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { 
  Users, 
  FileText,
  DollarSign,
  PoundSterling, 
  TrendingUp, 
  Plus,
  ArrowRight,
  ArrowUpRight,
  Shield,
  LayoutGrid,
  Folder,
  Landmark,
  CreditCard,
  Bell,
  Download
} from "lucide-react";
import { motion } from "motion/react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Link } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../config/api";
import { cachedFetch } from "../utils/apiCache";
import { cn } from "../lib/utils";

const data = [
  { name: "Mon", value: 340000 },
  { name: "Tue", value: 300000 },
  { name: "Wed", value: 450000 },
  { name: "Thu", value: 390000 },
  { name: "Fri", value: 520000 },
  { name: "Sat", value: 480000 },
  { name: "Sun", value: 650000 },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const StatCard = ({ title, value, icon: Icon, color, link }: any) => {
  const CardContent = (
    <motion.div 
      variants={item}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100 flex flex-col justify-between group transition-all duration-300 relative overflow-hidden cursor-pointer hover:border-blue-200 hover:shadow-md h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color} transition-transform duration-300 group-hover:scale-105`}>
          <Icon className="w-6 h-6" />
        </div>
        {link && (
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 group-hover:bg-blue-600 group-hover:border-blue-600 flex items-center justify-center text-slate-400 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 shadow-sm">
            <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
          </div>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-display font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{value}</h3>
      </div>
    </motion.div>
  );

  if (link) {
    return <Link to={link} className="block h-full">{CardContent}</Link>;
  }

  return CardContent;
};

const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100 flex flex-col animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100" />
      <div className="w-12 h-6 bg-slate-100 rounded-lg" />
    </div>
    <div className="w-24 h-3 bg-slate-100 rounded mb-2" />
    <div className="w-32 h-8 bg-slate-100 rounded" />
  </div>
);

export const Dashboard = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isReadOnly = user?.role === "client" || user?.role === "investor";
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    investors: 0,
    investment: 0,
    documents: 0,
    projects: 0,
    totalRoi: 0,
    avgPayout: 0
  });

  const [rawInvestors, setRawInvestors] = useState<any[]>([]);
  const [myDocuments, setMyDocuments] = useState<any[]>([]);

  const [chartData, setChartData] = useState<any[]>([
    { name: "Month 1", value: 50000, payout: 2500, avgPayout: 2500 },
    { name: "Month 2", value: 100000, payout: 5000, avgPayout: 2500 },
    { name: "Month 3", value: 150000, payout: 7500, avgPayout: 2500 },
    { name: "Current", value: 200000, payout: 10000, avgPayout: 2500 },
  ]);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const isInvestorUser = user?.role === "investor" || user?.role === "client";

      let allInvestors: any[] = [];
      let allPayments: any[] = [];
      let allDocuments: any[] = [];
      let allRoiContracts: any[] = [];
      let allProjects: any[] = [];

      // Single aggregated API endpoint call with SWR caching for 0ms page loads
      const res = await cachedFetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: authHeaders()
      }).catch(() => null);

      if (res && res.ok) {
        const statsData = await res.json();
        allInvestors = statsData.investors || [];
        allPayments = statsData.payments || [];
        allDocuments = statsData.documents || [];
        allRoiContracts = statsData.roiContracts || [];
        allProjects = statsData.projects || [];
      } else {
        // Fallback to parallel requests if endpoint unavailable
        const [invRes, payRes, docRes, roiRes, projRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/investors`, { headers: authHeaders() }).catch(() => null),
          fetch(`${API_BASE_URL}/api/admin/payments`, { headers: authHeaders() }).catch(() => null),
          fetch(`${API_BASE_URL}/api/admin/documents`, { headers: authHeaders() }).catch(() => null),
          fetch(`${API_BASE_URL}/api/roi`, { headers: authHeaders() }).catch(() => null),
          fetch(`${API_BASE_URL}/api/projects`, { headers: authHeaders() }).catch(() => null)
        ]);

        if (invRes && invRes.ok) allInvestors = await invRes.json();
        if (payRes && payRes.ok) allPayments = await payRes.json();
        if (docRes && docRes.ok) allDocuments = await docRes.json();
        if (roiRes && roiRes.ok) allRoiContracts = await roiRes.json();
        if (projRes && projRes.ok) allProjects = await projRes.json();
      }

      setMyDocuments(Array.isArray(allDocuments) ? allDocuments : []);

      let investmentVal = 0;
      let payoutsTillDateVal = 0;
      let avgPayoutVal = 0;
      let investorsCountVal = 0;
      let documentsCountVal = 0;

      if (isInvestorUser) {
        // Investor Dashboard: FILTER BY CURRENT INVESTOR USER
        const myInvestor = allInvestors.find(i => 
          i.email?.toLowerCase() === user?.email?.toLowerCase() ||
          i.name?.toLowerCase() === user?.name?.toLowerCase()
        ) || allInvestors[0];

        const myInvestorId = myInvestor?.id;

        // 1. My Investment
        investmentVal = myInvestor ? Number(myInvestor.amount) || 0 : 0;

        // 2. My Payments / Payouts
        const myPayments = allPayments.filter(p => 
          (myInvestorId && p.investorId === myInvestorId) || 
          (myInvestor?.name && p.investorName === myInvestor.name)
        );

        // Send Acknowledge Payments (sent by admin)
        const sendAckPayments = myPayments.filter(p => p.isSent || p.isReceived || p.status === "Sent" || p.status === "Received");
        const sendAckAmount = sendAckPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const sendAckCount = sendAckPayments.length;

        // Completed payments (acknowledged by investor)
        const completedPayments = myPayments.filter(p => p.isReceived || p.status === "Received");
        payoutsTillDateVal = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Average Payouts Till Date: Send Acknowledge Amount / Send Acknowledge Count
        avgPayoutVal = sendAckCount > 0 ? sendAckAmount / sendAckCount : 0;

        // 3. My Documents
        documentsCountVal = Array.isArray(allDocuments) ? allDocuments.length : 0;

        // 4. Investor Chart Points (Investment, Payouts Done, Average Payout)
        let chartPoints: any[] = [];
        if (myPayments.length > 0) {
          chartPoints = myPayments.map((p, idx) => {
            let label = `Pay #${idx + 1}`;
            if (p.paymentDate) {
              const d = new Date(p.paymentDate);
              if (!isNaN(d.getTime())) {
                label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              }
            }
            const amt = Number(p.amount) || 0;
            const pDone = (p.isSent || p.isReceived) ? amt : 0;
            return {
              name: label,
              value: investmentVal,
              payout: pDone,
              avgPayout: Math.round(avgPayoutVal)
            };
          });
        } else {
          chartPoints = [
            { name: "Month 1", value: investmentVal, payout: Math.round(payoutsTillDateVal * 0.25), avgPayout: Math.round(avgPayoutVal) },
            { name: "Month 2", value: investmentVal, payout: Math.round(payoutsTillDateVal * 0.50), avgPayout: Math.round(avgPayoutVal) },
            { name: "Month 3", value: investmentVal, payout: Math.round(payoutsTillDateVal * 0.75), avgPayout: Math.round(avgPayoutVal) },
            { name: "Current", value: investmentVal, payout: Math.round(payoutsTillDateVal), avgPayout: Math.round(avgPayoutVal) },
          ];
        }
        setChartData(chartPoints);

      } else {
        // Admin / Manager Dashboard: SYSTEM-WIDE METRICS
        investmentVal = allInvestors.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        investorsCountVal = allInvestors.length;
        documentsCountVal = allDocuments.length;

        // Send Acknowledge Payments (sent by admin across all investors)
        const sendAckPayments = allPayments.filter(p => p.isSent || p.isReceived || p.status === "Sent" || p.status === "Received");
        const sendAckAmount = sendAckPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const sendAckCount = sendAckPayments.length;

        // Completed payments (acknowledged by investors)
        const completedPayments = allPayments.filter(p => p.isReceived || p.status === "Received");
        payoutsTillDateVal = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Average Payouts Till Date: Send Acknowledge Amount / Send Acknowledge Count
        avgPayoutVal = sendAckCount > 0 ? sendAckAmount / sendAckCount : 0;

        // Admin Chart Points (Investment, Payouts Done, Average Payout)
        if (allInvestors.length > 0) {
          const sortedInvestors = [...allInvestors].sort((a, b) => {
            const dateA = a.date_of_onboarding ? new Date(a.date_of_onboarding) : new Date(0);
            const dateB = b.date_of_onboarding ? new Date(b.date_of_onboarding) : new Date(0);
            return dateA.getTime() - dateB.getTime();
          });

          const chartPoints = sortedInvestors.map(inv => {
            let label = inv.name;
            if (inv.date_of_onboarding) {
              const d = new Date(inv.date_of_onboarding);
              if (!isNaN(d.getTime())) {
                label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              }
            }
            const invCap = Number(inv.amount) || 0;
            const invPayments = allPayments.filter(p => p.investorName === inv.name || p.investorId === inv.id);
            const invPaid = invPayments.filter(p => p.isSent || p.isReceived).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            return {
              name: label,
              value: invCap,
              payout: invPaid > 0 ? invPaid : Math.round(invCap * 0.05),
              avgPayout: Math.round(avgPayoutVal)
            };
          });
          setChartData(chartPoints);
        }
      }

      setStats({
        users: 0,
        investors: investorsCountVal,
        investment: investmentVal,
        documents: documentsCountVal,
        projects: allProjects.length,
        totalRoi: payoutsTillDateVal,
        avgPayout: avgPayoutVal
      });

      setRawInvestors(allInvestors);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div variants={item}>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            Welcome back, {user?.name || "User"}. Monitor key metrics, capital growth, and recent activities.
          </p>
        </motion.div>
      </div>

      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            {user?.role === "investor" ? (
              <>
                <StatCard 
                  title="My Investment" 
                  value={`£${stats.investment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={Landmark} 
                  trend="4.2" 
                  color="bg-blue-50 text-blue-600" 
                  link="/investors"
                />
                <StatCard 
                  title="Payouts Till Date" 
                  value={`£${stats.totalRoi.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={PoundSterling} 
                  trend="12" 
                  color="bg-emerald-50 text-emerald-600" 
                  link="/payments"
                />
                <StatCard 
                  title="Average Payouts Till Date" 
                  value={`£${stats.avgPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={PoundSterling} 
                  trend="8.5" 
                  color="bg-violet-50 text-violet-600" 
                  link="/payments"
                />
                <StatCard 
                  title="My Documents" 
                  value={stats.documents.toString()} 
                  icon={FileText} 
                  trend="2.1" 
                  color="bg-amber-50 text-amber-600" 
                  link="/documents"
                />
              </>
            ) : (
              <>
                <StatCard 
                  title="Total Investment" 
                  value={`£${stats.investment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={Landmark} 
                  trend="4.2" 
                  color="bg-blue-50 text-blue-600" 
                  link="/investors"
                />
                <StatCard 
                  title="Payouts Till Date" 
                  value={`£${stats.totalRoi.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={PoundSterling} 
                  trend="12" 
                  color="bg-emerald-50 text-emerald-600" 
                  link="/payments"
                />
                <StatCard 
                  title="Average Payouts Till Date" 
                  value={`£${stats.avgPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={PoundSterling} 
                  trend="8.5" 
                  color="bg-violet-50 text-violet-600" 
                  link="/payments"
                />
                <StatCard 
                  title="Total Investors" 
                  value={stats.investors.toString()} 
                  icon={Users} 
                  trend="2.1" 
                  color="bg-amber-50 text-amber-600" 
                  link="/investors"
                />
              </>
            )}
          </>
        )}
      </motion.div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Chart / Activity Section */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-display font-bold text-slate-900">Capital Growth & Payout Trends</h3>
                <p className="text-xs text-slate-500 mt-1">Real-time performance across active portfolio operations</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Portfolio
                </span>
              </div>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPayout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAvgPayout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v >= 1000 ? `${v/1000}k` : v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", color: "#fff", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)" }}
                    formatter={(val: any, name: any) => [`£${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" name="Capital Investment" />
                  <Area type="monotone" dataKey="payout" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPayout)" name="Payouts Done" />
                  <Area type="monotone" dataKey="avgPayout" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAvgPayout)" name="Average Payout" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {isReadOnly ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-display font-bold text-slate-900">My Documents</h3>
                </div>
                <Link to="/documents" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading documents...</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myDocuments.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No documents found</p>
                      <p className="text-xs text-slate-400 mt-1">Your investment agreements and reports will appear here.</p>
                    </div>
                  ) : (
                    myDocuments.slice(0, 5).map((doc: any, idx: number) => (
                      <div key={idx} className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[220px] sm:max-w-xs">{doc.title || "Document"}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {doc.type || "PDF"} • {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recent"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide",
                            doc.status === "Signed" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : doc.status === "Pending Signature"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          )}>
                            {doc.status || "Approved"}
                          </span>
                          <Link 
                            to="/documents"
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-slate-900">Recent Onboarding Activity</h3>
                <Link to="/investors" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-400">Loading activity...</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {rawInvestors.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4">No recent investor activity recorded.</p>
                  ) : (
                    rawInvestors.slice(0, 4).map((inv: any, idx: number) => (
                      <div key={idx} className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                            {inv.name ? inv.name.substring(0, 2).toUpperCase() : "IN"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{inv.name}</p>
                            <p className="text-xs text-slate-500">{inv.email} • {inv.date_of_onboarding || "Active"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-slate-950">£{(Number(inv.amount) || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{inv.type}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Right Info Card */}
        <div className="space-y-6">
          {/* Quick Actions / Module Management */}
          <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100">
            <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Module Management</h3>
            <div className="space-y-3">
              {user?.role === "investor" ? (
                <>
                  <Link to="/documents" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                        <FileText className="w-4 h-4 text-violet-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">Signed Agreements & Documents</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link to="/payments" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                        <Landmark className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">My Payment Ledger</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link to="/notifications" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <Bell className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">System Notifications</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/investors" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">Investor Onboarding & Directory</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link to="/documents" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                        <FileText className="w-4 h-4 text-violet-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">Digital Agreements & Vault</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link to="/projects" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                        <Folder className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">Operations & Project Tracking</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link to="/payments" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">Financial Payment Disbursements</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                  </Link>

                  {user?.role === 'admin' && (
                    <Link to="/admin" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-200 rounded-lg group-hover:bg-slate-300 transition-colors">
                          <Shield className="w-4 h-4 text-slate-700" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">System Governance & Access</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Quick Stats Grid */}
          <motion.div variants={item} className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-400">Active Access</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs text-slate-300 font-bold">Role Status</span>
                  <span className="text-xs font-extrabold bg-blue-500 text-white px-2.5 py-1 rounded-lg uppercase tracking-wide shadow-md shadow-blue-500/20">{user?.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-bold">Permissions</span>
                  <span className="text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wide">Verified</span>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
