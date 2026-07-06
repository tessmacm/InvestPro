import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { 
  Users, 
  Trash2, 
  Mail, 
  CheckCircle2,
  XCircle,
  X,
  Edit,
  Shield,
  UserCheck,
  Plus,
  Search,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Role } from "../types";
import { cn } from "../lib/utils";
import { DataTable } from "../components/DataTable";
import { API_BASE_URL, authHeaders } from "../config/api";
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

export const AdminPanel = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Toast state
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });

  const isAdminUser = currentUser?.role === "admin";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: authHeaders()
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const getAdminCount = () => {
    return users.filter(u => (u.role === "admin" || u.role === "superadmin") && u.status === "active").length;
  };

  const isUserOnlyAdmin = (userId: string) => {
    const target = users.find(u => String(u.id) === String(userId));
    if (!target) return false;
    const isTargetAdmin = target.role === "admin" || target.role === "superadmin";
    return isTargetAdmin && getAdminCount() <= 1;
  };

  const updateRole = async (userId: string, newRole: Role) => {
    if (!isAdminUser) {
      showToast("error", "Only admins can modify roles.");
      return;
    }
    
    // Last admin protection
    const changingFromAdmin = !("admin" === newRole || "superadmin" === newRole);
    if (changingFromAdmin && isUserOnlyAdmin(userId)) {
      showToast("error", "Cannot demote the only remaining active Administrator.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/role`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        setUsers(users.map(u => String(u.id) === String(userId) ? { ...u, role: newRole } : u));
        showToast("success", "User role updated successfully!");
      } else {
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        showToast("error", data.message || data.Message || "Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update role", error);
      showToast("error", "Failed to update role");
    }
  };

  const updateStatus = async (userId: string, newStatus: "active" | "inactive") => {
    if (!isAdminUser) {
      showToast("error", "Only admins can modify status.");
      return;
    }

    // Last admin protection
    if (newStatus === "inactive" && isUserOnlyAdmin(userId)) {
      showToast("error", "Cannot deactivate the only remaining active Administrator.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setUsers(users.map(u => String(u.id) === String(userId) ? { ...u, status: newStatus } : u));
        showToast("success", "User status updated successfully!");
      } else {
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        showToast("error", data.message || data.Message || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status", error);
      showToast("error", "Failed to update status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdminUser) {
      showToast("error", "Only admins can delete users.");
      return;
    }

    // Last admin protection
    if (isUserOnlyAdmin(userId)) {
      showToast("error", "Cannot delete the only remaining active Administrator.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (response.ok) {
        setUsers(users.filter(u => String(u.id) !== String(userId)));
        setDeleteConfirmId(null);
        showToast("success", "User deleted successfully.");
      } else {
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        showToast("error", data.message || data.Message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user", error);
      showToast("error", "Failed to delete user");
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      showToast("error", "First name, last name and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role: "manager" // default manager role
      };

      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        const errData = text ? JSON.parse(text) : {};
        let errMsg = errData.message || errData.Message || "API error occurred";
        if (errData.errors && Array.isArray(errData.errors)) {
          errMsg += ": " + errData.errors.join(", ");
        } else if (errData.Errors && Array.isArray(errData.Errors)) {
          errMsg += ": " + errData.Errors.join(", ");
        }
        throw new Error(errMsg);
      }

      showToast("success", "User created successfully!");
      setIsModalOpen(false);
      fetchUsers(); // Refresh complete list
    } catch (error: any) {
      showToast("error", error.message || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: ""
    });
    setIsModalOpen(true);
  };

  const columns = [
    {
      header: "User",
      render: (u: User) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
              alt={u.name}
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="font-bold text-slate-900">{u.name}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {u.email}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Status Switcher",
      align: "center" as const,
      render: (u: User) => {
        const isSystemAdmin = u.email === "admin@investpro.com" || u.name === "System Admin";
        if (isSystemAdmin) {
          return (
            <div className="flex justify-center select-none">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-extrabold ring-1 ring-emerald-600/10">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
          );
        }

        const userStatus = u.status || "active";

        if (isAdminUser) {
          return (
            <div className="flex justify-center">
              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => updateStatus(u.id, "active")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all duration-250 cursor-pointer",
                    userStatus === "active" 
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(u.id, "inactive")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all duration-250 cursor-pointer",
                    userStatus === "inactive" 
                      ? "bg-rose-600 text-white shadow-md shadow-rose-500/10" 
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Inactive
                </button>
              </div>
            </div>
          );
        }

        // Standard non-interactive badge for non-admins
        return (
          <div className="flex justify-center select-none">
            {userStatus === "active" ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold">
                <XCircle className="w-3.5 h-3.5" />
                Inactive
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Role Switcher",
      render: (u: User) => {
        const isSystemAdmin = u.email === "admin@investpro.com" || u.name === "System Admin";
        if (isSystemAdmin) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold ring-1 ring-inset capitalize text-amber-700 bg-amber-50 ring-amber-600/20 select-none">
              🛡️ System Admin
            </span>
          );
        }

        if (isAdminUser) {
          return (
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => updateRole(u.id, "admin")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-250 cursor-pointer",
                  (u.role === "admin" || u.role === "superadmin")
                    ? "bg-amber-600 text-white shadow-md shadow-amber-500/10" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => updateRole(u.id, "manager")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-250 cursor-pointer",
                  u.role === "manager" 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Manager
              </button>
            </div>
          );
        }

        // Standard static role indicator for non-admins
        return (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ring-1 ring-inset capitalize select-none",
            u.role === 'admin' ? "text-amber-700 bg-amber-50/50 ring-amber-600/10" :
            u.role === 'manager' ? "text-blue-700 bg-blue-50/50 ring-blue-600/10" :
            u.role === 'investor' ? "text-purple-700 bg-purple-50/50 ring-purple-600/10" :
            "text-slate-600 bg-slate-50 ring-slate-600/10"
          )}>
            {u.role}
          </span>
        );
      }
    },
    {
      header: "Actions",
      align: "right" as const,
      render: (u: User) => {
        const isSystemAdmin = u.email === "admin@investpro.com" || u.name === "System Admin";
        if (isSystemAdmin) {
          return (
            <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-400 italic pr-3 select-none">
              Locked
            </div>
          );
        }

        if (!isAdminUser) {
          return (
            <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-400 italic pr-3 select-none">
              Read-Only
            </div>
          );
        }

        // Double-click confirmation state
        if (deleteConfirmId === u.id) {
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleDeleteUser(u.id)}
                className="py-1 px-2.5 bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg shadow-sm hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
                title="Click to confirm deletion"
              >
                Delete Now
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                title="Cancel deletion"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1">
            <button 
              onClick={() => setDeleteConfirmId(u.id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
              title="Delete User"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>
        );
      }
    }
  ];

  const filteredUsers = users.filter(user => 
    user.role !== "investor" && user.role !== "client" && (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Derived stats
  const displayUsers = users.filter(u => u.role !== "investor" && u.role !== "client");
  const totalUsersCount = displayUsers.length;
  const activeUsersCount = displayUsers.filter(u => u.status === "active").length;
  const adminUsersCount = displayUsers.filter(u => u.role === "admin" || u.role === "superadmin").length;
  const managerUsersCount = displayUsers.filter(u => u.role === "manager").length;

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div variants={item}>
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">System &gt; User Management</span>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 mt-0.5">User Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage platform roles, permissions and account statuses.</p>
        </motion.div>
        {isAdminUser && (
          <motion.button
            variants={item}
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/10 cursor-pointer active:scale-[0.98] transition-transform flex-shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add New User
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
            {/* Total Users */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Total Users</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{totalUsersCount}</span>
                </div>
              </div>
            </div>

            {/* Active Users */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Active Users</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{activeUsersCount}</span>
                </div>
              </div>
            </div>

            {/* Admin Users */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Admins</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{adminUsersCount}</span>
                </div>
              </div>
            </div>

            {/* Manager Users */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Managers</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{managerUsersCount}</span>
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
                placeholder="Search users by name or email..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-xl transition-all text-sm font-semibold"
              />
            </div>
          </div>

          <DataTable 
            columns={columns}
            data={filteredUsers}
            emptyMessage="No users found"
            emptyIcon={<Users className="w-8 h-8 text-slate-300" />}
          />
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 shadow-2xl relative z-10 w-full max-w-md border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-xl font-display font-extrabold text-slate-900">
                  Add New User
                </h3>
              </div>

              <form onSubmit={handleSaveUser} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest pl-1 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-900"
                    placeholder="e.g. John"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest pl-1 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-900"
                    placeholder="e.g. Doe"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest pl-1 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-slate-900"
                    placeholder="e.g. names@investpro.com"
                    disabled={submitting}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()}
                    className={cn(
                      "flex-1 px-4 py-3 text-white font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2",
                      (submitting || !formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim())
                        ? "bg-slate-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/15"
                    )}
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add User"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Notification Top Right */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toast && (
          <div className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 pointer-events-auto ${
              toast.type === "success" 
                ? "bg-emerald-50/95 border-emerald-100/80 text-emerald-800" 
                : "bg-rose-50/95 border-rose-100/80 text-rose-800"
            }`}>
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
