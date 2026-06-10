export type Role = "admin" | "manager" | "client";

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
