import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { SystemReport, Investor } from "../types";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL } from "../config/api";
import { TableSkeleton } from "../components/TableSkeleton";
import { Search, Plus, Download, Trash2, FileText, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Reports = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === "admin" || user?.role === "manager" || user?.role === "superadmin";

  const [reports, setReports] = useState<SystemReport[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    type: "PDF"
  });
  const [selectedInvestorIds, setSelectedInvestorIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/reports`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/investors`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      if (response.ok) {
        const data = await response.json();
        setInvestors(data);
        // Default target all
        setSelectedInvestorIds(data.map((i: Investor) => String(i.id)));
      }
    } catch (err) {
      console.warn("Could not load investors list", err);
    }
  };

  useEffect(() => {
    fetchReports();
    if (isAdmin) {
      fetchInvestors();
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const titleWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toUpperCase();
      
      let typeOption = "PDF";
      if (ext === "XLS" || ext === "XLSX" || ext === "CSV") typeOption = "EXCEL";

      setFormData({
        title: titleWithoutExt,
        type: typeOption
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedInvestorIds([]);
      setSelectAll(false);
    } else {
      setSelectedInvestorIds(investors.map(i => String(i.id)));
      setSelectAll(true);
    }
  };

  const toggleInvestor = (id: string) => {
    let updated = [...selectedInvestorIds];
    if (updated.includes(id)) {
      updated = updated.filter(item => item !== id);
      setSelectAll(false);
    } else {
      updated.push(id);
      if (updated.length === investors.length) {
        setSelectAll(true);
      }
    }
    setSelectedInvestorIds(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const fileSize = selectedFile 
        ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` 
        : "0.2 MB";
      const fileUrl = selectedFile 
        ? `/uploads/reports/${selectedFile.name}` 
        : "#";

      const targets = selectAll ? "all" : selectedInvestorIds.join(",");

      const response = await fetch(`${API_BASE_URL}/api/admin/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          size: fileSize,
          url: fileUrl,
          targetInvestorIds: targets
        })
      });

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ title: "", type: "PDF" });
        setSelectedFile(null);
        fetchReports();
      }
    } catch (err) {
      console.error("Failed to upload report", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      if (response.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error("Failed to delete report", err);
    }
  };

  const handleDownload = (r: SystemReport) => {
    // Generate text/file download representation
    const text = `InvestPro Report - ${r.title}\nFormat: ${r.type}\nSize: ${r.size}\nUploaded: ${new Date(r.createdAt).toLocaleDateString()}\nURL Ref: ${r.url}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${r.title.replace(/\s+/g, "_")}.${r.type.toLowerCase() === "pdf" ? "pdf" : "xlsx"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReports = reports.filter(r => {
    return r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.investorName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">System &gt; Reports</span>
          <h2 className="text-2xl font-display font-bold text-slate-900 mt-0.5">System Reports</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Generate, upload, and export performance and compliance summaries.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setSelectAll(true);
              setSelectedInvestorIds(investors.map(i => String(i.id)));
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Upload Report
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={isAdmin ? 6 : 5} rows={3} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Format</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Date</th>
                  {isAdmin && <th className="px-6 py-4">To</th>}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                <AnimatePresence mode="popLayout">
                  {filteredReports.map(r => (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-3">
                        <FileText className="w-4 h-4 text-rose-500" />
                        {r.title}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          r.type === "PDF" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{r.size}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-slate-600 font-medium max-w-[200px] truncate">
                          {r.investorName}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleDownload(r)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Report Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload System Report">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Section: Details */}
          <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              1. Report Details
            </h3>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Report Title <strong className="text-rose-500">*</strong></label>
              <input 
                required
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Q3 Growth and Compliance Audit"
                className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">File Format</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-700 cursor-pointer focus:ring-4 focus:ring-blue-100/50"
              >
                <option value="PDF">PDF Report Document</option>
                <option value="EXCEL">Excel Sheet Summary</option>
              </select>
            </div>
          </div>

          {/* Section: Targeted Recipients */}
          <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              2. Targeted Recipients
            </h3>
            <div className="border border-slate-200 rounded-xl p-3 bg-white max-h-44 overflow-y-auto space-y-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600 cursor-pointer w-full text-left"
              >
                {selectAll ? <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                Select All Investors
              </button>
              <hr className="border-slate-100" />
              {investors.map(inv => {
                const isSelected = selectedInvestorIds.includes(String(inv.id));
                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => toggleInvestor(String(inv.id))}
                    disabled={selectAll}
                    className={`flex items-center gap-2 text-sm font-medium w-full text-left transition-colors ${
                      selectAll ? "text-slate-400 cursor-not-allowed" : "text-slate-700 hover:text-blue-600 cursor-pointer"
                    }`}
                  >
                    {selectAll || isSelected ? (
                      <CheckSquare className={`w-4 h-4 flex-shrink-0 ${selectAll ? "text-blue-400" : "text-blue-600"}`} />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    {inv.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: File Upload */}
          <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              3. Attach File
            </h3>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.xls,.xlsx,.csv"
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center group hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer"
            >
              <div className="bg-slate-50 w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform group-hover:bg-blue-100">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              {selectedFile ? (
                <div>
                  <p className="text-sm font-bold text-blue-600 truncate max-w-[250px] mx-auto">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-700">Select Report File</p>
                  <p className="text-xs text-slate-400 mt-1">Drop your file here or click to browse</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 cursor-pointer"
            >
              Upload Report
            </button>
          </div>
        </form>
      </BaseModal>
    </motion.div>
  );
};
