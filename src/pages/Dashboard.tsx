import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { 
  Users, 
  FileText,
  DollarSign, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Shield,
  LayoutGrid,
  Folder,
  Landmark
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

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <motion.div 
    variants={item}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100 flex flex-col"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-2xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex items-center text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-bold">
        <TrendingUp className="w-3 h-3 mr-1" />
        +{trend}%
      </div>
    </div>
    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
    <h3 className="text-2xl font-display font-extrabold text-slate-900">{value}</h3>
  </motion.div>
);

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
    paymentsCount: 0
  });

  const [capitalFlowView, setCapitalFlowView] = useState<"chart" | "list">("chart");
  const [rawInvestors, setRawInvestors] = useState<any[]>([]);

  const [chartData, setChartData] = useState<any[]>([
    { name: "Mon", value: 340000 },
    { name: "Tue", value: 300000 },
    { name: "Wed", value: 450000 },
    { name: "Thu", value: 390000 },
    { name: "Fri", value: 520000 },
    { name: "Sat", value: 480000 },
    { name: "Sun", value: 650000 },
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`, {
        headers: authHeaders()
      });
      const data = await response.json();

      let paymentsCount = 0;
      let documentsCount = data.documents !== undefined ? data.documents : (data.documentCount ?? 0);
      let totalRoiVal = data.totalRoi ?? 0;

      const payResponse = await fetch(`${API_BASE_URL}/api/payments`, {
        headers: authHeaders()
      });
      if (payResponse.ok) {
        const payData = await payResponse.json();
        if (Array.isArray(payData)) {
          paymentsCount = payData.length;
        }
      }

      const roiResponse = await fetch(`${API_BASE_URL}/api/roi`, {
        headers: authHeaders()
      });
      if (roiResponse.ok) {
        const roiData = await roiResponse.json();
        if (Array.isArray(roiData)) {
          totalRoiVal = roiData.reduce((sum: number, r: any) => sum + (Number(r.monthlyPayment) || 0), 0);
        }
      }

      const docResponse = await fetch(`${API_BASE_URL}/api/documents`, {
        headers: authHeaders()
      });
      if (docResponse.ok) {
        const docData = await docResponse.json();
        if (Array.isArray(docData)) {
          documentsCount = docData.length;
        }
      }

      setStats({
        users: data.users !== undefined ? data.users : (data.userCount ?? 0),
        investors: data.investors !== undefined ? data.investors : (data.investorCount ?? 0),
        investment: data.investment !== undefined ? data.investment : (data.totalInvestment ?? 0),
        documents: documentsCount,
        projects: data.projects !== undefined ? data.projects : (data.projectCount ?? 0),
        totalRoi: totalRoiVal,
        paymentsCount
      });

      // Fetch real investments from API
      const invResponse = await fetch(`${API_BASE_URL}/api/investors`, {
        headers: authHeaders()
      });
      if (invResponse.ok) {
        const invData = await invResponse.json();
        if (Array.isArray(invData)) {
          setRawInvestors(invData);
          if (invData.length > 0) {
            // Sort chronologically by date_of_onboarding
            const sortedInvestors = [...invData].sort((a, b) => {
              const dateA = a.date_of_onboarding ? new Date(a.date_of_onboarding) : new Date(0);
              const dateB = b.date_of_onboarding ? new Date(b.date_of_onboarding) : new Date(0);
              return dateA.getTime() - dateB.getTime();
            });
            
            const chartPoints = sortedInvestors.map(inv => {
              let displayName = inv.name;
              if (inv.date_of_onboarding) {
                const date = new Date(inv.date_of_onboarding);
                if (!isNaN(date.getTime())) {
                  const day = date.getDate();
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  displayName = `${day} ${months[date.getMonth()]}`;
                }
              }
              return {
                name: displayName,
                value: Number(inv.amount) || 0
              };
            });
            setChartData(chartPoints);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
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
                  value={`$${stats.investment.toLocaleString()}`} 
                  icon={DollarSign} 
                  trend="4.2" 
                  color="bg-blue-50 text-blue-600" 
                />
                <StatCard 
                  title="My Payments" 
                  value={stats.paymentsCount.toString()} 
                  icon={Landmark} 
                  trend="10" 
                  color="bg-emerald-50 text-emerald-600" 
                />
                <StatCard 
                  title="My ROI" 
                  value={`$${stats.totalRoi.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={TrendingUp} 
                  trend="8.5" 
                  color="bg-violet-50 text-violet-600" 
                />
                <StatCard 
                  title="My Documents" 
                  value={stats.documents.toString()} 
                  icon={FileText} 
                  trend="0" 
                  color="bg-amber-50 text-amber-600" 
                />
              </>
            ) : (
              <>
                <StatCard 
                  title="Total Investment" 
                  value={`$${stats.investment.toLocaleString()}`} 
                  icon={DollarSign} 
                  trend="4.2" 
                  color="bg-blue-50 text-blue-600" 
                />
                <StatCard 
                  title="Ongoing Projects" 
                  value={stats.projects.toString()} 
                  icon={Folder} 
                  trend="12" 
                  color="bg-emerald-50 text-emerald-600" 
                />
                <StatCard 
                  title="Total ROI" 
                  value={`$${stats.totalRoi.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                  icon={TrendingUp} 
                  trend="8.5" 
                  color="bg-violet-50 text-violet-600" 
                />
                <StatCard 
                  title="Total Investors" 
                  value={stats.investors.toString()} 
                  icon={Users} 
                  trend="2.1" 
                  color="bg-amber-50 text-amber-600" 
                />
              </>
            )}
          </>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <motion.div variants={item} className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-display font-bold text-slate-900">Capital Flow</h3>
              <p className="text-sm text-slate-500">Weekly investment trends</p>
            </div>
             <div className="flex items-center gap-2">
              <div className="flex bg-slate-50 p-1 rounded-xl">
                <button 
                  onClick={() => setCapitalFlowView("chart")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    capitalFlowView === "chart" 
                      ? "text-blue-600 bg-white shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Chart
                </button>
                <button 
                  onClick={() => setCapitalFlowView("list")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    capitalFlowView === "list" 
                      ? "text-blue-600 bg-white shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  List
                </button>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            {capitalFlowView === "chart" ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    formatter={(v: any) => [`$${v.toLocaleString()}`, 'Investment']}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full overflow-y-auto pr-2 space-y-3 scrollbar-thin">
                {rawInvestors.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                    No investments found.
                  </div>
                ) : (
                  rawInvestors.map((inv, idx) => (
                    <div key={inv.id || idx} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl transition-all border border-slate-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-extrabold text-sm uppercase">
                          {inv.name ? inv.name.charAt(0) : "I"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">{inv.name}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Onboarded: {inv.date_of_onboarding || "N/A"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-slate-950">${(Number(inv.amount) || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{inv.type}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Info Card */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100">
            <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Module Management</h3>
            <div className="space-y-3">
              <Link to="/investors" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    {isReadOnly ? <Users className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
                  </div>
                  <span className="text-sm font-bold text-slate-700">{isReadOnly ? "View Registered Investors" : "Add New Investor"}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/documents" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors">
                    <FileText className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{isReadOnly ? "View Documents" : "Upload Documents"}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/projects" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <Folder className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{isReadOnly ? "View Active Projects" : "Manage Active Projects"}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
              </Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                      <Shield className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">System Controls</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-1" />
                </Link>
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
