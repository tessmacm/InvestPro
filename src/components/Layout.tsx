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
  Loader2
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { API_BASE_URL } from "../config/api";

export const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

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
    { name: "ROI", path: "/roi", icon: TrendingUp, roles: ["admin", "manager", "investor"] },
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

        {/* Logout Section */}
        <div className="px-3 py-4 flex-shrink-0">
          <div className="h-px bg-white/5 w-full mb-4 mx-3" />
          

          <button 
            onClick={handleLogout}
            className="flex items-center w-full h-12 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all font-medium group"
          >
            <div className="w-14 h-12 flex-shrink-0 flex items-center justify-center">
              <LogOut className="w-5 h-5 group-hover:translate-x-0.5" />
            </div>
            <AnimatePresence mode="wait">
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  className="text-sm"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 rounded-xl transition-all shadow-sm active:scale-95"
            >
              {isSidebarOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
            </button>
            <h2 className="text-xl font-display font-bold text-slate-800 hidden sm:block">
              {menuItems.find(m => m.path === location.pathname)?.name || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">{user?.role}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-white border-2 border-slate-100 shadow-sm overflow-hidden p-0.5">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} 
                  alt="Avatar"
                  className="rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

