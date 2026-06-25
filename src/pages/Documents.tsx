import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
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
  Search
} from "lucide-react";
import { motion } from "motion/react";
import { Document } from "../types";
import { DataTable } from "../components/DataTable";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL } from "../config/api";
import { TableSkeleton, StatCardSkeleton } from "../components/TableSkeleton";

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
  const { user } = useSelector((state: RootState) => state.auth);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "PDF"
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const titleWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toUpperCase();
      
      let typeOption = "PDF";
      if (ext === "DOC" || ext === "DOCX") typeOption = "DOCX";
      else if (ext === "XLS" || ext === "XLSX" || ext === "CSV") typeOption = "XLSX";
      else if (ext === "JPG" || ext === "JPEG" || ext === "PNG") typeOption = "JPG";

      setFormData({
        title: titleWithoutExt,
        type: typeOption
      });
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const fileSize = selectedFile 
        ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` 
        : "0.2 MB";
      const fileUrl = selectedFile 
        ? `/uploads/${selectedFile.name}` 
        : "#";

      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
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
          uploaded_by: user?.id || "System Admin"
        })
      });
      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ title: "", type: "PDF" });
        setSelectedFile(null);
        fetchDocuments();
      }
    } catch (error) {
      console.error("Failed to upload document", error);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/documents/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      if (response.ok) {
        fetchDocuments();
      }
    } catch (error) {
      console.error("Failed to delete document", error);
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("pdf")) return <FileText className="w-8 h-8 text-rose-500" />;
    if (t.includes("image") || t.includes("png") || t.includes("jpg")) return <FileImage className="w-8 h-8 text-blue-500" />;
    if (t.includes("excel") || t.includes("csv") || t.includes("sheet")) return <FileCode className="w-8 h-8 text-emerald-500" />;
    return <File className="w-8 h-8 text-slate-500" />;
  };

  const columns = [
    {
      header: "Document",
      render: (d: Document) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
            {getFileIcon(d.type)}
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm hover:text-blue-600 cursor-pointer">{d.title}</h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 inline-block">{d.type}</span>
          </div>
        </div>
      )
    },
    {
      header: "Uploaded By",
      render: (d: Document) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${d.uploaded_by}`} 
              alt="Uploader"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xs font-medium text-slate-500">{d.uploaded_by}</span>
        </div>
      )
    },
    {
      header: "Date",
      render: (d: Document) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(d.created_at).toLocaleDateString()}
        </div>
      )
    },
    {
      header: "Actions",
      align: "right" as const,
      render: (d: Document) => (
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
            <Download className="w-4 h-4" />
          </button>
          {user?.role !== 'client' && (
            <button 
              onClick={() => handleDelete(d.id)}
              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-display font-extrabold text-slate-900">Document Repository</h1>
          <p className="text-slate-500 mt-1 font-medium">Access secure reports, agreements, and compliance files.</p>
        </motion.div>
        {user?.role !== 'client' && (
          <motion.button 
            variants={item}
            onClick={() => setIsModalOpen(true)}
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
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents by title or type..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-xl transition-all text-sm font-semibold"
              />
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
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Document Title</label>
            <input 
              required
              type="text" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Quarterly Investment Report"
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">File Type</label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
            >
              <option value="PDF">PDF Document</option>
              <option value="DOCX">Word Document</option>
              <option value="XLSX">Excel Spreadsheet</option>
              <option value="JPG">Image (JPG)</option>
            </select>
          </div>
           <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png"
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

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
            >
              Upload File
            </button>
          </div>
        </form>
      </BaseModal>
    </motion.div>
  );
};
