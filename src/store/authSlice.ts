import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthState, User } from "../types";

const getStoredUser = (): User | null => {
  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (!stored) return null;
  try {
    const user = JSON.parse(stored);
    if (user && user.role === ("superadmin" as any)) {
      user.role = "admin";
    }
    return user;
  } catch {
    return null;
  }
};

const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");

const initialState: AuthState = {
  user: getStoredUser(),
  token: storedToken,
  isAuthenticated: !!storedToken && !!getStoredUser(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string; rememberMe?: boolean }>) => {
      state.loading = false;
      state.isAuthenticated = true;
      
      const user = { ...action.payload.user };
      if (user.role === ("superadmin" as any)) {
        user.role = "admin";
      }
      
      state.user = user;
      state.token = action.payload.token;
      
      const remember = action.payload.rememberMe ?? true;
      const primaryStorage = remember ? localStorage : sessionStorage;
      const alternativeStorage = remember ? sessionStorage : localStorage;

      alternativeStorage.removeItem("token");
      alternativeStorage.removeItem("user");

      primaryStorage.setItem("token", action.payload.token);
      primaryStorage.setItem("user", JSON.stringify(user));
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
    },
    setUser: (state, action: PayloadAction<User>) => {
      const user = { ...action.payload };
      if (user.role === ("superadmin" as any)) {
        user.role = "admin";
      }
      state.user = user;
      state.isAuthenticated = true;
      localStorage.setItem("user", JSON.stringify(user));
    }
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
