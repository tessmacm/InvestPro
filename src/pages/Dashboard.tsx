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
  Download,
  BarChart3,
  CheckCircle2
} from "lucide-react";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { Link } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../config/api";
import { cachedFetch } from "../utils/apiCache";
import { cn } from "../lib/utils";
import { StatCardSkeleton } from "../components/TableSkeleton";
import { formatUKDate, formatUKDateDisplay } from "../utils/formatters";

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
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-display font-extrabold text-slate-900 mt-1">{value}</h3>
      </div>
    </motion.div>
  );

  return link ? <Link to={link} className="block h-full">{CardContent}</Link> : CardContent;
};

// Helper functions to safely get properties regardless of PascalCase vs camelCase
const getInvestorAmount = (i: any) => Number(i.amount ?? i.CapitalAmount ?? i.capitalAmount ?? 0);
const getInvestorName = (i: any) => i.name ?? i.Name ?? i.LegalBusinessName ?? i.legalBusinessName ?? "Investor";
const getInvestorEmail = (i: any) => i.email ?? i.Email ?? "";
const getInvestorId = (i: any) => i.id ?? i.Id ?? i.InvestorId ?? i.investorId;
const getInvestorDate = (i: any) => i.date_of_onboarding ?? i.DateOfBoarding ?? i.dateOfBoarding ?? i.CreatedAt ?? i.createdAt;

