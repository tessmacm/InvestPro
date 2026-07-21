export type Role = "admin" | "manager" | "client" | "investor" | "superadmin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status?: "active" | "inactive";
}

export interface Investor {
  id: string;
  name: string;
  type: "Individual" | "Business";
  email: string;
  mobile: string;
  organization: string;
  amount: number;
  reg_number: string;
  interest: string;
  accreditation: "Accredited" | "Non-Accredited";
  country: string;
  status: "active" | "inactive";
  date_of_onboarding?: string;
  last_investment_date?: string;
  roi?: string;
  roiType?: string;
  payoutType?: string;
  bank?: string;
  acNumber?: string;
  sortCode?: string;
  notes?: string;
}

export interface Document {
  id: string;
  title: string;
  type: string;
  size: string;
  url: string;
  uploaded_by: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  budget: number;
  duration: string;
  start_date: string;
  end_date: string;
  comments?: string;
  status: "active" | "inactive";
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface Payment {
  paymentId: number;
  investorId: number;
  investorName: string;
  amount: number;
  paymentDate: string;
  status: string;
  isSent: boolean;
  isReceived: boolean;
  paymentCycle?: string;
}

export interface RoiContract {
  id: number;
  investorId: number;
  investorName: string;
  projectId: number;
  projectTitle: string;
  roiAgreed: number;
  monthlyPayment: number;
  nextPaymentDate: string;
  status: string;
}

export interface SystemNotification {
  id: number;
  title: string;
  message: string;
  eventType: string;
  isRead: boolean;
  createdAt: string;
  investorId?: number;
  targetInvestorIds?: string;
  investorName?: string;
  status: string;
}

export interface SystemReport {
  id: number;
  title: string;
  type: string;
  size: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
  targetInvestorIds: string;
  investorName: string;
}
