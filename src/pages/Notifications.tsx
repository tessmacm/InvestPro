import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { SystemNotification, Investor } from "../types";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL } from "../config/api";
import { TableSkeleton } from "../components/TableSkeleton";
import { Search, Filter, Eye, Edit2, Plus, Bell, Calendar, Tag, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Notifications = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [investorFilter, setInvestorFilter] = useState("all");

  // Add/Edit Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    eventType: "Investment Approved",
    investorId: "",
    status: "Active"
  });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.warn("Failed to fetch notifications, using mock fallback", err);
      setNotifications([
        { id: 123, title: "ROI Yield Credited", message: "Monthly ROI payment credited to account.", eventType: "ROICredited", isRead: false, createdAt: "2026-06-28T12:00:00Z", investorId: 1, investorName: "John Doe", status: "Active" },
        { id: 125, title: "Document Approved", message: "Your onboarding agreement has been verified.", eventType: "Investment Approved", isRead: true, createdAt: "2026-06-26T09:30:00Z", investorId: 2, investorName: "ABC Ventures Ltd.", status: "Active" }
      ]);
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
      }
    } catch (err) {
      console.warn("Could not load investors for lookups", err);
      setInvestors([
        { id: "1", name: "John Doe" } as any,
        { id: "2", name: "ABC Ventures Ltd." } as any
      ]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchInvestors();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        message: formData.message,
        eventType: formData.eventType,
        investorId: formData.investorId ? parseInt(formData.investorId) : null,
        status: formData.status
      };

      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to add notification");
      setIsAddOpen(false);
      fetchNotifications();
    } catch (err) {
      console.warn("Create API failed, adding locally", err);
      const newNot: SystemNotification = {
        id: Math.floor(100 + Math.random() * 900),
        title: formData.title,
        message: formData.message,
        eventType: formData.eventType,
        isRead: false,
        createdAt: new Date().toISOString(),
        investorId: formData.investorId ? parseInt(formData.investorId) : undefined,
        investorName: investors.find(i => i.id === formData.investorId)?.name || "All Investors",
        status: formData.status
      };
      setNotifications(prev => [newNot, ...prev]);
      setIsAddOpen(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotification) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${selectedNotification.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error("Failed to update notification");
      setIsEditOpen(false);
      fetchNotifications();
    } catch (err) {
      console.warn("Edit API failed, updating locally", err);
      setNotifications(prev => prev.map(n => n.id === selectedNotification.id ? {
        ...n,
        title: formData.title,
        message: formData.message,
        eventType: formData.eventType,
        investorId: formData.investorId ? parseInt(formData.investorId) : undefined,
        investorName: investors.find(i => i.id === formData.investorId)?.name || "All Investors",
        status: formData.status
      } : n));
      setIsEditOpen(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      fetchNotifications();
    } catch (err) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `Not#${n.id}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesInvestor = investorFilter === "all" || n.investorName === investorFilter;
    return matchesSearch && matchesInvestor;
  });

  const uniqueInvestors = Array.from(new Set(notifications.filter(n => n.investorName).map(n => n.investorName)));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">System &gt; Notifications</span>
          <h2 className="text-2xl font-display font-bold text-slate-900 mt-0.5">System Notifications</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Configure and monitor event-triggered communications.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setFormData({ title: "", message: "", eventType: "ROICredited", investorId: "", status: "Active" });
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-slate-950 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Notification
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Notification ID, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="relative w-full md:w-64">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={investorFilter}
            onChange={(e) => setInvestorFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
          >
            <option value="all">All Investors</option>
            {uniqueInvestors.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={6} rows={3} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Notification ID</th>
                  <th className="px-6 py-4">Event Type</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map(n => (
                    <motion.tr
                      key={n.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:bg-slate-50/50 transition-colors ${!n.isRead ? "font-bold bg-slate-50/30" : ""}`}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">Not#{n.id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{n.eventType}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          n.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="inline-flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md transition-colors"
                          >
                            Read
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedNotification(n);
                            setIsDetailsOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedNotification(n);
                              setFormData({
                                title: n.title,
                                message: n.message,
                                eventType: n.eventType,
                                investorId: n.investorId ? String(n.investorId) : "",
                                status: n.status
                              });
                              setIsEditOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
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

      {/* Add Modal */}
      <BaseModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Configure New Notification">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Message</label>
            <textarea
              required
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Event Type</label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ROICredited">ROICredited</option>
              <option value="Investment Approved">Investment Approved</option>
              <option value="Document Uploaded">Document Uploaded</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Investor</label>
            <select
              value={formData.investorId}
              onChange={(e) => setFormData({ ...formData, investorId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Investors</option>
              {investors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 rounded-xl text-xs font-bold text-white transition-colors"
            >
              Save Notification
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Edit Modal */}
      <BaseModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Notification">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Message</label>
            <textarea
              required
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Event Type</label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ROICredited">ROICredited</option>
              <option value="Investment Approved">Investment Approved</option>
              <option value="Document Uploaded">Document Uploaded</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 rounded-xl text-xs font-bold text-white transition-colors"
            >
              Update Notification
            </button>
          </div>
        </form>
      </BaseModal>

      {/* Details View Modal */}
      <BaseModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="System Notification Details">
        {selectedNotification && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Notification Title</span>
                <h4 className="text-lg font-display font-extrabold text-slate-900">{selectedNotification.title}</h4>
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Message</span>
              <span className="text-sm font-semibold text-slate-800 leading-relaxed block">{selectedNotification.message}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Event Type</span>
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-slate-400" />
                  {selectedNotification.eventType}
                </span>
              </div>
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Created Date</span>
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {new Date(selectedNotification.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </BaseModal>
    </motion.div>
  );
};
