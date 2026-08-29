import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { Investor, Payment, Project } from "../types";
import { API_BASE_URL, authHeaders } from "../config/api";
import { cachedFetch } from "../utils/apiCache";
import { TableSkeleton } from "../components/TableSkeleton";
import { Search, Download, Calendar, Filter, FileSpreadsheet, Users, Folder, Landmark, RefreshCw, CheckCircle2, TrendingUp, DollarSign } from "lucide-react";
import { formatUKDate } from "../utils/formatters";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

type ReportType = "investors" | "investments" | "payments";
type DateFilterType = "all" | "week" | "month" | "year" | "custom";

export const Reports = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<ReportType>("investors");
  const [datePreset, setDatePreset] = useState<DateFilterType>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Data States
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, projRes, payRes] = await Promise.all([
          cachedFetch(`${API_BASE_URL}/api/admin/investors`, { headers: authHeaders() }),
          cachedFetch(`${API_BASE_URL}/api/projects`, { headers: authHeaders() }).catch(() => null),
          cachedFetch(`${API_BASE_URL}/api/admin/payments`, { headers: authHeaders() })
        ]);

        if (invRes) setInvestors(await invRes.json());
        if (projRes) setProjects(await projRes.json());
        if (payRes) setPayments(await payRes.json());
      } catch (err) {
        console.error("Failed to load reports data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper Date Filter Evaluator
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const itemDate = new Date(dateStr).getTime();
    const now = new Date().getTime();

    if (datePreset === "week") {
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      return itemDate >= oneWeekAgo && itemDate <= now;
    }
    if (datePreset === "month") {
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
      return itemDate >= oneMonthAgo && itemDate <= now;
    }
    if (datePreset === "year") {
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      return itemDate >= oneYearAgo && itemDate <= now;
    }
    if (datePreset === "custom") {
      let valid = true;
      if (startDate) valid = valid && itemDate >= new Date(startDate).getTime();
      if (endDate) valid = valid && itemDate <= new Date(endDate).setHours(23, 59, 59, 999);
      return valid;
    }

    return true;
  };

  // Filtered Investors Data
  const filteredInvestors = useMemo(() => {
    return investors.filter(i => {
      const matchesSearch =
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.organization && i.organization.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDate = isDateInRange(i.date_of_onboarding);
      return matchesSearch && matchesDate;
    });
  }, [investors, searchTerm, datePreset, startDate, endDate]);

  // Filtered Projects Data
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDate = isDateInRange(p.start_date);
      return matchesSearch && matchesDate;
    });
  }, [projects, searchTerm, datePreset, startDate, endDate]);

  // Filtered Payments Data
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch =
        p.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `PayId#${p.paymentId}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.amount.toString().includes(searchTerm);
      const matchesDate = isDateInRange(p.paymentDate);
      return matchesSearch && matchesDate;
    });
  }, [payments, searchTerm, datePreset, startDate, endDate]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (activeTab === "investors") {
      const totalAmount = filteredInvestors.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      return { count: filteredInvestors.length, label: "Total Capital", amount: totalAmount };
    }
    if (activeTab === "investments") {
      const totalAmount = filteredProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
      return { count: filteredProjects.length, label: "Target Funding", amount: totalAmount };
    }
    const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return { count: filteredPayments.length, label: "Payout Volume", amount: totalAmount };
  }, [activeTab, filteredInvestors, filteredProjects, filteredPayments]);

  // Excel / CSV Export Utility
  const handleExportExcel = () => {
    let exportRows: any[] = [];
    let filename = `InvestPro_${activeTab.toUpperCase()}_Report_${new Date().toISOString().split("T")[0]}.csv`;

    if (activeTab === "investors") {
      exportRows = filteredInvestors.map(i => ({
        "Investor ID": i.id,
        "Full Name": i.name,
        "Email Address": i.email,
        "Mobile": i.mobile || "N/A",
        "Organization": i.organization || "N/A",
        "Investor Type": i.type,
        "Committed Capital (£)": i.amount,
        "Bank Name": i.bank || "N/A",
        "Account Number": i.acNumber || "N/A",
        "Sort Code": i.sortCode || "N/A",
        "Onboarding Date": formatUKDate(i.date_of_onboarding, "N/A"),
        "Status": i.status
      }));
    } else if (activeTab === "investments") {
      exportRows = filteredProjects.map(p => ({
        "Project ID": p.id,
        "Title": p.title,
        "Description": p.description,
        "Target Funding (£)": p.budget,
        "Duration": p.duration,
        "Start Date": formatUKDate(p.start_date),
        "End Date": formatUKDate(p.end_date),
        "Status": p.status
      }));
    } else if (activeTab === "payments") {
      exportRows = filteredPayments.map(p => ({
        "Payment ID": `PayId#${p.paymentId}`,
        "Investor Name": p.investorName,
        "Amount (£)": p.amount,
        "Cycle": p.paymentCycle || "Monthly",
        "Payment Date": formatUKDate(p.paymentDate),
        "Status": p.status,
        "Is Sent": p.isSent ? "Yes" : "No",
        "Is Received": p.isReceived ? "Yes" : "No"
      }));
    }

    if (!exportRows.length) return;

    const headers = Object.keys(exportRows[0]);
    const csvContent = [
      headers.join(","),
      ...exportRows.map(row =>
        headers
          .map(fieldName => {
            const val = row[fieldName] ?? "";
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(",")
      )
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentTableCount = useMemo(() => {
    if (activeTab === "investors") return filteredInvestors.length;
    if (activeTab === "investments") return filteredProjects.length;
    return filteredPayments.length;
  }, [activeTab, filteredInvestors, filteredProjects, filteredPayments]);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            Generate and export comprehensive operational and financial analytics.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={loading || currentTableCount === 0}
          title={currentTableCount === 0 ? "No data available in table to download" : "Download Excel spreadsheet"}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-slate-300 self-start md:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" /> Download Excel Sheet
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("investors")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "investors"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Users className="w-4 h-4" /> Investors Report ({filteredInvestors.length})
        </button>

        <button
          onClick={() => setActiveTab("investments")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "investments"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Folder className="w-4 h-4" /> Investments / Projects ({filteredProjects.length})
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "payments"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <Landmark className="w-4 h-4" /> Payments & Payouts ({filteredPayments.length})
        </button>
      </div>

      {/* Filter Control Bar - Perfectly Aligned 4-Column Grid */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Field 1: Keyword Search */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Search Records
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-10"
              />
            </div>
          </div>

          {/* Field 2: Quick Date Preset */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Date Filter Preset
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DateFilterType)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer font-semibold h-10"
              >
                <option value="all">Date Filter: All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* Field 3: Custom Start Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Start Date
            </label>
            <input
              type="date"
              disabled={datePreset !== "custom"}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 disabled:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 h-10"
            />
          </div>

          {/* Field 4: Custom End Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              End Date
            </label>
            <input
              type="date"
              disabled={datePreset !== "custom"}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 disabled:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 h-10"
            />
          </div>

        </div>
      </div>

      {/* Reports Spreadsheet Table View */}
      {loading ? (
        <TableSkeleton columns={5} rows={5} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            
            {/* TAB 1: INVESTORS REPORT */}
            {activeTab === "investors" && (
              filteredInvestors.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-slate-900">No investor report records</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium max-w-sm">
                    {searchTerm || datePreset !== "all"
                      ? "Try adjusting your search or date filter criteria."
                      : "No investor records are available for reporting."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Investor</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Organization</th>
                      <th className="px-6 py-4 text-right">Committed Capital</th>
                      <th className="px-6 py-4 text-center">Onboarding Date</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {filteredInvestors.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 align-middle">
                          {i.name}
                          <span className="block text-[11px] text-slate-400 font-normal">{i.email}</span>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-100">
                            {i.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600 align-middle">{i.organization || "—"}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600 text-right align-middle">£{Number(i.amount).toLocaleString()}</td>
                        <td className="px-6 py-4 text-slate-500 text-center align-middle font-mono">
                          {formatUKDate(i.date_of_onboarding, "N/A")}
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {i.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* TAB 2: INVESTMENTS / PROJECTS REPORT */}
            {activeTab === "investments" && (
              filteredProjects.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <Folder className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-slate-900">No project report records</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium max-w-sm">
                    {searchTerm || datePreset !== "all"
                      ? "Try adjusting your search or date filter criteria."
                      : "No project records are available for reporting."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Project Title</th>
                      <th className="px-6 py-4 text-right">Target Funding</th>
                      <th className="px-6 py-4 text-center">Duration</th>
                      <th className="px-6 py-4 text-center">Start Date</th>
                      <th className="px-6 py-4 text-center">End Date</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {filteredProjects.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 align-middle">{p.title}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600 text-right align-middle">£{Number(p.budget).toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium text-slate-600 text-center align-middle">{p.duration}</td>
                        <td className="px-6 py-4 text-slate-500 text-center align-middle font-mono">{formatUKDate(p.start_date)}</td>
                        <td className="px-6 py-4 text-slate-500 text-center align-middle font-mono">{formatUKDate(p.end_date)}</td>
                        <td className="px-6 py-4 text-right align-middle">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* TAB 3: PAYMENTS & PAYOUTS REPORT */}
            {activeTab === "payments" && (
              filteredPayments.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                    <DollarSign className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-slate-900">No payment report records</h3>
                  <p className="text-sm text-slate-500 mt-1 font-medium max-w-sm">
                    {searchTerm || datePreset !== "all"
                      ? "Try adjusting your search or date filter criteria."
                      : "No payment records match your parameters."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Transaction Ref</th>
                      <th className="px-6 py-4">Investor Profile</th>
                      <th className="px-6 py-4 text-right">Disbursement Amount</th>
                      <th className="px-6 py-4 text-center">Payment Cycle</th>
                      <th className="px-6 py-4 text-center">Payment Due Date</th>
                      <th className="px-6 py-4 text-right">Disbursement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {filteredPayments.map(p => (
                      <tr key={p.paymentId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 align-middle">PayId#{p.paymentId}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 align-middle">{p.investorName}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600 text-right align-middle">£{Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-center align-middle">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-100">
                            {p.paymentCycle || "Monthly"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-center align-middle font-mono">{formatUKDate(p.paymentDate)}</td>
                        <td className="px-6 py-4 text-right align-middle">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border",
                            p.status === "Received" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

          </div>
        </div>
      )}

    </motion.div>
  );
};
