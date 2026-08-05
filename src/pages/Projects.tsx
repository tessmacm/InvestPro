import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { Project } from "../types";
import { BaseModal } from "../components/BaseModal";
import { cn } from "../lib/utils";
import { TableSkeleton, StatCardSkeleton } from "../components/TableSkeleton";
import { motion, AnimatePresence } from "motion/react";
import {
  Folder,
  Plus,
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  MoreVertical,
  X,
  History,
  Lightbulb,
  Check
} from "lucide-react";
import { API_BASE_URL, authHeaders } from "../config/api";

export const Projects = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isGuest = user?.role === "client" || user?.role === "investor";

  // Views state: 'list' | 'add' | 'details' | 'edit'
  const [viewState, setViewState] = useState<"list" | "add" | "details" | "edit">("list");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    duration: "",
    start_date: "",
    end_date: "",
    comments: "",
    status: "active" as "active" | "inactive"
  });

  // Filter/Search search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "InvestPro Mobile App",
    "Payment Gateway Integration",
    "CRM System Development"
  ]);
  const [suggestedSearchItems] = useState<string[]>([
    "Investor Dashboard Redesign",
    "Marketing Automation Tool",
    "Data Analytics Platform"
  ]);

  // Modals state
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);
  const [projectToToggle, setProjectToToggle] = useState<Project | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Toast / notification state
  const [toast, setToast] = useState<{ show: boolean; title: string; message: string; type: "success" | "error" | "info" }>({
    show: false,
    title: "",
    message: "",
    type: "success"
  });

  // Details Tabs: 'overview' | 'timeline' | 'activity'
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "timeline" | "activity">("overview");

  // Options dropdown state for individual items in list
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<"create" | "update">("create");

  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Auto close search popover click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch projects from server
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: authHeaders()
      });
      if (!response.ok) {
        throw new Error("Failed to load projects from Server API");
      }
      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Show Toast helper
  const showToast = (title: string, message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, title, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Duration Calculator helper
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        setFormData(prev => ({ ...prev, duration: `${diffDays} Days` }));
      }
    }
  }, [formData.start_date, formData.end_date]);

  // Search Filter / Reset
  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCurrentPage(1);
    showToast("Filters Cleared", "The projects list filters have been reset.", "info");
  };

  // Add search term to history
  const handleSelectSearchTerm = (term: string) => {
    setSearchQuery(term);
    setIsSearchFocused(false);
    if (!recentSearches.includes(term)) {
      setRecentSearches(prev => [term, ...prev.slice(0, 4)]);
    }
    setCurrentPage(1);
  };

  // Submit Add Project Prompt
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showToast("Access Denied", "Guests are not authorized to create projects.", "error");
      return;
    }

    if (!formData.title || !formData.description || !formData.budget || !formData.duration || !formData.start_date || !formData.end_date) {
      showToast("Validation Error", "Please fill in all mandatory fields.", "error");
      return;
    }

    setPendingActionType("create");
    setIsSaveConfirmModalOpen(true);
  };

  const executeAddProject = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          budget: parseFloat(formData.budget),
          duration: formData.duration,
          start_date: formatInputDate(formData.start_date),
          end_date: formatInputDate(formData.end_date),
          comments: formData.comments,
          status: formData.status
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to create project");
      }

      const newProject = await response.json();
      setProjects(prev => [newProject, ...prev]);
      showToast("Project Created Successfully!", `The project "${newProject.title}" is now added.`);
      
      resetForm();
      setViewState("list");
    } catch (err: any) {
      showToast("Creation Failed", err.message || "Could not complete project registration.", "error");
    }
  };

  // Submit Update Project Prompt
  const handleUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showToast("Access Denied", "Guests are not authorized to edit projects.", "error");
      return;
    }
    if (!selectedProject) return;

    if (!formData.title || !formData.description || !formData.budget || !formData.duration || !formData.start_date || !formData.end_date) {
      showToast("Validation Error", "Please fill in all mandatory fields.", "error");
      return;
    }

    setPendingActionType("update");
    setIsSaveConfirmModalOpen(true);
  };

  const executeUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          budget: parseFloat(formData.budget),
          duration: formData.duration,
          start_date: formatInputDate(formData.start_date),
          end_date: formatInputDate(formData.end_date),
          comments: formData.comments,
          status: formData.status
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update project database info");
      }

      const updatedProj: Project = {
        ...selectedProject,
        title: formData.title,
        description: formData.description,
        budget: parseFloat(formData.budget),
        duration: formData.duration,
        start_date: formatInputDate(formData.start_date),
        end_date: formatInputDate(formData.end_date),
        comments: formData.comments,
        status: formData.status
      };

      setProjects(prev => prev.map(p => p.id === selectedProject.id ? updatedProj : p));
      setSelectedProject(updatedProj);
      showToast("Update Successful", `"${updatedProj.title}" details updated successfully.`);
      setViewState("details");
    } catch (err: any) {
      showToast("Update Failed", err.message || "Could not save project modifications.", "error");
    }
  };

  // Submit Delete Project
  const handleDeleteConfirm = async () => {
    if (isGuest) {
      showToast("Access Denied", "Guests cannot delete projects.", "error");
      setIsDeleteModalOpen(false);
      return;
    }
    const target = projectToDelete || selectedProject;
    if (!target) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${target.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });

      if (!response.ok) {
        throw new Error("Unable to execute file deletion");
      }

      setProjects(prev => prev.filter(p => p.id !== target.id));
      showToast("Project Deleted", `"${target.title}" has been permanently removed.`);
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
      setSelectedProject(null);
      setViewState("list");
    } catch (err: any) {
      showToast("Delete Failed", err.message || "Server rejected deletion query.", "error");
    }
  };

  // Submit Toggle Status
  const handleToggleStatusConfirm = async () => {
    if (isGuest) {
      showToast("Access Denied", "Guests cannot alter project state.", "error");
      setIsToggleModalOpen(false);
      return;
    }
    if (!projectToToggle) return;

    const nextStatus = projectToToggle.status === "active" ? "inactive" : "active";
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectToToggle.id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        throw new Error("Status update request failed");
      }

      setProjects(prev => prev.map(p => p.id === projectToToggle.id ? { ...p, status: nextStatus } : p));
      
      // If we are currently viewing details for this project, update selectedProject
      if (selectedProject && selectedProject.id === projectToToggle.id) {
        setSelectedProject(prev => prev ? { ...prev, status: nextStatus } : null);
      }

      showToast(
        "Project status updated successfully!",
        `${projectToToggle.title} is now ${nextStatus === "active" ? "Active" : "Inactive"}.`
      );
      setIsToggleModalOpen(false);
      setProjectToToggle(null);
    } catch (err: any) {
      showToast("Toggle Failed", err.message || "Error transmitting status update.", "error");
    }
  };

  // Reset form helper
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      budget: "",
      duration: "",
      start_date: "",
      end_date: "",
      comments: "",
      status: "active"
    });
  };

  // Prep for edit screen
  const handleEditClick = (p: Project) => {
    setSelectedProject(p);
    setFormData({
      title: p.title,
      description: p.description,
      budget: String(p.budget),
      duration: p.duration,
      start_date: parseInputDate(p.start_date),
      end_date: parseInputDate(p.end_date),
      comments: p.comments || "",
      status: p.status
    });
    setViewState("edit");
  };

  // Setup Add View
  const handleAddNewClick = () => {
    resetForm();
    setViewState("add");
  };

  // Format Helper for Input Date picker to match SQLite seeds text "01 May 2024"
  const formatInputDate = (isoString: string): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return isoString;
    }
  };

  // Reverse Helper to translate "01 May 2024" into standard input "yyyy-MM-dd"
  const parseInputDate = (displayString: string): string => {
    if (!displayString) return "";
    try {
      const parts = displayString.split(" ");
      if (parts.length !== 3) return displayString;
      const day = parts[0];
      const months: { [key: string]: string } = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
      };
      const month = months[parts[1]];
      const year = parts[2];
      return `${year}-${month}-${day}`;
    } catch (e) {
      return displayString;
    }
  };

  // Filter projects computed list
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Derived stats
  const totalProjectsCount = projects.length;
  const activeProjectsCount = projects.filter(p => p.status === "active").length;
  const inactiveProjectsCount = projects.filter(p => p.status === "inactive").length;
  const totalCombinedBudget = projects.reduce((acc, current) => acc + current.budget, 0);

  // Pagination bounds
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentShownProjects = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

  return (
    <div className="space-y-6">

      {/* -- TOAST ENGINE LAYOUT -- */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed bottom-6 left-6 z-50 max-w-sm w-full p-4 rounded-2xl shadow-2xl border flex items-start gap-3 text-left font-sans transition-all",
              toast.type === "success" ? "bg-emerald-50 border-emerald-100 text-slate-800" :
              toast.type === "error" ? "bg-rose-50 border-rose-100 text-slate-800" :
              "bg-indigo-50 border-indigo-100 text-slate-800"
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {toast.type === "info" && <CheckCircle className="w-5 h-5 text-indigo-600" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900 leading-tight">{toast.title}</p>
              <p className="text-xs text-slate-600 mt-1 leading-normal">{toast.message}</p>
            </div>
            <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {viewState === "list" && (
        <div className="space-y-6">
          
          {/* Header Title Space */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Projects Portfolio</h1>
              <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
                Monitor active investment projects, funding goals, timelines, and status.
              </p>
            </div>
            {!isGuest && (
              <button
                onClick={handleAddNewClick}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/10 cursor-pointer active:scale-[0.98] transition-transform flex-shrink-0 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add New Project
              </button>
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
            <>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Stat 1: Total Projects */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Folder className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Total Projects</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{totalProjectsCount}</span>
                </div>
                {/* Pills Inside */}
                <div className="flex gap-2 pt-2 text-[10px] font-bold">
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md uppercase">Active {activeProjectsCount}</span>
                  <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md uppercase">Inactive {inactiveProjectsCount}</span>
                </div>
              </div>
            </div>

            {/* Stat 2: Active Projects */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Active Projects</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{activeProjectsCount}</span>
                </div>
              </div>
            </div>

            {/* Stat 3: Inactive Projects */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Inactive Projects</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-3xl font-extrabold text-slate-900">{inactiveProjectsCount}</span>
                </div>
              </div>
            </div>

            {/* Stat 4: Total Budget */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
              <div className="space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Total Budget</span>
                </div>
                <div className="flex items-baseline gap-2 pt-2 justify-between w-full">
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight">${totalCombinedBudget.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Filtering and Interactive Search Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search Input Box with Autocomplete sugerences */}
            <div ref={searchBoxRef} className="relative w-full md:max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search project by title..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 pl-11"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3.5 p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              <AnimatePresence>
                {isSearchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-40 text-left scale-100 origin-top overflow-hidden"
                  >
                    {/* Clear Recent Searched */}
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-2">
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-400" /> Recent Searches
                      </span>
                      <button
                        onClick={() => setRecentSearches([])}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase transition-colors"
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Recent search listed */}
                    <div className="space-y-1">
                      {recentSearches.length === 0 ? (
                        <p className="text-xs text-slate-400 py-1.5 italic font-medium pl-2">No recent search queries.</p>
                      ) : (
                        recentSearches.map((term, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectSearchTerm(term)}
                            className="w-full text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 px-3 py-2 rounded-xl transition-colors flex items-center gap-2"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {term}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Suggested Searches */}
                    <div className="flex items-center justify-between border-t border-slate-50 mt-4 pt-3 pb-2 mb-2">
                      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-slate-400" /> Suggested Projects
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {suggestedSearchItems.map((term, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectSearchTerm(term)}
                          className="w-full text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 px-3 py-2 rounded-xl transition-colors flex items-center gap-2"
                        >
                          <Search className="w-3.5 h-3.5 text-slate-400" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Filter and reset actions */}
            <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-end">
              
              {/* Dropdown status selector */}
              <div className="relative flex-1 md:flex-none">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full md:w-44 pl-3 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-sm font-semibold outline-none transition-all text-slate-700 appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Filter className="absolute right-3.5 top-3.5 w-4 w-4 pointer-events-none text-slate-400" />
              </div>

              {/* Dynamic Clear button */}
              {(searchQuery || statusFilter !== "all") && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-700 font-bold text-sm px-4 py-3 rounded-2xl cursor-pointer transition-colors active:scale-95"
                >
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  Clear
                </button>
              )}

            </div>

          </div>

          {/* Real data table viewport */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-2">
            
            {loading ? (
              <div className="p-20 text-center space-y-3">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                <p className="text-sm text-slate-500 font-bold">Synchronizing database content...</p>
              </div>
            ) : error ? (
              <div className="p-16 text-center space-y-4 max-w-md mx-auto">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">Connection Failed</h3>
                <p className="text-xs text-slate-500 leading-normal font-semibold">{error}</p>
                <button onClick={fetchProjects} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-4 h-4" /> Retry Connection
                </button>
              </div>
            ) : currentShownProjects.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
                  <Folder className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900">No projects found</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium max-w-sm">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "No projects have been created yet."}
                </p>
                {!isGuest && !searchQuery && statusFilter === "all" && (
                  <button
                    onClick={handleAddNewClick}
                    className="mt-4 inline-flex items-center gap-2 bg-slate-950 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Project
                  </button>
                )}
                {(searchQuery || statusFilter !== "all") && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                      <th className="px-6 py-4 w-12 text-center">#</th>
                      <th className="px-6 py-4">Project Title</th>
                      <th className="px-6 py-4">Budget</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4">Start Date</th>
                      <th className="px-6 py-4">End Date</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-semibold">
                    {currentShownProjects.map((p, index) => {
                      const displayIndex = indexOfFirstItem + index + 1;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                          
                          {/* Row index */}
                          <td className="px-6 py-4 font-mono text-slate-400 text-center text-xs">
                            {displayIndex}
                          </td>

                          {/* Title with description summary */}
                          <td className="px-6 py-4 max-w-xs">
                            <button
                              onClick={() => {
                                setSelectedProject(p);
                                setViewState("details");
                              }}
                              className="text-slate-800 hover:text-blue-600 font-extrabold text-left transition-colors cursor-pointer block truncate outline-none"
                            >
                              {p.title}
                            </button>
                            <span className="block text-slate-400 font-medium text-[11px] truncate max-w-[200px] mt-0.5">
                              {p.description}
                            </span>
                          </td>

                          {/* Budget */}
                          <td className="px-6 py-4 text-slate-700 font-bold font-mono">
                            ${p.budget.toLocaleString()}
                          </td>

                          {/* Duration */}
                          <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                            {p.duration || "—"}
                          </td>

                          {/* Start Date */}
                          <td className="px-6 py-4 text-slate-500 font-semibold text-xs whitespace-nowrap">
                            {p.start_date || "—"}
                          </td>

                          {/* End Date */}
                          <td className="px-6 py-4 text-slate-500 font-semibold text-xs whitespace-nowrap">
                            {p.end_date || "—"}
                          </td>

                          {/* Status toggle column layout */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-3">
                              
                              {/* Pill label status */}
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                                p.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                              )}>
                                {p.status || "active"}
                              </span>

                              {/* Toggle switch slider handles change confirmations */}
                              <button
                                disabled={isGuest}
                                onClick={() => {
                                  setProjectToToggle(p);
                                  setIsToggleModalOpen(true);
                                }}
                                className={cn(
                                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-100",
                                  p.status === "active" ? "bg-emerald-500" : "bg-slate-300",
                                  isGuest && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <span className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-250",
                                  p.status === "active" ? "translate-x-6" : "translate-x-1"
                                )} />
                              </button>

                            </div>
                          </td>

                          {/* Actions button arrays */}
                          <td className="px-6 py-4 text-right relative">
                            <div className="flex items-center justify-end gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              
                              <button
                                onClick={() => {
                                  setSelectedProject(p);
                                  setViewState("details");
                                }}
                                title="View Details"
                                className="p-2 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded-xl transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              {!isGuest && (
                                <button
                                  onClick={() => handleEditClick(p)}
                                  title="Edit details"
                                  className="p-2 hover:bg-amber-50 text-amber-600 hover:text-amber-800 rounded-xl transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Footer line */}
            {!loading && !error && filteredProjects.length > 0 && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                <span>
                  Showing <strong className="text-slate-800">{indexOfFirstItem + 1}</strong> to <strong className="text-slate-800">{Math.min(indexOfLastItem, filteredProjects.length)}</strong> of <strong className="text-slate-800">{filteredProjects.length}</strong> projects
                </span>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-slate-600"
                    >
                      &lt;
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border font-bold transition-all",
                          currentPage === i + 1
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg bg-white disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-slate-600"
                    >
                      &gt;
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </>
        )}
      </div>
    )}


      {/* ======================= VIEW B: ADD NEW PROJECT VIEW ======================= */}
      {viewState === "add" && (
        <form onSubmit={handleAddProject} className="space-y-6">
          
          <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setViewState("list")}
              className="p-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer bg-white"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                Projects &gt; Add Project
              </span>
              <h1 className="text-2xl font-display font-bold text-slate-900 mt-0.5">
                Add New Project
              </h1>
            </div>
          </div>

          {/* Form container frame design */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 text-left">
            
            <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-blue-900">Project Information</h3>
                <p className="text-[11px] text-blue-600 mt-0.5 font-semibold">Fill in the details below to add a new project.</p>
            </div>
            {/* Rearranged structured grid sections */}
            <div className="space-y-8">

              {/* Section 1: General Information */}
              <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  1. General Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Project Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Project Title <strong className="text-rose-500">*</strong></label>
                    <input
                      required
                      type="text"
                      placeholder="Enter project title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                    />
                  </div>

                  {/* Status State */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Status State</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 pointer-events-auto cursor-pointer focus:ring-4 focus:ring-blue-100/50"
                    >
                      <option value="active">Active State</option>
                      <option value="inactive">Inactive State</option>
                    </select>
                  </div>

                  {/* Project Description */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex justify-between items-baseline">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Project Description <strong className="text-rose-500">*</strong></label>
                      <span className="text-[11px] font-bold text-slate-400">{formData.description.length} / 500</span>
                    </div>
                    <textarea
                      required
                      maxLength={500}
                      placeholder="Describe project goals and details..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Project Timeline */}
              <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  2. Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Starting Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Starting Date <strong className="text-rose-500">*</strong></label>
                    <input
                      required
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 appearance-none"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">End Date <strong className="text-rose-500">*</strong></label>
                    <input
                      required
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 appearance-none"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Duration <strong className="text-rose-500">*</strong></label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 120 Days"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Budget & Notes */}
              <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  3. Budget & Notes
                </h3>
                <div className="space-y-4">
                  {/* Budget */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Budget ($) <strong className="text-rose-500">*</strong></label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3 bg-slate-100 border border-slate-200/50 rounded-lg text-slate-500 w-6 h-6 flex items-center justify-center font-bold text-xs">$</div>
                      <input
                        required
                        type="number"
                        placeholder="Enter project budget (e.g. 250000)"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  {/* Additional Comments */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-baseline">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Comments</label>
                      <span className="text-[11px] font-bold text-slate-400">{formData.comments.length} / 1000</span>
                    </div>
                    <textarea
                      maxLength={1000}
                      placeholder="Add any additional comments or notes about this project..."
                      value={formData.comments}
                      onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>

            </div></div>

          </div>

          {/* Form Action Controls footer line */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewState("list")}
              className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl cursor-pointer transition-colors active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg cursor-pointer transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </div>

        </form>
      )}


      {/* ======================= VIEW C: PROJECT DETAILS TABBED VIEW ======================= */}
      {viewState === "details" && selectedProject && (
        <div className="space-y-6">
          
          {/* Header row navigation breadcrumbs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewState("list")}
                className="p-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer bg-white"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  Projects &gt; Project Details
                </span>
                <h1 className="text-2xl font-display font-bold text-slate-900 mt-0.5">
                  Project Details
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!isGuest && (
                <button
                  onClick={() => handleEditClick(selectedProject)}
                  className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all border border-blue-100"
                >
                  <Edit2 className="w-4 h-4" /> Edit Project
                </button>
              )}
            </div>
          </div>

          {/* Premium Hero Information Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            
            {/* Left elements */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl shadow-xl flex items-center justify-center flex-shrink-0 text-white shadow-blue-500/10">
                <Folder className="w-8 h-8" />
              </div>
              <div className="space-y-1 text-left">
                <h2 className="text-2xl font-display font-black text-slate-900 leading-tight">{selectedProject.title}</h2>
                <div className="flex items-center gap-2 pt-1">
                  
                  {/* Status Indicator */}
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                    selectedProject.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", selectedProject.status === "active" ? "bg-emerald-600 animate-ping" : "bg-rose-600")} />
                    {selectedProject.status || "active"}
                  </span>

                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">PROJECT-ID: PRJ-{String(selectedProject.id).padStart(3, "0")}</span>
                
                </div>
                <p className="text-sm text-slate-500 max-w-xl font-medium pt-2 leading-relaxed">
                  {selectedProject.description}
                </p>
              </div>
            </div>

            {/* Right Horisontal mini stat arrays card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4 w-full lg:w-auto flex-shrink-0 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
              
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Budget</span>
                <span className="text-base font-extrabold text-blue-600 font-mono">${selectedProject.budget.toLocaleString()}</span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Duration</span>
                <span className="text-base font-extrabold text-slate-800">{selectedProject.duration || "—"}</span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Start Date</span>
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{selectedProject.start_date || "—"}</span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">End Date</span>
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">{selectedProject.end_date || "—"}</span>
              </div>

            </div>

          </div>

          {/* Under Tabs layout bar navigation options */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-2">
            
            {/* Tabs triggers */}
            <div className="flex border-b border-slate-100 pb-1 mt-1 px-4 gap-6">
              
              <button
                onClick={() => setActiveDetailTab("overview")}
                className={cn(
                  "py-3 text-sm font-extrabold transition-all relative outline-none cursor-pointer",
                  activeDetailTab === "overview" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Overview
                {activeDetailTab === "overview" && (
                  <motion.div layoutId="detail-tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveDetailTab("timeline")}
                className={cn(
                  "py-3 text-sm font-extrabold transition-all relative outline-none cursor-pointer",
                  activeDetailTab === "timeline" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Timeline
                {activeDetailTab === "timeline" && (
                  <motion.div layoutId="detail-tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveDetailTab("activity")}
                className={cn(
                  "py-3 text-sm font-extrabold transition-all relative outline-none cursor-pointer",
                  activeDetailTab === "activity" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Activity
                {activeDetailTab === "activity" && (
                  <motion.div layoutId="detail-tab-indicator" className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-full" />
                )}
              </button>

            </div>

            {/* Tabs elements contents */}
            <div className="p-6">
              
              {/* TAB 1: OVERVIEW COMPONENT CONTENT */}
              {activeDetailTab === "overview" && (
                <div className="space-y-6 text-left">
                  
                  {/* Detailed Description */}
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-widest font-extrabold text-slate-400 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-blue-500" /> Project Description
                    </h3>
                    <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-700 font-medium text-sm leading-relaxed">
                      {selectedProject.description}
                    </div>
                  </div>

                  {/* Additional Comments if exist */}
                  <div className="space-y-2">
                    <h3 className="text-xs uppercase tracking-widest font-extrabold text-slate-400 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-500" /> Additional Comments
                    </h3>
                    <div className="p-4 bg-amber-50/20 border border-amber-100/50 rounded-2xl text-slate-700 font-medium text-sm leading-relaxed italic">
                      {selectedProject.comments || "No additional comments or workspace annotations entered."}
                    </div>
                  </div>

                  {/* Complete tabular metadata key-value list */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs uppercase tracking-widest font-extrabold text-slate-400 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" /> Project Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                      
                      <div className="border-b border-slate-50 py-3 flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-bold">Project Title</span>
                        <span className="text-slate-800 font-extrabold">{selectedProject.title}</span>
                      </div>

                      <div className="border-b border-slate-50 py-3 flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-bold">Duration</span>
                        <span className="text-slate-800 font-extrabold">{selectedProject.duration || "—"}</span>
                      </div>

                      <div className="border-b border-slate-50 py-3 flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-bold">Allocated Budget</span>
                        <span className="text-blue-600 font-mono font-black">${selectedProject.budget.toLocaleString()}</span>
                      </div>

                      <div className="border-b border-slate-50 py-3 flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-bold">Onboarding Date</span>
                        <span className="text-slate-800 font-semibold">{selectedProject.start_date || "—"}</span>
                      </div>

                      <div className="border-b border-slate-50 py-3 flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-bold">Status</span>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                          selectedProject.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                        )}>
                          {selectedProject.status || "active"}
                        </span>
                      </div>

                      <div className="border-b border-slate-50 py-3 flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-bold">Completion Date</span>
                        <span className="text-slate-800 font-semibold">{selectedProject.end_date || "—"}</span>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: TIMELINE VERTICAL GRAPH COMPONENT */}
              {activeDetailTab === "timeline" && (
                <div className="space-y-6 text-left max-w-xl mx-auto py-4">
                  
                  <div className="relative border-l-2 border-blue-100 pl-6 ml-4 space-y-8">
                    
                    {/* Node 1 */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-md shadow-blue-500/20" />
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 uppercase">{selectedProject.start_date || "Initiation"}</span>
                        <h4 className="text-sm font-extrabold text-slate-800 mt-1">Project Initiation & Charter Approval</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-normal font-semibold">Project brief verified. Initial SQLite tables schema created and seeded database logs with structural parameters.</p>
                      </div>
                    </div>

                    {/* Node 2 */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-400 border-4 border-white shadow-md" />
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 uppercase">Phase Milestone</span>
                        <h4 className="text-sm font-extrabold text-slate-800 mt-1">Requirements Gathering & UI Mockups</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-normal font-semibold">Gathering investor specific feedback. Standard high-contrast responsive interface elements designed for cross-browser testing.</p>
                      </div>
                    </div>

                    {/* Node 3 */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-md shadow-emerald-500/20" />
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 uppercase">Current Stage</span>
                        <h4 className="text-sm font-extrabold text-slate-800 mt-1">Core Functionality Implementation</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-normal font-semibold">Active React JSX pages configured. Full-stack SQLite database mutations routed via safe Node/Express.js servers.</p>
                      </div>
                    </div>

                    {/* Node 4 */}
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-300 border-4 border-white shadow-sm" />
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 uppercase">{selectedProject.end_date || "Target Date"}</span>
                        <h4 className="text-sm font-extrabold text-slate-800 mt-1">Final Deployment & Verification Review</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-normal font-semibold">Running linter configurations, checking bundler optimization targets and executing deployment sandbox server checks.</p>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 3: ACTIVITY LOGS FEED SECTION */}
              {activeDetailTab === "activity" && (
                <div className="space-y-4 text-left max-w-lg mx-auto py-2">
                  
                  <div className="space-y-4">
                    
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Project data registered and synchronized</p>
                        <span className="text-[10px] text-slate-400 font-mono font-bold block mt-1">Onboarding Initial Day</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <DollarSign className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Budget limit allocation set to <strong className="text-blue-600">${selectedProject.budget.toLocaleString()}</strong></p>
                        <span className="text-[10px] text-slate-400 font-mono font-bold block mt-1">Status: Approved</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Project status changed to <strong className="uppercase">{selectedProject.status}</strong></p>
                        <span className="text-[10px] text-slate-400 font-mono font-bold block mt-1">Triggered via toggled dashboard action</span>
                      </div>
                    </div>

                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      )}


      {/* ======================= VIEW D: EDIT EXISTING PROJECT VIEW ======================= */}
      {viewState === "edit" && selectedProject && (
        <form onSubmit={handleUpdateProject} className="space-y-6">
          
          {/* Header row navigation breadcrumbs */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewState("details")}
                className="p-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer bg-white"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  Projects &gt; Project Details &gt; Edit Project
                </span>
                <h1 className="text-2xl font-display font-bold text-slate-900 mt-0.5">
                  Edit Project
                </h1>
              </div>
            </div>
          </div>

          {/* Edit form contents container */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 text-left">
            
            <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-blue-900">Project Information</h3>
                <p className="text-[11px] text-blue-600 mt-0.5 font-semibold">Update your project details below.</p>
              </div>
              {/* Rearranged structured grid sections */}
            <div className="space-y-8">

              {/* Section 1: General Info */}
              <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  1. General Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Project Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Project Title <strong className="text-rose-500">*</strong></label>
                    <input
                      required
                      type="text"
                      placeholder="Enter project title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                    />
                  </div>

                  {/* Status State */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Status State</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 pointer-events-auto cursor-pointer focus:ring-4 focus:ring-blue-100/50"
                    >
                      <option value="active">Active State</option>
                      <option value="inactive">Inactive State</option>
                    </select>
                  </div>

                  {/* Project Description */}
                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex justify-between items-baseline">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Project Description <strong className="text-rose-500">*</strong></label>
                      <span className="text-[11px] font-bold text-slate-400">{formData.description.length} / 500</span>
                    </div>
                    <textarea
                      required
                      maxLength={500}
                      placeholder="Describe project goals and details..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Project Timeline */}
              <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  2. Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Starting Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Starting Date <strong className="text-rose-500">*</strong></label>
                    <input
                      required
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 appearance-none"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">End Date <strong className="text-rose-500">*</strong></label>
                    <input
                      required
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 appearance-none"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Duration <strong className="text-rose-500">*</strong></label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 120 Days"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Budget & Notes */}
              <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  3. Budget & Notes
                </h3>
                <div className="space-y-4">
                  {/* Budget */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Budget ($) <strong className="text-rose-500">*</strong></label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3 bg-slate-100 border border-slate-200/50 rounded-lg text-slate-500 w-6 h-6 flex items-center justify-center font-bold text-xs">$</div>
                      <input
                        required
                        type="number"
                        placeholder="Enter project budget (e.g. 250000)"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  {/* Additional Comments */}
                  <div className="space-y-1.5 text-left">
                    <div className="flex justify-between items-baseline">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Comments</label>
                      <span className="text-[11px] font-bold text-slate-400">{formData.comments.length} / 1000</span>
                    </div>
                    <textarea
                      maxLength={1000}
                      placeholder="Add any additional comments or notes about this project..."
                      value={formData.comments}
                      onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>

            </div>
            </div>

          </div>

          {/* Form Action Controls footer line */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewState("details")}
              className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl cursor-pointer transition-colors active:scale-95"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg cursor-pointer transition-colors active:scale-95"
              >
                <Edit2 className="w-4 h-4" /> Update Project
              </button>
            </div>
          </div>

        </form>
      )}


      {/* ======================================= OVERLAY MODALS ======================================= */}

      {/* MODAL 1: STATUS TOGGLE CONFIRMATION */}
      {projectToToggle && (
        <BaseModal
          isOpen={isToggleModalOpen}
          onClose={() => {
            setIsToggleModalOpen(false);
            setProjectToToggle(null);
          }}
          title="Change Project Status"
          description={`Are you sure you want to change the status state for ${projectToToggle.title}?`}
          className="max-w-md"
        >
          <div className="p-6 text-left space-y-4">
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs font-semibold text-slate-600 space-y-1.5">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-extrabold pb-1">Current Parameters</span>
              <p>Project: <strong className="text-slate-800">{projectToToggle.title}</strong></p>
              <p>Budget: <strong className="text-slate-800">${projectToToggle.budget.toLocaleString()}</strong></p>
              <p>Changing from: <span className={cn(
                "inline-flex items-center px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ml-1",
                projectToToggle.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              )}>{projectToToggle.status}</span>  to: <span className={cn(
                "inline-flex items-center px-1.5 py-0.2 rounded font-bold uppercase text-[9px]",
                projectToToggle.status === "active" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
              )}>{projectToToggle.status === "active" ? "inactive" : "active"}</span></p>
            </div>

            <p className="text-xs text-slate-500 leading-normal font-medium pt-1">
              Active projects appear normally in standard filter queries and are considered live operations. Inactive projects represent completed or deferred projects.
            </p>

            <div className="flex items-center gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsToggleModalOpen(false);
                  setProjectToToggle(null);
                }}
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatusConfirm}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Yes, Change Status
              </button>
            </div>

          </div>
        </BaseModal>
      )}




      {/* MODAL 3: SAVE/UPDATE CONFIRMATION */}
      <BaseModal
        isOpen={isSaveConfirmModalOpen}
        onClose={() => setIsSaveConfirmModalOpen(false)}
        title={pendingActionType === "update" ? "Confirm Update Project" : "Confirm Create Project"}
        description={pendingActionType === "update" ? `Are you sure you want to save updates for project "${formData.title}"?` : `Are you sure you want to create project "${formData.title}"?`}
      >
        <div className="p-6 space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <p className="text-sm font-bold text-slate-900">{formData.title}</p>
            <p className="text-xs text-slate-600 font-medium">Budget: ${parseFloat(formData.budget || "0").toLocaleString()} • Duration: {formData.duration}</p>
            <p className="text-xs text-slate-500 font-mono">Status: {formData.status}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSaveConfirmModalOpen(false)}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSaveConfirmModalOpen(false);
                if (pendingActionType === "create") {
                  executeAddProject();
                } else {
                  executeUpdateProject();
                }
              }}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer active:scale-95 transition-all"
            >
              Confirm & Save
            </button>
          </div>
        </div>
      </BaseModal>

    </div>
  );
};
