import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../store";
import { 
  FileText, 
  Plus, 
  Download, 
  Trash2, 
  FileCode, 
  FileImage, 
  File, 
  Calendar,
  CheckCircle,
  Search,
  RefreshCw,
  Eye,
  Filter,
  X
} from "lucide-react";
import { motion } from "motion/react";
import { Document, Investor } from "../types";
import { DataTable } from "../components/DataTable";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL, authHeaders } from "../config/api";
import { TableSkeleton, StatCardSkeleton } from "../components/TableSkeleton";
import { cn } from "../lib/utils";
import { AgreementViewerModal } from "../components/AgreementViewerModal";

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

export const Documents = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const isReadOnly = user?.role === "client" || user?.role === "investor";
  const [documents, setDocuments] = useState<Document[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvestorFilter, setSelectedInvestorFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "PDF",
    investorId: ""
  });
  const [isAllInvestors, setIsAllInvestors] = useState(true);
  const [selectedInvestorIds, setSelectedInvestorIds] = useState<string[]>([]);

  const activeInvestors = investors.filter(i => !i.status || i.status.toLowerCase() === "active");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const titleWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toUpperCase();
      
      let typeOption = ext || "FILE";
      if (ext === "DOC" || ext === "DOCX") typeOption = "DOCX";
      else if (ext === "XLS" || ext === "XLSX" || ext === "CSV") typeOption = "XLSX";
      else if (ext === "JPG" || ext === "JPEG" || ext === "PNG") typeOption = "JPG";

      setFormData({
        ...formData,
        title: titleWithoutExt,
        type: typeOption
      });
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        headers: authHeaders()
      });
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/investors`, {
        headers: authHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setInvestors(data);
      }
    } catch (err) {
      console.warn("Could not load investors list", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    if (!isReadOnly) {
      fetchInvestors();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !selectedFile) return;

    setUploading(true);
    setError(null);
    try {
      const uploadData = new FormData();
      uploadData.append("title", formData.title);
      uploadData.append("type", formData.type);
      uploadData.append("file", selectedFile);

      const headers = authHeaders();
      delete headers["Content-Type"]; // Allow browser to set the multipart boundary boundary automatically

      const targetParam = isAllInvestors || selectedInvestorIds.length === 0
        ? (formData.investorId ? `id=${formData.investorId}` : "id=0")
        : `targetIds=${selectedInvestorIds.join(",")}`;

      const response = await fetch(`${API_BASE_URL}/api/admin/documents?${targetParam}`, {
        method: "POST",
        headers: headers,
        body: uploadData
      });
      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ title: "", type: "PDF", investorId: "" });
        setIsAllInvestors(true);
        setSelectedInvestorIds([]);
        setSelectedFile(null);
        fetchDocuments();
      } else {
        const errorText = await response.text();
        setError(errorText || `Upload failed with status code ${response.status}.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to establish server connection.");
    } finally {
      setUploading(false);
    }
  };

  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleOpenDelete = (doc: Document) => {
    setDocToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/documents/${docToDelete.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (response.ok) {
        fetchDocuments();
      }
    } catch (error) {
      console.error("Failed to delete document", error);
    } finally {
      setIsDeleteModalOpen(false);
      setDocToDelete(null);
    }
  };

  const getFileIcon = (type: string, iconClass = "w-8 h-8") => {
    const t = type.toLowerCase();
    if (t.includes("pdf")) return <FileText className={cn(iconClass, "text-rose-500")} />;
    if (t.includes("image") || t.includes("png") || t.includes("jpg")) return <FileImage className={cn(iconClass, "text-blue-500")} />;
    if (t.includes("excel") || t.includes("csv") || t.includes("sheet")) return <FileCode className={cn(iconClass, "text-emerald-500")} />;
    return <File className={cn(iconClass, "text-slate-500")} />;
  };

  const [selectedViewerDoc, setSelectedViewerDoc] = useState<Document | null>(null);

  const columns = [
    {
      header: "Investor",
      render: (d: Document) => {
        const name = d.investor_name || d.uploaded_by || "Investor Profile";
        const email = d.investor_email;
        const targetId = (d as any).investorId || (d as any).investor_id || "";
        return (
          <div className="flex flex-col text-left py-1">
            <button
              onClick={() => navigate(targetId ? `/investors/${targetId}` : "/investors", { state: { searchInvestor: name } })}
              className="font-extrabold text-slate-900 text-sm hover:text-blue-600 transition-colors text-left cursor-pointer outline-none hover:underline"
            >
              {name}
            </button>
            {email ? (
              <a
                href={`mailto:${email}`}
                className="text-xs text-slate-500 hover:text-blue-600 hover:underline font-medium block truncate max-w-[220px] mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                {email}
              </a>
            ) : (
              <span className="text-xs text-slate-400 font-medium">—</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Document",
      render: (d: Document) => (
        <button
          onClick={() => setSelectedViewerDoc(d)}
          className="inline-flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 transition-all cursor-pointer shadow-xs active:scale-95 group"
          title={`View Document (${d.type})`}
        >
          {getFileIcon(d.type, "w-4 h-4 transition-transform group-hover:scale-110")}
          <span className="font-semibold text-slate-700 group-hover:text-blue-700">View Document</span>
        </button>
      )
    },
    {
      header: "Status",
      render: (d: any) => (
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide",
          d.status === "Signed" 
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
            : d.status === "Pending Signature"
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-slate-100 text-slate-600 border border-slate-200"
        )}>
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            d.status === "Signed" ? "bg-emerald-500" : d.status === "Pending Signature" ? "bg-amber-500" : "bg-slate-400"
          )} />
          {d.status || "Approved"}
        </span>
      )
    },
    {
      header: "Date",
      render: (d: Document) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(d.created_at).toLocaleDateString()}
        </div>
      )
    },
    {
      header: "Actions",
      align: "right" as const,
      render: (d: Document) => (
        <div className="flex items-center justify-end gap-2">
          {!isReadOnly && (
            <button 
              onClick={() => handleOpenDelete(d)}
              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors cursor-pointer"
              title="Delete Document"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      // 1. Text Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesText =
          (d.title && d.title.toLowerCase().includes(term)) ||
          (d.type && d.type.toLowerCase().includes(term)) ||
          (d.investor_name && d.investor_name.toLowerCase().includes(term)) ||
          (d.investor_email && d.investor_email.toLowerCase().includes(term)) ||
          (d.uploaded_by && d.uploaded_by.toLowerCase().includes(term));
        if (!matchesText) return false;
      }

      // 2. Filter by Investor
      if (selectedInvestorFilter !== "all") {
        const invIdNum = parseInt(selectedInvestorFilter);
        if (d.investor_id && d.investor_id > 0) {
          if (d.investor_id !== invIdNum) return false;
        } else {
          const selInv = activeInvestors.find(i => String(i.id) === selectedInvestorFilter);
          if (selInv && d.investor_name && !d.investor_name.toLowerCase().includes(selInv.name.toLowerCase())) {
            return false;
          }
        }
      }

      // 3. Filter by Document Type
      if (selectedTypeFilter !== "all") {
        const typeLower = (d.type || "").toLowerCase();
        const filterLower = selectedTypeFilter.toLowerCase();
        if (!typeLower.includes(filterLower)) return false;
      }

      // 4. Filter by Date Range
      if (startDateFilter || endDateFilter) {
        try {
          const docDateStr = new Date(d.created_at).toISOString().split("T")[0];
          if (startDateFilter && docDateStr < startDateFilter) return false;
          if (endDateFilter && docDateStr > endDateFilter) return false;
        } catch {
          // ignore date parse issues
        }
      }

      // 5. Filter by Status
      if (selectedStatusFilter !== "all") {
        const docStatus = (d.status || "Approved").toLowerCase();
        const filterStatus = selectedStatusFilter.toLowerCase();
        if (!docStatus.includes(filterStatus)) return false;
      }

      return true;
    });
  }, [documents, searchTerm, selectedInvestorFilter, selectedTypeFilter, startDateFilter, endDateFilter, selectedStatusFilter, activeInvestors]);

  // Derived stats
  const totalDocsCount = documents.length;
  const pdfDocsCount = documents.filter(d => d.type.toUpperCase().includes("PDF")).length;
  const sheetDocsCount = documents.filter(d => d.type.toUpperCase().includes("XLSX") || d.type.toUpperCase().includes("CSV")).length;
  const wordDocsCount = documents.filter(d => d.type.toUpperCase().includes("DOC") || d.type.toUpperCase().includes("DOCX")).length;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div variants={item}>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Documents Repository</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            Access, manage, and verify official investor agreements and compliance files.
          </p>
        </motion.div>
        {!isReadOnly && (
          <motion.button 
            variants={item}
            onClick={() => { setError(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/10 cursor-pointer active:scale-[0.98] transition-transform flex-shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <TableSkeleton />
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Documents */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Total Documents</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{totalDocsCount}</span>
                </div>
              </div>
            </div>

            {/* PDFs */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">PDF Files</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{pdfDocsCount}</span>
                </div>
              </div>
            </div>

            {/* Spreadsheets */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Spreadsheets</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{sheetDocsCount}</span>
                </div>
              </div>
            </div>

            {/* Word Docs */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <File className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Word Docs</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{wordDocsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search/Filter Panel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search documents by investor, title, type..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-xl transition-all text-sm font-semibold"
                />
              </div>

              {(searchTerm || selectedInvestorFilter !== "all" || selectedTypeFilter !== "all" || startDateFilter || endDateFilter || selectedStatusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedInvestorFilter("all");
                    setSelectedTypeFilter("all");
                    setStartDateFilter("");
                    setEndDateFilter("");
                    setSelectedStatusFilter("all");
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-100 self-end md:self-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>

            {/* Filter Controls Grid */}
            <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100", !isReadOnly ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
              
              {/* Filter 1: By Investor (Admin / Manager only) */}
              {!isReadOnly && (
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by Investor</label>
                  <select
                    value={selectedInvestorFilter}
                    onChange={(e) => setSelectedInvestorFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                  >
                    <option value="all">All Investors</option>
                    {activeInvestors.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filter 2: By Document Type */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by Document Type</label>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                >
                  <option value="all">All Document Types</option>
                  <option value="pdf">PDF Documents</option>
                  <option value="docx">Word (DOCX)</option>
                  <option value="xlsx">Excel / CSV (XLSX)</option>
                  <option value="jpg">Image (JPG / PNG)</option>
                </select>
              </div>

              {/* Filter 3: By Date Range */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by Date Range</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    title="From Date"
                    className="w-full px-2 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                  />
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    title="To Date"
                    className="w-full px-2 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Filter 4: By Status */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Filter by Status</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="signed">Signed</option>
                  <option value="pending signature">Pending Signature</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

            </div>

          </div>

          <DataTable 
            columns={columns}
            data={filteredDocs}
            emptyMessage="No documents found"
            emptyIcon={<FileText className="w-8 h-8 text-slate-300" />}
          />
        </div>
      )}

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Document"
        description="Add secure documents to the repository."
      >
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold p-4 rounded-xl text-left">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Document Title</label>
            <input 
              required
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Quarterly Investment Report"
              className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
            />
          </div>

          {!isReadOnly && (
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">Target Recipients *</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAllInvestors}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIsAllInvestors(true);
                        setSelectedInvestorIds([]);
                        setFormData({ ...formData, investorId: "" });
                      } else {
                        setIsAllInvestors(false);
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>All Active Investors</span>
                </label>
                <div className="border-t border-slate-200 my-1"></div>
                {activeInvestors.map(i => {
                  const isChecked = !isAllInvestors && selectedInvestorIds.includes(String(i.id));
                  return (
                    <label key={i.id} className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setIsAllInvestors(false);
                          if (e.target.checked) {
                            setSelectedInvestorIds(prev => [...prev, String(i.id)]);
                          } else {
                            setSelectedInvestorIds(prev => prev.filter(id => id !== String(i.id)));
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <span>{i.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

           <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-center group hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="bg-white w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            {selectedFile ? (
              <div>
                <p className="text-sm font-bold text-blue-600 truncate max-w-[250px] mx-auto">{selectedFile.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-900">Select File</p>
                <p className="text-xs text-slate-400 mt-1">Drop your file here or click to browse</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button 
              type="button"
              disabled={uploading}
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={uploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload File"
              )}
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <BaseModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Delete Document"
        description="Are you sure you want to permanently delete this document? This action cannot be undone."
      >
        <div className="p-6 space-y-4">
          {docToDelete && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="text-sm font-bold text-slate-900">{docToDelete.title}</p>
              <p className="text-xs text-slate-500">{docToDelete.type} • Uploaded {docToDelete.upload_date}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteDocument}
              className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </BaseModal>

      <AgreementViewerModal
        isOpen={!!selectedViewerDoc}
        onClose={() => setSelectedViewerDoc(null)}
        document={selectedViewerDoc}
        investorData={investors.find(i => String(i.id) === String(selectedViewerDoc?.investor_id || (selectedViewerDoc as any)?.investorId)) || null}
      />
    </motion.div>
  );
};