const getPaymentAmount = (p: any) => Number(p.amount ?? p.Amount ?? 0);
const getPaymentIsSent = (p: any) => Boolean((p.isSent ?? p.IsSent) || p.status === "Sent" || p.Status === "Sent");
const getPaymentIsReceived = (p: any) => Boolean((p.isReceived ?? p.IsReceived) || p.status === "Received" || p.Status === "Received");
const getPaymentDate = (p: any) => p.paymentDate ?? p.PaymentDate ?? p.dueDate ?? p.DueDate;

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
    avgPayout: 0,
    totalPaymentsAmt: 0,
    completedPaymentsAmt: 0
  });

  const [rawInvestors, setRawInvestors] = useState<any[]>([]);
  const [myDocuments, setMyDocuments] = useState<any[]>([]);
  const [paymentBarData, setPaymentBarData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

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

      // Single aggregated API endpoint call with SWR caching
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
      let totalPayAmt = 0;
      let completedPayAmt = 0;

      if (isInvestorUser) {
        const userEmail = (user?.email || "").toLowerCase().trim();
        const userName = (user?.name || "").toLowerCase().trim();

        // Match all contracts belonging to this investor
        const matchingInvestors = allInvestors.filter(i => {
          const invEmail = getInvestorEmail(i).toLowerCase().trim();
          const invName = getInvestorName(i).toLowerCase().trim();
          return (userEmail && invEmail === userEmail) || (userName && invName === userName);
        });

        const myInvestorList = matchingInvestors.length > 0 ? matchingInvestors : (allInvestors.length > 0 ? [allInvestors[0]] : []);
        const myInvestorIds = new Set(myInvestorList.map(i => getInvestorId(i)).filter(Boolean));
        const myInvestorNames = new Set(myInvestorList.map(i => getInvestorName(i).toLowerCase().trim()).filter(Boolean));

        // Sum total investment amount across all contracts
        investmentVal = myInvestorList.reduce((sum, i) => sum + getInvestorAmount(i), 0);
        investorsCountVal = myInvestorList.length;

        // Match all payments for this investor
        const myPayments = allPayments.filter(p => {
          const pInvId = p.investorId ?? p.InvestorId;
          const pInvName = (p.investorName ?? p.InvestorName ?? "").toLowerCase().trim();
          const pInvEmail = (p.investorEmail ?? p.InvestorEmail ?? "").toLowerCase().trim();
          return (
            (pInvId && myInvestorIds.has(pInvId)) ||
            (pInvName && myInvestorNames.has(pInvName)) ||
            (userEmail && pInvEmail === userEmail)
          );
        });

        // Filter investor documents (by investor_id, investorId, email, or investor name)
        const myFilteredDocs = allDocuments.filter(doc => {
          const docInvId = doc.investor_id ?? doc.investorId ?? doc.InvestorId;
          const docEmail = (doc.investor_email ?? doc.investorEmail ?? doc.uploadedByEmail ?? doc.UploadedByEmail ?? doc.email ?? "").toLowerCase().trim();
          const docInvName = (doc.investor_name ?? doc.investorName ?? "").toLowerCase().trim();
          const docTitle = (doc.title ?? "").toLowerCase().trim();

          const matchesId = docInvId && myInvestorIds.has(Number(docInvId));
          const matchesEmail = userEmail && docEmail === userEmail;
          const matchesName = userName && (docInvName === userName || myInvestorNames.has(docInvName));
          const matchesTitle = (userName && docTitle.includes(userName)) || Array.from(myInvestorNames).some(n => n && docTitle.includes(n));

          return matchesId || matchesEmail || matchesName || matchesTitle || (matchingInvestors.length === 0 && allDocuments.length > 0);
        });
        setMyDocuments(myFilteredDocs);
        documentsCountVal = myFilteredDocs.length;

        totalPayAmt = myPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0);
        const sendAckPayments = myPayments.filter(p => getPaymentIsSent(p) || getPaymentIsReceived(p));
        const sendAckAmount = sendAckPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0);
        const sendAckCount = sendAckPayments.length;

        const completedPayments = myPayments.filter(p => getPaymentIsReceived(p));
        completedPayAmt = completedPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0);
        payoutsTillDateVal = completedPayAmt;

        avgPayoutVal = sendAckCount > 0 ? sendAckAmount / sendAckCount : (completedPayments.length > 0 ? completedPayAmt / completedPayments.length : 0);

        let chartPoints: any[] = [];
        if (myPayments.length > 0) {
          chartPoints = myPayments.map((p, idx) => {
            let label = `Pay #${idx + 1}`;
            const pDateVal = getPaymentDate(p);
            if (pDateVal) {
              const d = new Date(pDateVal);
              if (!isNaN(d.getTime())) {
                label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              }
            }
            const amt = getPaymentAmount(p);
            const pDone = (getPaymentIsSent(p) || getPaymentIsReceived(p)) ? amt : 0;
            return {
              name: label,
              value: investmentVal,
              payout: pDone,
              avgPayout: Math.round(avgPayoutVal)
            };
          });
        } else if (investmentVal > 0) {
          chartPoints = [
            { name: "Contract Start", value: investmentVal, payout: 0, avgPayout: Math.round(avgPayoutVal) },
            { name: "Current", value: investmentVal, payout: Math.round(payoutsTillDateVal), avgPayout: Math.round(avgPayoutVal) },
          ];
        } else {
          chartPoints = [];
        }
        setChartData(chartPoints);

        setPaymentBarData([
          { name: "My Payouts", total: Math.round(totalPayAmt), completed: Math.round(completedPayAmt) }
        ]);

      } else {
        investmentVal = allInvestors.reduce((sum, i) => sum + getInvestorAmount(i), 0);
        investorsCountVal = allInvestors.length;
        documentsCountVal = allDocuments.length;

        totalPayAmt = allPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0);
        const sendAckPayments = allPayments.filter(p => getPaymentIsSent(p) || getPaymentIsReceived(p));
        const sendAckAmount = sendAckPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0);
        const sendAckCount = sendAckPayments.length;

        const completedPayments = allPayments.filter(p => getPaymentIsReceived(p));
        completedPayAmt = completedPayments.reduce((sum, p) => sum + getPaymentAmount(p), 0);
        payoutsTillDateVal = completedPayAmt;

        avgPayoutVal = sendAckCount > 0 ? sendAckAmount / sendAckCount : 0;

        if (allInvestors.length > 0) {
          const sortedInvestors = [...allInvestors].sort((a, b) => {
            const dateAVal = getInvestorDate(a);
            const dateBVal = getInvestorDate(b);
            const dateA = dateAVal ? new Date(dateAVal) : new Date(0);
            const dateB = dateBVal ? new Date(dateBVal) : new Date(0);
            return dateA.getTime() - dateB.getTime();
          });

          const chartPoints = sortedInvestors.map(inv => {
            let label = getInvestorName(inv);
            const invDate = getInvestorDate(inv);
            if (invDate) {
              const d = new Date(invDate);
              if (!isNaN(d.getTime())) {
                label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              }
            }
            const invCap = getInvestorAmount(inv);
            const invId = getInvestorId(inv);
            const invName = getInvestorName(inv);
            const invPayments = allPayments.filter(p =>
              (invName && (p.investorName === invName || p.InvestorName === invName)) ||
              (invId && (p.investorId === invId || p.InvestorId === invId))
            );
            const invPaid = invPayments.filter(p => getPaymentIsSent(p) || getPaymentIsReceived(p)).reduce((sum, p) => sum + getPaymentAmount(p), 0);

            return {
              name: label,
              value: invCap,
              payout: invPaid > 0 ? invPaid : Math.round(invCap * 0.05),
              avgPayout: Math.round(avgPayoutVal)
            };
          });
          setChartData(chartPoints);
        } else {
          setChartData([]);
        }

        setPaymentBarData([
          { name: "Portfolio Payouts", total: Math.round(totalPayAmt), completed: Math.round(completedPayAmt) }
        ]);
      }

      setStats({
        users: 0,
        investors: investorsCountVal,
        investment: investmentVal,
        documents: documentsCountVal,
        projects: allProjects.length,
        totalRoi: payoutsTillDateVal,
        avgPayout: avgPayoutVal,
        totalPaymentsAmt: totalPayAmt,
        completedPaymentsAmt: completedPayAmt
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
                  color="bg-blue-50 text-blue-600"
                  link="/investors"
                />
                <StatCard
                  title="Total Payouts Recieved"
                  value={`£${stats.totalRoi.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={PoundSterling}
                  color="bg-emerald-50 text-emerald-600"
                  link="/payments"
                />
                <StatCard
                  title="Average Payouts"
                  value={`£${stats.avgPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={PoundSterling}
                  color="bg-violet-50 text-violet-600"
                  link="/payments"
                />
                <StatCard
                  title="My Documents"
                  value={stats.documents.toString()}
                  icon={FileText}
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
                  color="bg-blue-50 text-blue-600"
                  link="/investors"
                />
                <StatCard
                  title="Total Payouts Sent"
                  value={`£${stats.totalRoi.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={PoundSterling}
                  color="bg-emerald-50 text-emerald-600"
                  link="/payments"
                />
                <StatCard
                  title="Average Payouts"
                  value={`£${stats.avgPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  icon={PoundSterling}
                  color="bg-violet-50 text-violet-600"
                  link="/payments"
                />
                <StatCard
                  title="Total Investors"
                  value={stats.investors.toString()}
                  icon={Users}
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

            <div className="h-72 w-full flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Chart Data...</p>
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No chart data available</p>
                  <p className="text-xs text-slate-400 mt-1">Growth trends will populate as investments are onboarded.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPayout" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAvgPayout" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v >= 1000 ? `${v / 1000}k` : v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", color: "#fff", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)" }}
                      formatter={(val: any, name: any) => [`£${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                    />
                    <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" name="Capital Investment" />
                    <Area type="monotone" dataKey="payout" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPayout)" name="Payouts Done" />
                    <Area type="monotone" dataKey="avgPayout" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorAvgPayout)" name="Average Payout" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
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
                            <p className="text-xs text-slate-500 font-medium font-mono">
                              {doc.type || "PDF"} • {formatUKDate(doc.created_at, "Recent")}
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
                    rawInvestors.slice(0, 4).map((inv: any, idx: number) => {
                      const invName = getInvestorName(inv);
                      const invEmail = getInvestorEmail(inv);
                      const invDate = getInvestorDate(inv);
                      const invAmount = getInvestorAmount(inv);
                      const invType = inv.type ?? (inv.InvestorTypeId === 2 ? "Business" : "Individual");
                      return (
                        <div key={idx} className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                              {invName ? invName.substring(0, 2).toUpperCase() : "IN"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{invName}</p>
                              <p className="text-xs text-slate-500 font-mono">{invEmail || "—"} • {formatUKDate(invDate, "Active")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-extrabold text-slate-950">£{invAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{invType}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Right Info Card - Payment Disbursements Bar Chart */}
        <div className="space-y-6">
          <motion.div variants={item} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display font-bold text-slate-900">Payment Disbursements</h3>
                <p className="text-xs text-slate-500 mt-1">Total payments vs completed payouts till date</p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <span className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Disbursements...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentBarData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `£${v >= 1000 ? `${v / 1000}k` : v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", color: "#fff", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)" }}
                      formatter={(val: any, name: any) => [`£${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name === "total" ? "Total Scheduled" : "Completed Till Date"]}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      formatter={(value) => <span className="text-xs font-bold text-slate-600 ml-1">{value === "total" ? "Total Payments" : "Completed"}</span>}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} name="total" barSize={36} />
                    <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} name="completed" barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 mt-4">
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Total Payments</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  £{stats.totalPaymentsAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Completed</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  £{stats.completedPaymentsAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
