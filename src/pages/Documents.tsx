import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { motion } from "motion/react";
import { Document } from "../types";
import { DataTable } from "../components/DataTable";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL } from "../config/api";

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    type: "PDF"
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role === "client") {
      alert("Access Denied. Clients are not authorized to upload documents.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify({
          ...formData,
          size: "0.2 MB", // Mock size
          uploaded_by: user?.name || "System",
          url: "#"
        }),
      });

      if (response.ok) {
        fetchDocuments();
        setIsModalOpen(false);
        setFormData({ title: "", type: "PDF" });
      }
    } catch (error) {
      console.error("Failed to add document");
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role === "client") {
      alert("Access Denied. Clients are not authorized to delete documents.");
      return;
    }
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, { 
        method: "DELETE",
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete document");
    }
  };

  const getFileIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'PDF') return <FileText className="w-5 h-5 text-red-500" />;
    if (t === 'DOCX' || t === 'DOC') return <File className="w-5 h-5 text-blue-500" />;
    if (t === 'XLSX' || t === 'CSV') return <FileCode className="w-5 h-5 text-emerald-500" />;
    if (t === 'JPG' || t === 'PNG') return <FileImage className="w-5 h-5 text-purple-500" />;
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

  const columns = [
    {
      header: "Document",
      render: (d: Document) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
            {getFileIcon(d.type)}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{d.title}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{d.size} • {d.type}</p>
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
              <Trash2 className="w-4 h-4" />
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
          <p className="text-slate-500 mt-1">Access secure reports, agreements, and compliance files.</p>
        </motion.div>
        {user?.role !== 'client' && (
          <motion.button 
            variants={item}
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
          >
            <Plus className="w-5 h-5" />
            Upload Document
          </motion.button>
        )}
      </div>

      <DataTable 
        columns={columns}
        data={filteredDocs}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        emptyMessage="No documents found"
        emptyIcon={<FileText className="w-8 h-8 text-slate-300" />}
      />

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

          <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-center group hover:border-blue-300 transition-all cursor-pointer">
            <div className="bg-white w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-slate-900">Select File</p>
            <p className="text-xs text-slate-400 mt-1">Drop your file here or click to browse</p>
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
