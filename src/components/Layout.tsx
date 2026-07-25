import { ReactNode, useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { logout } from "../store/authSlice";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X,
  Users,
  FileText,
  Folder,
  Download,
  Landmark,
  TrendingUp,
  Bell,
  Loader2,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { API_BASE_URL, authHeaders } from "../config/api";
import { AgreementModal } from "./AgreementModal";

export const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingAgreementDoc, setPendingAgreementDoc] = useState<any | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const checkInvestorAgreement = async () => {
    const role = user?.role?.toLowerCase();
    if (role === "investor" || role === "client") {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/documents`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const docs = await res.json();
          if (Array.isArray(docs)) {
            const pending = docs.find(
              (d: any) =>
                (d.type === "Agreement" || d.title?.toLowerCase().includes("agreement")) &&
                d.status === "Pending Signature"
            );
            setPendingAgreementDoc(pending || null);
          }
        }
      } catch (err) {
        console.error("Failed to check agreement status", err);
      }
    } else {
      setPendingAgreementDoc(null);
    }
  };

  useEffect(() => {
    checkInvestorAgreement();
  }, [user, location.pathname]);

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar on mobile after navigation
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "investor"] },
    { name: "Admin Panel", path: "/admin", icon: ShieldCheck, roles: ["admin"] },
    { name: "Investors", path: "/investors", icon: Users, roles: ["admin", "manager"] },
    { name: "Projects", path: "/projects", icon: Folder, roles: ["admin", "manager"] },
    { name: "Documents", path: "/documents", icon: FileText, roles: ["admin", "manager", "investor"] },
    { name: "Payments", path: "/payments", icon: Landmark, roles: ["admin", "manager", "investor"] },
    { name: "Notifications", path: "/notifications", icon: Bell, roles: ["admin", "manager", "investor"] },
    { name: "Reports", path: "/reports", icon: Download, roles: ["admin", "manager", "investor"] },
  ];

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    } catch (e) {
      console.error("Logout API request failed", e);
    }
    dispatch(logout());
    navigate("/login");
  };

  const sidebarWidth = isSidebarOpen ? 280 : (isMobile ? 0 : 80);

  if (isLoggingOut) {
    return (
      <div className="min-h-screen relative flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat overflow-hidden font-sans w-full">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full max-w-[460px] mx-auto text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md py-12 px-10 shadow-2xl rounded-[32px] border border-white/20 flex flex-col items-center space-y-6"
          >
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-800">Getting things ready…</h2>
              <p className="text-sm text-slate-500 mt-1">Please wait while we set up your experience.</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarWidth,
          x: isMobile && !isSidebarOpen ? -280 : 0
        }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className={cn(
          "bg-slate-900 text-slate-300 flex-shrink-0 z-50 flex flex-col h-full overflow-hidden",
          isMobile ? "fixed inset-y-0 left-0 w-[280px]" : "relative"
        )}
      >
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-display font-bold text-xl text-white truncate"
                >
                  InvestPro
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.filter(item => user && item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "group flex items-center h-12 rounded-xl transition-all relative overflow-hidden",
                  isActive 
                    ? "bg-blue-600/10 text-blue-400" 
                    : "hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="w-14 h-12 flex-shrink-0 flex items-center justify-center">
                  <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "text-blue-400" : "text-slate-400 group-hover:scale-110")} />
                </div>
                
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Copyright */}
        <div className="px-6 py-4 flex-shrink-0 border-t border-white/5 text-center">
          <AnimatePresence mode="wait">
            {isSidebarOpen ? (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px] text-slate-500 font-medium leading-relaxed"
              >
                © 2026 InvestPro Platform.<br />All rights reserved.
              </motion.p>
            ) : (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-slate-500 font-bold"
              >
                © 2026
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              {isSidebarOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <button 
                onClick={() => navigate(-1)}
                title="Go Back"
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-xl font-display font-bold text-slate-900">
                {menuItems.find(m => m.path === location.pathname)?.name || "Dashboard"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{user?.role}</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-white border-2 border-slate-100 shadow-sm overflow-hidden p-0.5">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} 
                    alt="Avatar"
                    className="rounded-xl w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProfileMenuOpen(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 divide-y divide-slate-100"
                    >
                      <div className="p-3">
                        <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 rounded-full">
                          {user?.role} Access
                        </span>
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-3 w-full p-2.5 rounded-xl text-red-600 hover:bg-red-50 font-bold text-sm transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
          <Outlet />
        </div>
      </div>

      {pendingAgreementDoc && (
        <AgreementModal
          isOpen={!!pendingAgreementDoc}
          documentId={pendingAgreementDoc.id}
          investorName={user?.name || "Investor"}
          investorEmail={user?.email || ""}
          projectName="Current Operations"
          onSignedSuccessfully={() => {
            setPendingAgreementDoc(null);
            checkInvestorAgreement();
          }}
        />
      )}
    </div>
  );
};

