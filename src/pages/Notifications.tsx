import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { SystemNotification, Investor } from "../types";
import { BaseModal } from "../components/BaseModal";
import { API_BASE_URL, authHeaders } from "../config/api";
import { TableSkeleton } from "../components/TableSkeleton";
import {
  Search, Filter, Eye, Edit2, Plus, Bell, Calendar, Tag, CheckCircle,
  AlertCircle, X, ChevronLeft, ChevronRight, Users, Clock, MessageSquare,
  Mail, MailOpen, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PAGE_SIZE = 10;
const EVENT_TYPES = ["ROICredited", "Investment Approved", "Document Uploaded", "Account Created", "Payment Received"];

const timeAgo = (dateStr: string) => {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

type ToastData = { show: boolean; title: string; message: string; type: "success" | "error" | "info" };

export const Notifications = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === "admin" || user?.role === "manager";
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [investorFilter, setInvestorFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [toast, setToast] = useState<ToastData>({ show: false, title: "", message: "", type: "info" });

  const showToast = useCallback((title: string, message: string, type: ToastData["type"]) => {
    setToast({ show: true, title, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  }, []);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    eventType: "Investment Approved",
    investorId: "",
    targetInvestorIds: "",
    status: "Active"
  });

  const [formErrors, setFormErrors] = useState<{ title?: string; message?: string }>({});

  const validateForm = () => {
    const errors: { title?: string; message?: string } = {};
    if (!formData.title.trim()) errors.title = "Title is required";
    else if (formData.title.length > 100) errors.title = "Title must be under 100 characters";
    if (!formData.message.trim()) errors.message = "Message is required";
    else if (formData.message.length > 500) errors.message = "Message must be under 500 characters";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: authHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.warn("Failed to fetch notifications, using mock fallback", err);
      setNotifications([
        { id: 123, title: "ROI Yield Credited", message: "Monthly ROI payment of $1,250 has been credited to your account.", eventType: "ROICredited", isRead: false, createdAt: "2026-06-28T12:00:00Z", investorId: 1, investorName: "John Doe", status: "Active" },
        { id: 124, title: "New Investment Received", message: "A new investment of $50,000 has been processed successfully.", eventType: "Payment Received", isRead: false, createdAt: "2026-06-27T15:30:00Z", investorName: "All Investors", status: "Active" },
        { id: 125, title: "Document Approved", message: "Your onboarding agreement has been verified and approved by the compliance team.", eventType: "Investment Approved", isRead: true, createdAt: "2026-06-26T09:30:00Z", investorId: 2, investorName: "ABC Ventures Ltd.", status: "Active" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/investors`, {
        headers: authHeaders()
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
    if (!validateForm()) return;
    try {
      const payload = {
        title: formData.title,
        message: formData.message,
        eventType: formData.eventType,
        investorId: formData.investorId ? parseInt(formData.investorId) : null,
        targetInvestorIds: formData.targetInvestorIds || null,
        status: formData.status
      };

      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to add notification");
      setIsAddOpen(false);
      setFormData({ title: "", message: "", eventType: "Investment Approved", investorId: "", targetInvestorIds: "", status: "Active" });
      showToast("Notification Created", "The notification has been sent successfully.", "success");
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
        targetInvestorIds: formData.targetInvestorIds || undefined,
        investorName: formData.targetInvestorIds
          ? investors.filter(i => formData.targetInvestorIds.split(",").includes(String(i.id))).map(i => i.name).join(", ")
          : (investors.find(i => i.id === formData.investorId)?.name || "All Investors"),
        status: formData.status
      };
      setNotifications(prev => [newNot, ...prev]);
      setIsAddOpen(false);
      setFormData({ title: "", message: "", eventType: "Investment Approved", investorId: "", targetInvestorIds: "", status: "Active" });
      showToast("Notification Created", "The notification has been added locally.", "info");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotification || !validateForm()) return;

    try {
      const payload = {
        id: selectedNotification.id,
        title: formData.title,
        message: formData.message,
        eventType: formData.eventType,
        investorId: formData.investorId ? parseInt(formData.investorId) : null,
        targetInvestorIds: formData.targetInvestorIds || null,
        status: formData.status
      };

      const response = await fetch(`${API_BASE_URL}/api/notifications/${selectedNotification.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to update notification");
      setIsEditOpen(false);
      setSelectedNotification(null);
      showToast("Notification Updated", "Changes have been saved successfully.", "success");
      fetchNotifications();
    } catch (err) {
      console.warn("Edit API failed, updating locally", err);
      setNotifications(prev => prev.map(n => n.id === selectedNotification.id ? {
        ...n,
        title: formData.title,
        message: formData.message,
        eventType: formData.eventType,
        investorId: formData.investorId ? parseInt(formData.investorId) : undefined,
        targetInvestorIds: formData.targetInvestorIds || undefined,
        investorName: formData.targetInvestorIds
          ? investors.filter(i => formData.targetInvestorIds.split(",").includes(String(i.id))).map(i => i.name).join(", ")
          : (investors.find(i => i.id === formData.investorId)?.name || "All Investors"),
        status: formData.status
      } : n));
      setIsEditOpen(false);
      setSelectedNotification(null);
      showToast("Notification Updated", "Changes saved locally.", "info");
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeaders()
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) {
      showToast("All Read", "No unread notifications to mark.", "info");
      return;
    }
    await Promise.allSettled(unreadIds.map(id => handleMarkAsRead(id)));
    showToast("Marked All as Read", `${unreadIds.length} notification(s) marked as read.`, "success");
  };

  const resetAddForm = () => {
    setFormData({ title: "", message: "", eventType: "Investment Approved", investorId: "", targetInvestorIds: "", status: "Active" });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const openEditForm = (n: SystemNotification) => {
    setSelectedNotification(n);
    setFormData({
      title: n.title,
      message: n.message,
      eventType: n.eventType,
      investorId: n.investorId ? String(n.investorId) : "",
      targetInvestorIds: n.targetInvestorIds || "",
      status: n.status
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const openDetails = (n: SystemNotification) => {
    setSelectedNotification(n);
    setIsDetailsOpen(true);
    if (!n.isRead) handleMarkAsRead(n.id);
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `Not#${n.id}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesInvestor = investorFilter === "all" || n.investorName === investorFilter;
      return matchesSearch && matchesInvestor;
    });
  }, [notifications, searchTerm, investorFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paginatedNotifications = filteredNotifications.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, investorFilter]);

  const uniqueInvestors = useMemo(
    () => Array.from(new Set(notifications.filter(n => n.investorName).map(n => n.investorName))),
    [notifications]
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">System Notifications</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Configure and monitor event-triggered communications.</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <MailOpen className="w-4 h-4" />
              Mark All Read ({unreadCount})
            </button>
          )}
          {isAdmin && (
            <button
              onClick={resetAddForm}
              className="inline-flex items-center gap-2 bg-slate-950 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Notification
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, type, message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="relative w-full md:w-64">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={investorFilter}
            onChange={(e) => setInvestorFilter(e.target.value)}
            className="w-full pl-10 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
          >
            <option value="all">All Investors</option>
            {uniqueInvestors.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={6} rows={3} />
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-display font-bold text-slate-900">No notifications found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchTerm || investorFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "No notifications have been created yet."}
          </p>
          {isAdmin && !searchTerm && investorFilter === "all" && (
            <button
              onClick={resetAddForm}
              className="mt-4 inline-flex items-center gap-2 bg-slate-950 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Notification
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4 w-8"></th>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4 hidden md:table-cell">Event Type</th>
                    <th className="px-6 py-4 hidden md:table-cell">Investor</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 hidden sm:table-cell">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  <AnimatePresence mode="popLayout">
                    {paginatedNotifications.map(n => (
                      <motion.tr
                        key={n.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`transition-colors cursor-pointer ${
                          !n.isRead ? "bg-blue-50/40 hover:bg-blue-50/70" : "hover:bg-slate-50/50"
                        }`}
                        onClick={() => openDetails(n)}
                      >
                        <td className="px-6 py-4">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                            n.isRead ? "bg-slate-200" : "bg-blue-500"
                          }`} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`text-sm ${!n.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                              {n.title}
                            </span>
                            <span className="text-xs text-slate-400 truncate max-w-xs mt-0.5">{n.message}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            <Tag className="w-3 h-3" />
                            {n.eventType}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {n.investorName || "All Investors"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" />
                            {timeAgo(n.createdAt)}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            n.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {n.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => openDetails(n)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">View</span>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => openEditForm(n)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Edit notification"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                            )}
                            {!n.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="inline-flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-md transition-colors"
                                title="Mark as read"
                              >
                                <MailOpen className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-xs text-slate-500 font-medium">
                Showing {safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, filteredNotifications.length)} of {filteredNotifications.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      i === safePage
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <BaseModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Configure New Notification" description="Create a new system notification for investors.">
        <form onSubmit={handleAddSubmit} className="space-y-4 p-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Title <span className="text-rose-400">*</span>
              <span className="font-normal normal-case text-slate-400 ml-1">({formData.title.length}/100)</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setFormErrors(prev => ({ ...prev, title: undefined })); }}
              className={`w-full px-4 py-3 bg-white hover:bg-slate-50 border focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all ${
                formErrors.title ? "border-rose-300 bg-rose-50/50 focus:ring-rose-100/50" : "border-slate-200 focus:border-blue-500"
              }`}
            />
            {formErrors.title && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.title}</p>}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Message <span className="text-rose-400">*</span>
              <span className="font-normal normal-case text-slate-400 ml-1">({formData.message.length}/500)</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={500}
              value={formData.message}
              onChange={(e) => { setFormData({ ...formData, message: e.target.value }); setFormErrors(prev => ({ ...prev, message: undefined })); }}
              className={`w-full px-4 py-3 bg-white hover:bg-slate-50 border focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all resize-none ${
                formErrors.message ? "border-rose-300 bg-rose-50/50 focus:ring-rose-100/50" : "border-slate-200 focus:border-blue-500"
              }`}
            />
            {formErrors.message && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Event Type</label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-700 pointer-events-auto cursor-pointer focus:ring-4 focus:ring-blue-100/50"
              >
                {EVENT_TYPES.map(et => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-700 pointer-events-auto cursor-pointer focus:ring-4 focus:ring-blue-100/50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Target Recipients</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!formData.investorId && !formData.targetInvestorIds}
                  onChange={() => setFormData({ ...formData, investorId: "", targetInvestorIds: "" })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>All Investors</span>
              </label>
              <div className="border-t border-slate-200 my-1"></div>
              {investors.map(i => {
                const isChecked = formData.investorId === String(i.id) || formData.targetInvestorIds.split(",").includes(String(i.id));
                return (
                  <label key={i.id} className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        let newTargetIds = formData.targetInvestorIds.split(",").filter(Boolean);
                        if (formData.investorId) {
                          newTargetIds.push(formData.investorId);
                        }
                        
                        if (e.target.checked) {
                          if (!newTargetIds.includes(String(i.id))) {
                            newTargetIds.push(String(i.id));
                          }
                        } else {
                          newTargetIds = newTargetIds.filter(id => id !== String(i.id));
                        }
                        
                        if (newTargetIds.length === 0) {
                          setFormData({ ...formData, investorId: "", targetInvestorIds: "" });
                        } else if (newTargetIds.length === 1) {
                          setFormData({ ...formData, investorId: newTargetIds[0], targetInvestorIds: "" });
                        } else {
                          setFormData({ ...formData, investorId: "", targetInvestorIds: "," + newTargetIds.join(",") + "," });
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
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 cursor-pointer transition-all active:scale-95 shadow-lg shadow-blue-100"
            >
              Send Notification
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Notification" description="Update the selected notification.">
        <form onSubmit={handleEditSubmit} className="space-y-4 p-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Title <span className="text-rose-400">*</span>
              <span className="font-normal normal-case text-slate-400 ml-1">({formData.title.length}/100)</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setFormErrors(prev => ({ ...prev, title: undefined })); }}
              className={`w-full px-4 py-3 bg-white hover:bg-slate-50 border focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all ${
                formErrors.title ? "border-rose-300 bg-rose-50/50 focus:ring-rose-100/50" : "border-slate-200 focus:border-blue-500"
              }`}
            />
            {formErrors.title && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.title}</p>}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Message <span className="text-rose-400">*</span>
              <span className="font-normal normal-case text-slate-400 ml-1">({formData.message.length}/500)</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={500}
              value={formData.message}
              onChange={(e) => { setFormData({ ...formData, message: e.target.value }); setFormErrors(prev => ({ ...prev, message: undefined })); }}
              className={`w-full px-4 py-3 bg-white hover:bg-slate-50 border focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all resize-none ${
                formErrors.message ? "border-rose-300 bg-rose-50/50 focus:ring-rose-100/50" : "border-slate-200 focus:border-blue-500"
              }`}
            />
            {formErrors.message && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Event Type</label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-700 pointer-events-auto cursor-pointer focus:ring-4 focus:ring-blue-100/50"
              >
                {EVENT_TYPES.map(et => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-700 pointer-events-auto cursor-pointer focus:ring-4 focus:ring-blue-100/50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Target Recipients</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!formData.investorId && !formData.targetInvestorIds}
                  onChange={() => setFormData({ ...formData, investorId: "", targetInvestorIds: "" })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>All Investors</span>
              </label>
              <div className="border-t border-slate-200 my-1"></div>
              {investors.map(i => {
                const isChecked = formData.investorId === String(i.id) || formData.targetInvestorIds.split(",").includes(String(i.id));
                return (
                  <label key={i.id} className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        let newTargetIds = formData.targetInvestorIds.split(",").filter(Boolean);
                        if (formData.investorId) {
                          newTargetIds.push(formData.investorId);
                        }
                        
                        if (e.target.checked) {
                          if (!newTargetIds.includes(String(i.id))) {
                            newTargetIds.push(String(i.id));
                          }
                        } else {
                          newTargetIds = newTargetIds.filter(id => id !== String(i.id));
                        }
                        
                        if (newTargetIds.length === 0) {
                          setFormData({ ...formData, investorId: "", targetInvestorIds: "" });
                        } else if (newTargetIds.length === 1) {
                          setFormData({ ...formData, investorId: newTargetIds[0], targetInvestorIds: "" });
                        } else {
                          setFormData({ ...formData, investorId: "", targetInvestorIds: "," + newTargetIds.join(",") + "," });
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
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 cursor-pointer transition-all active:scale-95 shadow-lg shadow-blue-100"
            >
              Update Notification
            </button>
          </div>
        </form>
      </BaseModal>

      <BaseModal
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedNotification(null); }}
        title="System Notification Details"
        size="lg"
      >
        {selectedNotification && (
          <div className="space-y-0">
            <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  selectedNotification.isRead ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-600"
                }`}>
                  {selectedNotification.isRead ? <MailOpen className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      selectedNotification.isRead ? "bg-slate-300" : "bg-blue-500"
                    }`} />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {selectedNotification.isRead ? "Read" : "Unread"}
                    </span>
                  </div>
                  <h4 className="text-xl font-display font-extrabold text-slate-900 break-words">{selectedNotification.title}</h4>
                  {selectedNotification.investorName && (
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {selectedNotification.investorName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message
                </span>
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">{selectedNotification.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Event Type</span>
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                    {selectedNotification.eventType}
                  </span>
                </div>
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Created</span>
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    {new Date(selectedNotification.createdAt).toLocaleDateString(undefined, {
                      day: "2-digit", month: "short", year: "numeric"
                    })}
                  </span>
                </div>
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold mt-0.5 ${
                    selectedNotification.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {selectedNotification.status}
                  </span>
                </div>
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">ID</span>
                  <span className="text-sm font-bold text-slate-700 font-mono">Not#{selectedNotification.id}</span>
                </div>
              </div>

              {selectedNotification.investorName && selectedNotification.investorName !== "All Investors" && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Recipient</span>
                  <div className="flex items-center gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                    <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-sm font-bold shrink-0">
                      {selectedNotification.investorName.split(/[,\s]+/).map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{selectedNotification.investorName}</p>
                      <p className="text-xs text-slate-500">Targeted notification recipient</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
              {!selectedNotification.isRead && (
                <button
                  onClick={() => { handleMarkAsRead(selectedNotification.id); showToast("Marked as Read", "Notification marked as read.", "success"); }}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Mark as Read
                </button>
              )}
              <button
                onClick={() => { setIsDetailsOpen(false); setSelectedNotification(null); }}
                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-[100] flex items-start gap-3 p-4 rounded-2xl border shadow-lg max-w-sm ${
              toast.type === "success" ? "bg-emerald-50 border-emerald-100" :
              toast.type === "error" ? "bg-rose-50 border-rose-100" :
              "bg-indigo-50 border-indigo-100"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {toast.type === "info" && <CheckCircle className="w-5 h-5 text-indigo-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 leading-tight">{toast.title}</p>
              <p className="text-xs text-slate-600 mt-0.5 leading-normal">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="p-0.5 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};