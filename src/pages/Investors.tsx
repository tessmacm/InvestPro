import React, { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Building2, 
  Trash2, 
  Edit, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Search, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  User,
  MapPin,
  Check,
  Globe,
  MoreVertical,
  Briefcase,
  Upload,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { Investor } from "../types";
import { cn } from "../lib/utils";
import { API_BASE_URL, authHeaders } from "../config/api";
import { BaseModal } from "../components/BaseModal";
import { TableSkeleton, StatCardSkeleton } from "../components/TableSkeleton";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export const Investors = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isClient = user?.role === "client" || user?.role === "investor";

  // Primary States
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<"list" | "add">("list");
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Selection/Target states
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [isViewDetailsMode, setIsViewDetailsMode] = useState(false);
  const [checkedInvestors, setCheckedInvestors] = useState<Set<string>>(new Set());
  const [dropdownOpenRowId, setDropdownOpenRowId] = useState<string | null>(null);

  // Filters State
  const [selectedFilterType, setSelectedFilterType] = useState<"All" | "Individual" | "Business">("All");
  const [appliedFilterType, setAppliedFilterType] = useState<"All" | "Individual" | "Business">("All");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(5);

  // Toast State
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Bulk CSV Import States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkParsedData, setBulkParsedData] = useState<any[]>([]);
  const [bulkValidationErrors, setBulkValidationErrors] = useState<string[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkFileName, setBulkFileName] = useState("");

  const handleDownloadCsvTemplate = () => {
    const templateHeader = "Name,Email,Mobile,InvestorType,Organization,CompanyRegistrationNo,AccreditationStatus,CapitalAmount,DateOfOnboarding,AssignedProject,MinRoi,MaxRoi,PayoutCategory,PayoutCycle,BankName,BankAccountNo,SortCode,Address,Witness,Notes\n";
    const sampleRow1 = 'John Doe,johndoe@example.com,+447123456789,Individual,,,"Accredited",25000,2026-07-26,"Current Operations",1,5,"Fixed","Constant","Barclays","12345678","20-40-60","123 High St, London","Jane Smith","Initial onboarding"\n';
    const sampleRow2 = 'Apex Capital Ltd,contact@apexcap.com,+447987654321,Business,"Apex Capital Ltd","CRN-884920","Accredited",100000,2026-07-26,"Current Operations",1,5,"Variant","Monthly","HSBC","87654321","40-20-60","45 Commercial Rd, Manchester","Robert Brown","Partner client"\n';
    
    const blob = new Blob(["\uFEFF" + templateHeader + sampleRow1 + sampleRow2], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "investors_bulk_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkValidationErrors([]);
    setBulkParsedData([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        setBulkValidationErrors(["The CSV file is empty or only contains header rows."]);
        return;
      }

      const errors: string[] = [];
      const parsedDtos: any[] = [];
      const emailRegex = /^\S+@\S+\.\S+$/;

      for (let i = 1; i < lines.length; i++) {
        const lineNum = i + 1;
        const row = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(cell => cell.trim().replace(/^"|"$/g, ''));
        
        if (row.length < 2) continue;

        const [
          name,
          email,
          mobile,
          investorType,
          organization,
          reg_number,
          accreditation,
          capitalAmount,
          date_of_onboarding,
          assignedProject,
          minRoi,
          maxRoi,
          payoutCategory,
          payoutCycle,
          bankName,
          bankAccountNo,
          sortCode,
          address,
          witness,
          notes
        ] = row;

        // Strict validation of required fields BEFORE creating DTOs
        if (!name || !name.trim()) {
          errors.push(`Row ${lineNum}: Investor Name is required.`);
        }
        if (!email || !email.trim() || !emailRegex.test(email.trim())) {
          errors.push(`Row ${lineNum}: Valid Email Address is required ('${email || ''}').`);
        }
        const capAmtNum = parseFloat(capitalAmount);
        if (isNaN(capAmtNum) || capAmtNum <= 0) {
          errors.push(`Row ${lineNum}: Capital Amount '${capitalAmount || ''}' must be a valid positive number.`);
        }

        const isBusiness = (investorType || '').toLowerCase() === 'business' || investorType === '2';
        const typeId = isBusiness ? 2 : 1;

        if (errors.length === 0) {
          parsedDtos.push({
            name: (name || '').trim(),
            email: (email || '').trim(),
            mobile: (mobile || '').trim(),
            type: typeId,
            organization: (organization || '').trim() || (isBusiness ? (name || '').trim() : "—"),
            reg_number: (reg_number || '').trim() || "—",
            accreditation: (accreditation || '').trim() || "Accredited",
            amount: capAmtNum,
            date_of_onboarding: (date_of_onboarding || '').trim() || new Date().toISOString().split("T")[0],
            min_RoiRangeId: parseInt(minRoi) || 1,
            max_RoiRangeId: parseInt(maxRoi) || 5,
            roiTypeId: (payoutCategory || '').toLowerCase() === 'variant'
              ? ((payoutCycle || '').toLowerCase() === 'weekly' ? 2 : (payoutCycle || '').toLowerCase() === 'quarterly' ? 4 : (payoutCycle || '').toLowerCase() === 'yearly' ? 5 : 3)
              : 1,
            bank: (bankName || '').trim(),
            acNumber: (bankAccountNo || '').trim(),
            soreCode: (sortCode || '').trim(),
            witness: (witness || '').trim(),
            address: (address || '').trim(),
            notes: (notes || '').trim() || "Bulk imported investor",
            status: "active"
          });
        }
      }

      if (errors.length > 0) {
        setBulkValidationErrors(errors);
      } else {
        setBulkParsedData(parsedDtos);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (bulkValidationErrors.length > 0) return;
    if (!bulkParsedData.length) {
      setBulkValidationErrors(["Please select a valid CSV file with investor rows."]);
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/investors/bulk-import`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(bulkParsedData)
      });

      if (res.ok) {
        setToast({ type: "success", message: `Successfully created ${bulkParsedData.length} investors!` });
        setIsBulkModalOpen(false);
        setBulkParsedData([]);
        setBulkFileName("");
        fetchInvestors();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setBulkValidationErrors([errJson.message || "Failed to create investors from CSV."]);
      }
    } catch (err) {
      console.error(err);
      setBulkValidationErrors(["Server error occurred during bulk import."]);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    type: "1" as string,
    email: "",
    organization: "",
    reg_number: "",
    interest: "",
    minRoi: "1",
    maxRoi: "5",
    payoutCategory: "Fixed",
    payoutCycle: "Constant",
    bank: "",
    acNumber: "",
    sortCode: "",
    witness: "",
    address: "",
    projectId: "1",
    notes: "",
    accreditation: "Accredited",
    status: "active" as "active" | "inactive",
    date_of_onboarding: "",
    amount: "",
    mobile: "",
  });

  const [projectsList, setProjectsList] = useState<{ id: string | number; title: string }[]>([
    { id: 1, title: "Current Operations" }
  ]);

  // Lookup data from API with fallback values
  const [investorTypes, setInvestorTypes] = useState<{ value: number; text: string }[]>([
    { value: 1, text: "Individual" },
    { value: 2, text: "Business" }
  ]);
  const [investmentInterests, setInvestmentInterests] = useState<{ value: number; text: string }[]>([
    { value: 1, text: "50,000 - 100,000" },
    { value: 2, text: "100,000 - 500,000" },
    { value: 3, text: "500,000 - 1,000,000" },
    { value: 4, text: "1,000,000+" }
  ]);
  const [roiRanges, setRoiRanges] = useState<{ value: number; text: string }[]>([
    { value: 1, text: "5.0% Fixed Minimum" },
    { value: 2, text: "7.5% Target Conservative" },
    { value: 3, text: "10.0% Growth Dynamic" },
    { value: 4, text: "12.5% High-Yield Aggressive" }
  ]);
  const [roiTypes, setRoiTypes] = useState<{ value: number; text: string }[]>([
    { value: 1, text: "Fixed" },
    { value: 2, text: "Weekly" },
    { value: 3, text: "Monthly" },
    { value: 4, text: "Quarterly" },
    { value: 5, text: "Yearly" }
  ]);
  const [banks, setBanks] = useState<{ value: number; text: string }[]>([
    { value: 1, text: "JPMorgan Chase" },
    { value: 2, text: "Bank of America" },
    { value: 3, text: "Wells Fargo" },
    { value: 4, text: "Citigroup" },
    { value: 5, text: "Goldman Sachs" }
  ]);

  // Initialize
  useEffect(() => {
    fetchInvestors();
    fetchLookups();
  }, []);

  const fetchLookups = async () => {
    try {
      const [typesRes, interestsRes, roiRangesRes, roiTypesRes, banksRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/lookups/investor-types`),
        fetch(`${API_BASE_URL}/api/lookups/investment-interests`),
        fetch(`${API_BASE_URL}/api/lookups/roi-ranges`),
        fetch(`${API_BASE_URL}/api/lookups/roi-types`),
        fetch(`${API_BASE_URL}/api/lookups/banks`),
        fetch(`${API_BASE_URL}/api/projects`, { headers: authHeaders() }).catch(() => null),
      ]);
      if (typesRes.ok) {
        const data = await typesRes.json();
        if (data && data.length > 0) setInvestorTypes(data);
      }
      if (interestsRes.ok) {
        const data = await interestsRes.json();
        if (data && data.length > 0) setInvestmentInterests(data);
      }
      if (roiRangesRes.ok) {
        const data = await roiRangesRes.json();
        if (data && data.length > 0) setRoiRanges(data);
      }
      if (roiTypesRes.ok) {
        const data = await roiTypesRes.json();
        if (data && data.length > 0) setRoiTypes(data);
      }
      if (banksRes.ok) {
        const data = await banksRes.json();
        if (data && data.length > 0) setBanks(data);
      }
      if (projectsRes && projectsRes.ok) {
        const data = await projectsRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((p: any) => ({ id: p.id, title: p.title }));
          if (!formatted.some((p: any) => p.title === "Current Operations")) {
            formatted.unshift({ id: 1, title: "Current Operations" });
          }
          setProjectsList(formatted);
        }
      }
    } catch {
      // silently fail — dropdowns will keep fallback values
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchInvestors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/investors`, {
        headers: authHeaders()
      });
      if (!response.ok) throw new Error("Could not fetch list");
      const data = await response.json();
      setInvestors(data);
    } catch (error: any) {
      showToast("error", "Failed to retrieve investors from server.");
    } finally {
      setLoading(false);
    }
  };

  // Switch to list view and clean form
  const resetFormAndGoHome = () => {
    setActiveView("list");
    setIsEditModalOpen(false);
    setIsViewDetailsMode(false);
    setFormData({
      name: "",
      type: "1",
      email: "",
      organization: "",
      reg_number: "",
      interest: "",
      roi: "",
      roiType: "",
      bank: "",
      acNumber: "",
      sortCode: "",
      notes: "",
      accreditation: "Accredited",
      status: "active",
      date_of_onboarding: "",
      amount: "",
      mobile: "",
    });
    setSelectedInvestor(null);
  };

  // Prefill Form for Editor
  const handleOpenEdit = (investor: Investor) => {
    setSelectedInvestor(investor);
    const matchedType = investorTypes.find(t => t.text === investor.type || String(t.value) === String(investor.type))?.value || 1;
    const matchedInterest = investmentInterests.find(i => String(i.value) === String(investor.interest) || i.text === investor.interest)?.value || "";
    const matchedBank = banks.find(b => b.text === investor.bank || String(b.value) === String(investor.bank))?.value || "";

    setFormData({
      name: investor.name,
      type: String(matchedType),
      email: investor.email || "",
      organization: investor.organization || "",
      reg_number: investor.reg_number || "",
      interest: String(matchedInterest),
      minRoi: "1",
      maxRoi: "5",
      payoutCategory: investor.payoutType === "Variant" ? "Variant" : "Fixed",
      payoutCycle: investor.payoutType === "Variant" ? (investor.roiType || "Monthly") : "Constant",
      bank: String(matchedBank),
      acNumber: investor.acNumber || "",
      sortCode: investor.sortCode || "",
      witness: investor.witness || "",
      address: investor.address || "",
      projectId: String(investor.projectId || projectsList[0]?.id || "1"),
      notes: investor.notes || "",
      accreditation: investor.accreditation || "Accredited",
      status: investor.status || "active",
      date_of_onboarding: investor.date_of_onboarding ? investor.date_of_onboarding.split("T")[0] : "",
      amount: String(investor.amount || ""),
      mobile: investor.mobile || "",
    });
    setIsViewDetailsMode(false);
    setActiveView("add");
  };

  // Open Add Flow
  const handleOpenAdd = () => {
    setFormData({
      name: "",
      type: investorTypes.length > 0 ? String(investorTypes[0].value) : "1",
      email: "",
      organization: "",
      reg_number: "",
      interest: investmentInterests.length > 0 ? String(investmentInterests[0].value) : "",
      minRoi: "1",
      maxRoi: "5",
      payoutCategory: "Fixed",
      payoutCycle: "Constant",
      bank: banks.length > 0 ? String(banks[0].value) : "",
      acNumber: "",
      sortCode: "",
      witness: "",
      address: "",
      projectId: String(projectsList[0]?.id || "1"),
      notes: "",
      accreditation: "Accredited",
      status: "active",
      date_of_onboarding: new Date().toISOString().split("T")[0],
      amount: "",
      mobile: "",
    });
    setIsViewDetailsMode(false);
    setActiveView("add");
  };

  // Details flow: opens Add view in read-only details mode
  const handleOpenViewDetails = (investor: Investor) => {
    setSelectedInvestor(investor);
    const matchedType = investorTypes.find(t => t.text === investor.type || String(t.value) === String(investor.type))?.value || 1;
    const matchedInterest = investmentInterests.find(i => String(i.value) === String(investor.interest) || i.text === investor.interest)?.value || "";
    const matchedBank = banks.find(b => b.text === investor.bank || String(b.value) === String(investor.bank))?.value || "";

    setFormData({
      name: investor.name,
      type: String(matchedType),
      email: investor.email || "",
      organization: investor.organization || "",
      reg_number: investor.reg_number || "",
      interest: String(matchedInterest),
      minRoi: "1",
      maxRoi: "5",
      payoutCategory: investor.payoutType === "Variant" ? "Variant" : "Fixed",
      payoutCycle: investor.payoutType === "Variant" ? (investor.roiType || "Monthly") : "Constant",
      bank: String(matchedBank),
      acNumber: investor.acNumber || "",
      sortCode: investor.sortCode || "",
      witness: investor.witness || "",
      address: investor.address || "",
      projectId: String(investor.projectId || projectsList[0]?.id || "1"),
      notes: investor.notes || "",
      accreditation: investor.accreditation || "Accredited",
      status: investor.status || "active",
      date_of_onboarding: investor.date_of_onboarding ? investor.date_of_onboarding.split("T")[0] : "",
      amount: String(investor.amount || ""),
      mobile: investor.mobile || "",
    });
    setIsViewDetailsMode(true);
    setActiveView("add");
  };

  // Delete dialog
  const handleOpenDelete = (investor: Investor) => {
    setSelectedInvestor(investor);
    setIsDeleteModalOpen(true);
  };

  // Form Submitter
  const handleSaveInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClient) {
      showToast("error", "Access Denied. Clients are not authorized to write/edit/delete data.");
      return;
    }
    if (!formData.name || !formData.email) {
      showToast("error", "Name and email are required fields.");
      return;
    }

    const minRoiVal = parseInt(formData.minRoi) || 1;
    const maxRoiVal = parseInt(formData.maxRoi) || 1;
    const calculatedAvgRoi = Math.round((minRoiVal + maxRoiVal) / 2);

    const isEdit = !!selectedInvestor;
    const payload = isEdit ? {
      name: formData.name,
      type: parseInt(formData.type) || 1,
      email: formData.email,
      mobile: formData.mobile || "",
      organization: formData.organization || "—",
      amount: parseFloat(formData.amount) || 0,
      reg_number: formData.reg_number || "—",
      accreditation: formData.accreditation || "Accredited",
      status: formData.status,
      date_of_onboarding: formData.date_of_onboarding || new Date().toISOString().split("T")[0],
      min_roi_id: minRoiVal,
      max_roi_id: maxRoiVal,
      payoutType: formData.payoutCategory,
      roiTypeId: formData.payoutCategory === "Fixed" ? 1 : (formData.payoutCycle === "Weekly" ? 2 : formData.payoutCycle === "Monthly" ? 3 : formData.payoutCycle === "Quarterly" ? 4 : 5),
      bank: banks.find(b => String(b.value) === formData.bank)?.text || formData.bank,
      acNumber: formData.acNumber || "",
      sortCode: formData.sortCode || "",
      witness: formData.witness || "",
      address: formData.address || "",
      projectId: parseInt(formData.projectId) || 1,
      notes: formData.notes || ""
    } : {
      name: formData.name,
      type: parseInt(formData.type) || 1,
      email: formData.email,
      mobile: formData.mobile || "",
      organization: formData.organization || "—",
      amount: parseFloat(formData.amount) || 0,
      reg_number: formData.reg_number || "—",
      accreditation: formData.accreditation || "Accredited",
      status: formData.status,
      date_of_onboarding: formData.date_of_onboarding || new Date().toISOString().split("T")[0],
      min_RoiRangeId: minRoiVal,
      max_RoiRangeId: maxRoiVal,
      payoutType: formData.payoutCategory,
      roiTypeId: formData.payoutCategory === "Fixed" ? 1 : (formData.payoutCycle === "Weekly" ? 2 : formData.payoutCycle === "Monthly" ? 3 : formData.payoutCycle === "Quarterly" ? 4 : 5),
      bank: banks.find(b => String(b.value) === formData.bank)?.text || formData.bank,
      acNumber: formData.acNumber || "",
      sortCode: formData.sortCode || "",
      witness: formData.witness || "",
      address: formData.address || "",
      projectId: parseInt(formData.projectId) || 1,
      notes: formData.notes || ""
    };

    const url = isEdit
      ? `${API_BASE_URL}/api/admin/investors/update/${selectedInvestor.id}`
      : `${API_BASE_URL}/api/admin/investors/create`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Safely parse error — body may be empty on auth/network failures
        let errMsg = "Operation failed";
        try {
          const ct = response.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const errorData = await response.json();
            errMsg = errorData.message || errorData.Message || errMsg;
          } else {
            errMsg = (await response.text()) || `HTTP ${response.status}`;
          }
        } catch { /* ignore parse error, use default message */ }
        throw new Error(errMsg);
      }

      showToast("success", isEdit ? "Investor details updated successfully!" : "New Investor register created successfully!");
      fetchInvestors();
      resetFormAndGoHome();
    } catch (err: any) {
      showToast("error", err.message || "Failed to commit record to database.");
    }
  };

  // Delete Execution
  const commitDeleteValue = async () => {
    if (isClient) {
      showToast("error", "Access Denied. Clients are not authorized to write/edit/delete data.");
      return;
    }
    if (!selectedInvestor) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/investors/${selectedInvestor.id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (!response.ok) throw new Error("Delete failed");
      
      showToast("success", "Investor profile deleted successfully.");
      setInvestors(investors.filter(i => i.id !== selectedInvestor.id));
      setIsDeleteModalOpen(false);
      resetFormAndGoHome();
    } catch (err: any) {
      showToast("error", "Failed to delete investor profile.");
    }
  };

  // Bulk selectors
  const toggleSelectAll = () => {
    if (checkedInvestors.size === currentRows.length) {
      setCheckedInvestors(new Set());
    } else {
      const newChecked = new Set<string>();
      currentRows.forEach(row => newChecked.add(String(row.id)));
      setCheckedInvestors(newChecked);
    }
  };

  const toggleSelectRow = (id: string) => {
    const newChecked = new Set(checkedInvestors);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedInvestors(newChecked);
  };

  // Filter application
  const applyFilters = () => {
    setAppliedFilterType(selectedFilterType);
    setIsFilterModalOpen(false);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedFilterType("All");
    setAppliedFilterType("All");
    setIsFilterModalOpen(false);
    setCurrentPage(1);
  };

  // Computation of searches and pages
  const filteredAndSearchedArray = investors.filter((i) => {
    // 1. Term check
    const matchesSearch = 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.email && i.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (i.mobile && i.mobile.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (i.organization && i.organization.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Applied Group
    if (appliedFilterType !== "All") {
      const matchesType = i.type === appliedFilterType;
      return matchesSearch && matchesType;
    }
    return matchesSearch;
  });

  // Derived stats
  const totalInvestorsCount = investors.length;
  const activeInvestorsCount = investors.filter(i => i.status === "active").length;
  const individualInvestorsCount = investors.filter(i => i.type === "Individual").length;
  const businessInvestorsCount = investors.filter(i => i.type === "Business").length;

  // Calculate pages
  const totalEntries = filteredAndSearchedArray.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;
  const currentRows = filteredAndSearchedArray.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  return (
    <div className="relative min-h-screen">
      
      {/* Toast Notification Top Right */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={cn(
              "fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border min-w-[320px] backdrop-blur-md",
              toast.type === "success" 
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-800" 
                : "bg-rose-50/95 border-rose-200 text-rose-800"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        
        {/* -- VIEW 1: MAIN LIST VIEW -- */}
        {activeView === "list" && (
          <motion.div
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, x: -15 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-display font-extrabold text-slate-900 mt-1">Investors</h1>
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  Manage your verified legal entities and individual investment accounts.
                </p>
              </motion.div>
              {!isClient && (
                <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
                  <motion.button
                    variants={itemVariants}
                    onClick={() => {
                      setIsBulkModalOpen(true);
                      setBulkValidationErrors([]);
                      setBulkParsedData([]);
                      setBulkFileName("");
                    }}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm px-5 py-3 rounded-2xl border border-emerald-200 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Bulk Import CSV
                  </motion.button>

                  <motion.button
                    variants={itemVariants}
                    onClick={handleOpenAdd}
                    id="btn-add-investor"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-blue-500/10 cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    Add Investor
                  </motion.button>
                </div>
              )}
            </div>

             {/* Main Interactive Grid Card */}
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
                  {/* Total Investors */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Total Investors</span>
                      </div>
                      <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-3xl font-extrabold text-slate-900">{totalInvestorsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Investors */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Active Investors</span>
                      </div>
                      <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-3xl font-extrabold text-slate-900">{activeInvestorsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Investors */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Individual</span>
                      </div>
                      <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-3xl font-extrabold text-slate-900">{individualInvestorsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Investors */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold font-sans text-slate-500 tracking-wide uppercase">Business</span>
                      </div>
                      <div className="flex items-baseline gap-2 pt-2">
                        <span className="text-3xl font-extrabold text-slate-900">{businessInvestorsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter controls panel */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by name, email, mobile, company..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 rounded-xl transition-all text-sm font-semibold"
                    />
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto items-center justify-end">
                    <button
                      onClick={() => setIsFilterModalOpen(true)}
                      id="btn-filter"
                      className="flex justify-center items-center gap-2 h-11 px-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-colors active:scale-95 cursor-pointer bg-white"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                      Filter
                      {appliedFilterType !== "All" && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 block" />
                      )}
                    </button>
                    
                    {/* Entries count select sizing */}
                    <select
                      value={entriesPerPage}
                      onChange={(e) => {
                        setEntriesPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-11 px-3 border border-slate-200 rounded-xl text-xs text-slate-600 bg-white hover:bg-slate-50 outline-none font-bold"
                    >
                      <option value={5}>Show 5 per page</option>
                      <option value={10}>Show 10 per page</option>
                      <option value={20}>Show 20 per page</option>
                    </select>
                  </div>
                </div>

                {/* Results Table Panel */}
                <motion.div 
                  variants={itemVariants} 
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-2"
                >
                  
                  {/* Responsive custom-built table */}
                  <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        {/* Master selector row */}
                        <th className="w-16 px-6 py-4 text-center">
                          <button 
                            onClick={toggleSelectAll} 
                            className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center bg-white hover:border-blue-500 transition-all mx-auto"
                          >
                            {checkedInvestors.size > 0 && checkedInvestors.size === currentRows.length && (
                              <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                            )}
                            {checkedInvestors.size > 0 && checkedInvestors.size < currentRows.length && (
                              <div className="w-2.5 h-[2px] bg-slate-400" />
                            )}
                          </button>
                        </th>
                        <th className="w-24 px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="w-32 px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</th>
                        <th className="w-44 px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mobile Number</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Company</th>
                        <th className="w-32 px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="w-28 px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-24 text-center">
                            <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Users className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 font-bold text-lg">No investors found</h3>
                            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                              Try adjusting your filters, query parameters, or add a fresh investor directly.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        currentRows.map((row) => {
                          const isChecked = checkedInvestors.has(String(row.id));
                          const displayId = `INV-${String(row.id).padStart(3, "0")}`;
                          
                          return (
                            <tr 
                              key={row.id} 
                              className={cn(
                                "group transition-colors align-middle",
                                isChecked ? "bg-blue-50/20" : "hover:bg-slate-50/50"
                              )}
                            >
                              {/* Checkbox */}
                              <td className="px-6 py-4.5 text-center">
                                <button 
                                  onClick={() => toggleSelectRow(String(row.id))} 
                                  className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center bg-white hover:border-blue-500 transition-all mx-auto",
                                    isChecked ? "border-blue-500 bg-blue-50" : "border-slate-300"
                                  )}
                                >
                                  {isChecked && <Check className="w-3 h-3 text-blue-600 stroke-[3]" />}
                                </button>
                              </td>

                              {/* Formatted ID */}
                              <td className="px-4 py-4.5 font-mono text-xs text-slate-400 font-bold">
                                {displayId}
                              </td>

                              {/* Name with initials bubble */}
                              <td className="px-6 py-4.5">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center">
                                    {row.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <button 
                                      onClick={() => handleOpenViewDetails(row)}
                                      className="text-slate-800 hover:text-blue-600 font-extrabold text-left transition-colors cursor-pointer block outline-none"
                                    >
                                      {row.name}
                                    </button>
                                    {row.organization && (
                                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide mt-0.5">
                                        {row.organization}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Investor Type Badge */}
                              <td className="px-4 py-4.5">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                                  row.type === "Individual" 
                                    ? "bg-purple-50 text-purple-700 border border-purple-100" 
                                    : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                )}>
                                  {row.type}
                                </span>
                              </td>

                              {/* Email Address */}
                              <td className="px-6 py-4.5 text-slate-600 font-medium font-sans">
                                {row.email}
                              </td>

                              {/* Mobile Phone Number */}
                              <td className="px-4 py-4.5 text-slate-500 font-mono text-xs">
                                {row.mobile || "N/A"}
                              </td>

                              {/* Organization Organization */}
                              <td className="px-6 py-4.5 text-slate-600 font-medium">
                                {row.organization || <span className="text-slate-300 font-bold">-</span>}
                              </td>

                              {/* Status Badge */}
                              <td className="px-4 py-4.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                                  row.status === "active" 
                                    ? "bg-emerald-50 text-emerald-700" 
                                    : "bg-slate-100 text-slate-500"
                                )}>
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    row.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                                  )} />
                                  {row.status}
                                </span>
                              </td>

                              {/* Hover Action Triggers */}
                              <td className="px-6 py-4.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button 
                                    onClick={() => handleOpenViewDetails(row)}
                                    title="View Portfolio"
                                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table pagination footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500">
                  <div>
                    Showing {totalEntries === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{" "}
                    {Math.min(currentPage * entriesPerPage, totalEntries)} of {totalEntries} entries
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-xl font-bold transition-all",
                            currentPage === pageNum 
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" 
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || loading}
                      className="p-2 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          )}
        </motion.div>
      )}

        {/* -- VIEW 2: ADD / EDIT / VIEW DETAILS VIEW -- */}
        {activeView === "add" && (
          <motion.div
            key="add"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 25 }}
            className="space-y-6"
          >
            {/* Header with back icon button structure */}
            <div className="flex items-center gap-3">
              <button
                onClick={resetFormAndGoHome}
                className="p-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer bg-white"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  {isViewDetailsMode ? "Investors > View Details" : selectedInvestor ? "Investors > Edit Details" : "Investors > Add Investor"}
                </span>
                <h1 className="text-2xl font-display font-bold text-slate-900 mt-0.5">
                  {isViewDetailsMode ? "View Investor Details" : selectedInvestor ? "Edit Investor Details" : "Add New Investor"}
                </h1>
              </div>
            </div>

            {/* Input card wrapper */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 w-full">
              <div className="border-b border-slate-100 pb-5 mb-8 flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-display font-bold text-slate-800">
                    {isViewDetailsMode ? "Investor Profile Details" : selectedInvestor ? "Modify Investor Details" : "New Investor Registration"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {isViewDetailsMode ? "Legal and financial particulars of the selected investor." : "Enter legal organization or individual credentials below."}
                  </p>
                </div>
                {/* Edit and Delete Buttons top right */}
                {isViewDetailsMode && !isClient && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsViewDetailsMode(false)}
                      className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border border-transparent hover:border-blue-200"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(selectedInvestor!)}
                      className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border border-transparent hover:border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveInvestor} className="space-y-8">
                {/* Rearranged structured grid sections */}
                <div className="space-y-8">

                  {/* Section 1: Personal & Contact Profile */}
                  <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      1. Personal & Contact Profile
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Full Name */}
                      <div className="space-y-1.5 text-left md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          disabled={isViewDetailsMode}
                          type="text"
                          placeholder="Enter full name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5 text-left md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Email ID <span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          disabled={isViewDetailsMode || !!selectedInvestor}
                          type="email"
                          placeholder="Enter email address"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Mobile */}
                      <div className="space-y-1.5 text-left md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Mobile Number
                        </label>
                        <input
                          disabled={isViewDetailsMode}
                          type="text"
                          placeholder="Enter phone number"
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Investor Address */}
                      <div className="space-y-1.5 text-left md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          Investor Address
                        </label>
                        <input
                          disabled={isViewDetailsMode}
                          type="text"
                          placeholder="Enter full street address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Witness */}
                      <div className="space-y-1.5 text-left md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Witness Name
                        </label>
                        <input
                          disabled={isViewDetailsMode}
                          type="text"
                          placeholder="Enter witness name"
                          value={formData.witness}
                          onChange={(e) => setFormData({ ...formData, witness: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Status Toggle */}
                      <div className="space-y-1.5 text-left md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Account Status
                        </label>
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            disabled={isViewDetailsMode}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: formData.status === "active" ? "inactive" : "active" })}
                            className={cn(
                              "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                              formData.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                            )}
                          >
                            <span className={cn(
                              "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                              formData.status === "active" ? "translate-x-6" : "translate-x-1"
                            )} />
                          </button>
                          <span className={cn(
                            "text-sm font-semibold",
                            formData.status === "active" ? "text-emerald-600" : "text-slate-400"
                          )}>
                            {formData.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Entity & Business Details */}
                  <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      2. Entity & Business Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Investor Type */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Investor Type <span className="text-rose-500">*</span>
                        </label>
                        <select
                          disabled={isViewDetailsMode}
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all appearance-none cursor-pointer"
                        >
                          {investorTypes.map(t => (
                            <option key={t.value} value={String(t.value)}>{t.text}</option>
                          ))}
                        </select>
                      </div>

                      {/* Company / Org */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Company / Org
                        </label>
                        <input
                          disabled={isViewDetailsMode}
                          type="text"
                          placeholder="Company or organization name"
                          value={formData.organization}
                          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Co Reg Number */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Co Reg Number
                        </label>
                        <input
                          disabled={isViewDetailsMode}
                          type="text"
                          placeholder="Company registration number"
                          value={formData.reg_number}
                          onChange={(e) => setFormData({ ...formData, reg_number: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Accreditation */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Accreditation Status
                        </label>
                        <select
                          disabled={isViewDetailsMode}
                          value={formData.accreditation}
                          onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                          className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all appearance-none cursor-pointer"
                        >
                          <option value="Accredited">Accredited</option>
                          <option value="Non-Accredited">Non-Accredited</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Investment Terms & Payout Schedule */}
                  <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      3. Investment Terms & Payout Schedule
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Investment Amount */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Investment Capital (£) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          disabled={isViewDetailsMode}
                          type="number"
                          placeholder="e.g. 50000"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Select Project Dropdown */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          Assigned Project <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          disabled={isViewDetailsMode}
                          value={formData.projectId}
                          onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                          className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all cursor-pointer"
                        >
                          {projectsList.map((p) => (
                            <option key={p.id} value={String(p.id)}>{p.title}</option>
                          ))}
                        </select>
                      </div>

                      {/* Date of Boarding */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Date of Boarding <span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          disabled={isViewDetailsMode}
                          type="date"
                          value={formData.date_of_onboarding}
                          onChange={(e) => setFormData({ ...formData, date_of_onboarding: e.target.value })}
                          className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Min ROI */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Min ROI (%) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          disabled={isViewDetailsMode}
                          value={formData.minRoi}
                          onChange={(e) => setFormData({ ...formData, minRoi: e.target.value })}
                          className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all cursor-pointer"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <option key={num} value={String(num)}>{num}%</option>
                          ))}
                        </select>
                      </div>

                      {/* Max ROI */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Max ROI (%) <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          disabled={isViewDetailsMode}
                          value={formData.maxRoi}
                          onChange={(e) => setFormData({ ...formData, maxRoi: e.target.value })}
                          className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all cursor-pointer"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <option key={num} value={String(num)}>{num}%</option>
                          ))}
                        </select>
                      </div>

                      {/* Calculated Payout Average Display */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Avg ROI Calculation
                        </label>
                        <div className="px-4 py-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-left flex items-center justify-between h-[46px]">
                          <span className="text-xs font-bold text-blue-700">Calculated Average:</span>
                          <span className="text-sm font-extrabold text-blue-900 font-mono">
                            {Math.round(((parseInt(formData.minRoi) || 1) + (parseInt(formData.maxRoi) || 1)) / 2)}%
                          </span>
                        </div>
                      </div>

                      {/* Payment Cycle Category */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Payment Cycle Category <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          disabled={isViewDetailsMode}
                          value={formData.payoutCategory}
                          onChange={(e) => {
                            const category = e.target.value;
                            setFormData({
                              ...formData,
                              payoutCategory: category,
                              payoutCycle: category === "Fixed" ? "Constant" : "Monthly"
                            });
                          }}
                          className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all cursor-pointer"
                        >
                          <option value="Fixed">Fixed</option>
                          <option value="Variant">Variant</option>
                        </select>
                      </div>

                      {/* Payment Frequency */}
                      <div className="space-y-1.5 text-left md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Payment Frequency {formData.payoutCategory === "Variant" && <span className="text-rose-500">*</span>}
                        </label>
                        {formData.payoutCategory === "Fixed" ? (
                          <input
                            disabled
                            type="text"
                            value="Constant"
                            className="w-full px-4 py-3 bg-slate-100/70 border border-slate-200 rounded-xl text-sm font-bold text-slate-600"
                          />
                        ) : (
                          <select
                            required
                            disabled={isViewDetailsMode}
                            value={formData.payoutCycle}
                            onChange={(e) => setFormData({ ...formData, payoutCycle: e.target.value })}
                            className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all cursor-pointer"
                          >
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Bank Settlement & Additional Notes */}
                  <div className="bg-slate-50/40 p-6 rounded-2xl border border-slate-100 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      4. Bank Settlement & Remarks
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Bank Name */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Bank Name
                        </label>
                        <select
                          disabled={isViewDetailsMode}
                          value={formData.bank}
                          onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                          className="w-full px-4 py-3 bg-white disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all cursor-pointer"
                        >
                          <option value="">Select bank</option>
                          {banks.map(b => (
                            <option key={b.value} value={String(b.value)}>{b.text}</option>
                          ))}
                        </select>
                      </div>

                      {/* Account Number */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Account Number
                        </label>
                        <input
                          disabled={isViewDetailsMode}
                          type="text"
                          placeholder="Bank account number"
                          value={formData.acNumber}
                          onChange={(e) => setFormData({ ...formData, acNumber: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Sort Code */}
                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Sort Code
                        </label>
                        <input
                          disabled={isViewDetailsMode}
                          type="text"
                          placeholder="Bank sort code"
                          value={formData.sortCode}
                          onChange={(e) => setFormData({ ...formData, sortCode: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all"
                        />
                      </div>

                      {/* Internal Notes */}
                      <div className="space-y-1.5 text-left md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Internal Notes & Annotations
                        </label>
                        <textarea
                          disabled={isViewDetailsMode}
                          rows={2}
                          placeholder="Add private annotations, remarks or historical onboarding notes..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100/50 disabled:cursor-not-allowed border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100/50 text-sm font-semibold transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom interactive submit bar */}
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  {isViewDetailsMode ? (
                    <button
                      type="button"
                      onClick={resetFormAndGoHome}
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Back to List
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={resetFormAndGoHome}
                        className="px-5 py-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/15 cursor-pointer transition-all active:scale-95"
                      >
                        {selectedInvestor ? (
                          <>
                            <Check className="w-4 h-4" /> Save Changes
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" /> Add Investor
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>

              </form>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* -- OVERLAY MODAL 2: FILTER INVESTORS MODAL -- */}
      <BaseModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Investors"
        description="Refine your table elements list representation"
        className="max-w-md"
      >
        {/* Body form inputs */}
        <div className="p-6 space-y-5 text-left">
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
              Investor Type Selection
            </label>
            <div className="space-y-2">
              {/* All */}
              <button
                onClick={() => setSelectedFilterType("All")}
                className={cn(
                  "w-full p-3.5 rounded-xl border text-left font-semibold text-sm transition-all flex items-center justify-between cursor-pointer",
                  selectedFilterType === "All" 
                    ? "border-blue-600 bg-blue-50/40 text-blue-800" 
                    : "border-slate-150 hover:bg-slate-50 text-slate-700"
                )}
              >
                <span>Show All Types</span>
                {selectedFilterType === "All" && <Check className="w-4 h-4 text-blue-600" />}
              </button>

              {/* Individual */}
              <button
                onClick={() => setSelectedFilterType("Individual")}
                className={cn(
                  "w-full p-3.5 rounded-xl border text-left font-semibold text-sm transition-all flex items-center justify-between cursor-pointer",
                  selectedFilterType === "Individual" 
                    ? "border-blue-600 bg-blue-50/40 text-blue-800" 
                    : "border-slate-150 hover:bg-slate-50 text-slate-700"
                )}
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  Individual Accounts Only
                </span>
                {selectedFilterType === "Individual" && <Check className="w-4 h-4 text-blue-600" />}
              </button>

              {/* Business */}
              <button
                onClick={() => setSelectedFilterType("Business")}
                className={cn(
                  "w-full p-3.5 rounded-xl border text-left font-semibold text-sm transition-all flex items-center justify-between cursor-pointer",
                  selectedFilterType === "Business" 
                    ? "border-blue-600 bg-blue-50/40 text-blue-800" 
                    : "border-slate-150 hover:bg-slate-50 text-slate-700"
                )}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Business Partners Only
                </span>
                {selectedFilterType === "Business" && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            </div>
          </div>

        </div>

        {/* Footer buttons */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={resetFilters}
            id="btn-confirm-reset"
            className="flex-1 px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-sm rounded-xl transition-all cursor-pointer text-center"
          >
            Reset
          </button>
          <button
            onClick={applyFilters}
            id="btn-confirm-apply"
            className="flex-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer text-center"
          >
            Apply Filters
          </button>
        </div>
      </BaseModal>

      {/* -- OVERLAY MODAL 3: DELETE CONFIRMATION MODAL -- */}
      <BaseModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Investor"
        description="Are you sure you want to delete this investor? This action cannot be undone."
        className="max-w-md text-center"
      >
        <div className="p-6">
          {/* Graphic Trash Bin Icon representation with red badge */}
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-5">
            <Trash2 className="w-7 h-7 text-rose-500" />
          </div>

          {/* Dynamic info card layout */}
          <div className="my-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left text-xs font-semibold space-y-1 text-slate-600">
            <p>
              ID: <span className="font-mono text-slate-800">INV-{String(selectedInvestor?.id).padStart(3, "0")}</span>
            </p>
            <p>
              Name: <span className="text-slate-800">{selectedInvestor?.name}</span>
            </p>
            {selectedInvestor?.organization && selectedInvestor?.organization !== "—" && (
              <p>
                Company: <span className="text-slate-800">{selectedInvestor?.organization}</span>
              </p>
            )}
          </div>

          {/* Bottom buttons action */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedInvestor(null);
              }}
              id="btn-cancel-delete"
              className="px-4 py-3 border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-sm rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={commitDeleteValue}
              id="btn-execute-delete"
              className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-rose-200/50"
            >
              Delete
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Bulk CSV Import Modal */}
      <BaseModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Onboard Investors via CSV"
      >
        <div className="space-y-6">
          {/* Step 1: Template Download Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Download Official CSV Template
              </h4>
              <p className="text-xs text-emerald-700 mt-1">
                First download our standard CSV template with pre-filled column headers and sample data.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all flex-shrink-0"
            >
              <Download className="w-4 h-4" /> Download Template
            </button>
          </div>

          {/* Step 2: File Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Upload Filled CSV File
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkFileChange}
                className="hidden"
                id="bulk-csv-input"
              />
              <label
                htmlFor="bulk-csv-input"
                className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-700 underline"
              >
                Browse CSV file
              </label>
              {bulkFileName && (
                <p className="text-xs font-semibold text-slate-700 mt-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 inline-block shadow-sm">
                  📄 Selected: {bulkFileName}
                </p>
              )}
            </div>
          </div>

          {/* Step 3: Validation Error List */}
          {bulkValidationErrors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 max-h-48 overflow-y-auto">
              <h5 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                Validation Errors Found ({bulkValidationErrors.length})
              </h5>
              <p className="text-[11px] text-rose-700">
                Please make the exact corrections in your CSV file and upload again:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-rose-700 font-mono">
                {bulkValidationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 4: Validation Success Banner */}
          {bulkParsedData.length > 0 && bulkValidationErrors.length === 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-emerald-900">CSV Validated Successfully</h5>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Ready to onboard {bulkParsedData.length} new investors with complete payment schedules.
                </p>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={isBulkSubmitting || bulkValidationErrors.length > 0 || bulkParsedData.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all disabled:cursor-not-allowed"
            >
              {isBulkSubmitting ? "Importing Investors..." : `Import ${bulkParsedData.length} Investors`}
            </button>
          </div>
        </div>
      </BaseModal>

    </div>
  );
};
