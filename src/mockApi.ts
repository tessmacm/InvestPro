/**
 * InvestPro Client-Side mock API Router & Emulator
 * 
 * Intercepts window.fetch calls to `/api/*` when `VITE_DATA_SOURCE === 'mock'`
 * and runs complete persistent CRUD queries inside localStorage.
 * Enables the complete system to work perfectly on static servers.
 */

// Core database structure
interface MockDB {
  users: Array<any>;
  investors: Array<any>;
  documents: Array<any>;
  projects: Array<any>;
  magicLinks: Array<any>;
  pendingRegistrations: Array<any>;
}

const LOCAL_STORAGE_KEY = "investpro_mock_db";

function getInitialDB(): MockDB {
  return {
    users: [
      {
        id: "1",
        email: "tessma.cm@gmail.com",
        password: "password",
        name: "System Admin",
        role: "admin",
        status: "active"
      },
      {
        id: "2",
        email: "manager@investpro.com",
        password: "password",
        name: "System Manager",
        role: "manager",
        status: "active"
      },
      {
        id: "3",
        email: "client@investpro.com",
        password: "password",
        name: "System Client",
        role: "client",
        status: "active"
      }
    ],
    investors: [
      {
        id: "1",
        name: "John Doe",
        type: "Individual",
        email: "john@example.com",
        mobile: "+1234567890",
        organization: "—",
        amount: 500000,
        reg_number: "—",
        interest: "Venture Capital",
        accreditation: "Accredited",
        country: "United States",
        status: "active",
        date_of_onboarding: "15 May 2024",
        last_investment_date: "2024-05-15T12:00:00Z"
      },
      {
        id: "2",
        name: "ABC Ventures",
        type: "Business",
        email: "contact@abc.com",
        mobile: "+1987654321",
        organization: "ABC Ventures Ltd.",
        amount: 1250000,
        reg_number: "REG-102948",
        interest: "Private Equity",
        accreditation: "Accredited",
        country: "United Kingdom",
        status: "active",
        date_of_onboarding: "12 Mar 2024",
        last_investment_date: "2024-03-12T12:00:00Z"
      },
      {
        id: "3",
        name: "Michael Smith",
        type: "Individual",
        email: "michael@example.com",
        mobile: "+1212121234",
        organization: "—",
        amount: 750000,
        reg_number: "—",
        interest: "Real Estate",
        accreditation: "Non-Accredited",
        country: "Canada",
        status: "inactive",
        date_of_onboarding: "08 Jan 2024",
        last_investment_date: "2024-01-08T12:00:00Z"
      },
      {
        id: "4",
        name: "XYZ Capital",
        type: "Business",
        email: "info@xyzcapital.com",
        mobile: "+1122334455",
        organization: "XYZ Capital Inc.",
        amount: 2000000,
        reg_number: "REG-993812",
        interest: "Venture Capital",
        accreditation: "Accredited",
        country: "India",
        status: "active",
        date_of_onboarding: "24 Apr 2024",
        last_investment_date: "2024-04-24T12:00:00Z"
      },
      {
        id: "5",
        name: "Sarah Johnson",
        type: "Individual",
        email: "sarah@example.com",
        mobile: "+1212121212",
        organization: "—",
        amount: 350000,
        reg_number: "—",
        interest: "Stocks & Bonds",
        accreditation: "Accredited",
        country: "United States",
        status: "active",
        date_of_onboarding: "30 May 2024",
        last_investment_date: "2024-05-30T12:00:00Z"
      }
    ],
    documents: [
      {
        id: "1",
        title: "Q4 Financial Report",
        type: "PDF",
        size: "2.4 MB",
        url: "#",
        uploaded_by: "System Admin",
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "2",
        title: "Investor Agreement",
        type: "DOCX",
        size: "1.1 MB",
        url: "#",
        uploaded_by: "System Admin",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    projects: [
      {
        id: "0",
        title: "Current Operations",
        description: "Primary ongoing operational investment portfolio and operational activities.",
        budget: 500000,
        duration: "365 Days",
        start_date: "01 Jan 2024",
        end_date: "31 Dec 2024",
        comments: "Default active project for general operations.",
        status: "active"
      },
      {
        id: "1",
        title: "InvestPro Mobile App",
        description: "A modern mobile application for investors to track portfolios, analyze performance and manage investments on the go. The InvestPro Mobile App will provide investors with real-time portfolio tracking, market insights, secure transactions, and investment recommendations.",
        budget: 250000,
        duration: "120 Days",
        start_date: "01 May 2024",
        end_date: "28 Aug 2024",
        comments: "Focus on user experience, security and performance optimization.",
        status: "active"
      },
      {
        id: "2",
        title: "Investor Dashboard Redesign",
        description: "Revamping the client-facing investor dashboard with modern UI/UX components. Simplify navigation, accelerate reporting modules, and integrate interactive charts for a sleeker financial review workflow.",
        budget: 180000,
        duration: "90 Days",
        start_date: "10 Apr 2024",
        end_date: "08 Jul 2024",
        comments: "Ensure robust mobile responsiveness and accessibility compliance across major browsers.",
        status: "active"
      },
      {
        id: "3",
        title: "Payment Gateway Integration",
        description: "Enable multi-currency seamless deposits and withdrawals by partnering with Stripe and global merchant processors. Emphasize compliance, localized credit systems, and bank transfers.",
        budget: 300000,
        duration: "150 Days",
        start_date: "05 Feb 2024",
        end_date: "04 Jul 2024",
        comments: "Mandatory end-to-end security audit and penetration testing before deployment to staging environments.",
        status: "active"
      },
      {
        id: "4",
        title: "Website Revamp",
        description: "A complete redesign of the public-facing corporate website to improve user positioning, modernize the brand voice, and introduce streamlined onboarding sections.",
        budget: 220000,
        duration: "100 Days",
        start_date: "15 Mar 2024",
        end_date: "22 Jun 2024",
        comments: "Work closely with marketing to align on copy standards and dynamic landing page graphics.",
        status: "active"
      },
      {
        id: "5",
        title: "CRM System Development",
        description: "In-house customer relationship management platform personalized for investor relationship managers to ease tracking emails, phone calls, interactions, and potential leads.",
        budget: 400000,
        duration: "180 Days",
        start_date: "01 Jan 2024",
        end_date: "29 Jun 2024",
        comments: "Transition from legacy spreadsheets to this centralized CRM platform. Provide comprehensive user training sessions.",
        status: "inactive"
      }
    ],
    magicLinks: [],
    pendingRegistrations: []
  };
}

function loadDB(): MockDB {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    const defaultDB = getInitialDB();
    saveDB(defaultDB);
    return defaultDB;
  }
  try {
    return JSON.parse(data);
  } catch (err) {
    const defaultDB = getInitialDB();
    saveDB(defaultDB);
    return defaultDB;
  }
}

function saveDB(db: MockDB) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

// Global hook to register and toggle mock API runtime
export function initializeMockApi() {
  const isMockMode = !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL.trim() === "" || import.meta.env.VITE_API_URL.trim() === "/";
  if (!isMockMode) {
    const apiTargetUrl = import.meta.env.VITE_API_URL.trim().replace(/\/$/, "");
    console.log("[Data Source] External API active via VITE_API_URL (Client-Side Direct):", apiTargetUrl);

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const urlStr = typeof input === "string" ? input : (input as any).url || "";
      
      let url: URL;
      try {
        url = new URL(urlStr, window.location.origin);
      } catch {
        return originalFetch(input, init);
      }

      const method = (init?.method || "GET").toUpperCase();

      const normalizedPathname = url.pathname.replace(/^\/+/, "/");
      if (normalizedPathname.startsWith("/api")) {
        const path = normalizedPathname.substring(4);
        let targetPath = path;
        let shouldTranslate = true;

        // Clone/create headers and inject Bearer token
        const headers = new Headers(init?.headers);
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token && !headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        if (window.location.hostname.includes("staging.tessmaims.co.uk") && !headers.has("X-Environment")) {
          headers.set("X-Environment", "staging");
        }

        let newBody = init?.body;

        // Parse body if it is a JSON string
        let bodyObj: any = null;
        if (init?.body && typeof init.body === "string") {
          try {
            bodyObj = JSON.parse(init.body);
          } catch (e) {
            // Not JSON
          }
        }

        if (path === "/login") {
          targetPath = "/Auth/login";
        } else if (path === "/logout") {
          targetPath = "/Auth/logout";
        } else if (path === "/register") {
          targetPath = "/Auth/register";
        } else if (path === "/register-verify") {
          targetPath = "/Auth/register-verify";
        } else if (path === "/forgot-password") {
          targetPath = "/Auth/forgot-password";
        } else if (path === "/reset-password") {
          targetPath = "/Auth/reset-password";
        } else if (path === "/magic-login") {
          targetPath = "/Auth/magic-login";
        } else if (path === "/verify-token") {
          targetPath = "/Auth/verify-token";
        } else if (path === "/users" || path.startsWith("/users/")) {
          if (method === "PUT" && path.split("/").length === 3) {
            targetPath = `/admin/users/${path.split("/")[2]}/role`;
            if (bodyObj) {
              const mappedUpdate = {
                Name: bodyObj.name || "",
                Email: bodyObj.email || "",
                Role: (bodyObj.role ? bodyObj.role.charAt(0).toUpperCase() + bodyObj.role.slice(1) : "Admin"),
                Status: bodyObj.status === "active"
              };
              newBody = JSON.stringify(mappedUpdate);
              headers.set("Content-Type", "application/json");
            }
          } else if (method === "POST" && path === "/users") {
            targetPath = "/admin/users";
            if (bodyObj) {
              const firstName = bodyObj.firstName || "";
              const lastName = bodyObj.lastName || "";
              const mappedCreate = {
                Email: bodyObj.email || "",
                Password: bodyObj.password || "Password123!",
                FirstName: firstName,
                LastName: lastName,
                Role: bodyObj.role || "manager"
              };
              newBody = JSON.stringify(mappedCreate);
              headers.set("Content-Type", "application/json");
            }
          } else if (method === "PATCH" && path.split("/").length === 4 && path.split("/")[3] === "status") {
            targetPath = `/admin/users/${path.split("/")[2]}/status`;
            if (bodyObj) {
              const mappedStatus = {
                Status: bodyObj.status === "active"
              };
              newBody = JSON.stringify(mappedStatus);
              headers.set("Content-Type", "application/json");
            }
          } else if (method === "PATCH" && path.split("/").length === 4 && path.split("/")[3] === "role") {
            targetPath = `/admin/users/${path.split("/")[2]}/role`;
            if (bodyObj) {
              const mappedRole = {
                Role: (bodyObj.role ? bodyObj.role.charAt(0).toUpperCase() + bodyObj.role.slice(1) : "Admin")
              };
              newBody = JSON.stringify(mappedRole);
              headers.set("Content-Type", "application/json");
            }
          } else {
            targetPath = path.replace(/^\/users/, "/admin/users");
          }
        } else if (path === "/investors" || path.startsWith("/investors/")) {
          if (method === "POST" && path === "/investors") {
            targetPath = "/admin/investors/create";
          } else if (method === "PUT" && path.split("/").length === 3) {
            targetPath = `/admin/investors/update/${path.split("/")[2]}`;
          } else {
            targetPath = path.replace(/^\/investors/, "/admin/investors");
          }
        } else if (path === "/documents" || path.startsWith("/documents/")) {
          targetPath = path.replace(/^\/documents/, "/admin/documents");
        } else if (path === "/stats") {
          const token = localStorage.getItem("token") || sessionStorage.getItem("token");
          const authHeaders = new Headers(init?.headers);
          if (token && !authHeaders.has("Authorization")) {
            authHeaders.set("Authorization", `Bearer ${token}`);
          }
          try {
            const [usersRes, investorsRes, docsRes] = await Promise.all([
              originalFetch(`${apiTargetUrl}/api/admin/users`, { headers: authHeaders }),
              originalFetch(`${apiTargetUrl}/api/admin/investors`, { headers: authHeaders }),
              originalFetch(`${apiTargetUrl}/api/admin/documents`, { headers: authHeaders })
            ]);
            let userCount = 0;
            let investorCount = 0;
            let totalInvestment = 0;
            let documentCount = 0;
            let projectCount = 5;
            try {
              const localDB = loadDB();
              projectCount = localDB.projects.length;
            } catch (e) {}

            if (usersRes.ok) {
              const users = await usersRes.json();
              userCount = Array.isArray(users) ? users.length : 0;
            }
            if (investorsRes.ok) {
              const investors = await investorsRes.json();
              if (Array.isArray(investors)) {
                investorCount = investors.length;
                totalInvestment = investors.reduce((sum: number, inv: any) => sum + (Number(inv.Amount || inv.amount || inv.InvestmentAmount || inv.investmentAmount || inv.capitalAmount) || 0), 0);
              }
            }
            if (docsRes.ok) {
              const docs = await docsRes.json();
              documentCount = Array.isArray(docs) ? docs.length : 0;
            }

            const totalRoi = totalInvestment * 0.075; // Calculate 7.5% average ROI

            const statsData = {
              userCount,
              investorCount,
              totalInvestment,
              documentCount,
              projectCount,
              totalRoi
            };
            const blob = new Blob([JSON.stringify(statsData)], { type: "application/json" });
            return new Response(blob, {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          } catch (err) {
            console.error("Failed to fetch stats from external API", err);
            let projectCount = 5;
            try {
              const localDB = loadDB();
              projectCount = localDB.projects.length;
            } catch (e) {}
            const dummyStats = {
              userCount: 2,
              investorCount: 3,
              totalInvestment: 1850000,
              documentCount: 1,
              projectCount,
              totalRoi: 1850000 * 0.075
            };
            const blob = new Blob([JSON.stringify(dummyStats)], { type: "application/json" });
            return new Response(blob, {
              status: 200,
              headers: { "Content-Type": "application/json" }
            });
          }
        } else if (path === "/projects" || path.startsWith("/projects/")) {
          targetPath = path.replace(/^\/projects/, "/admin/projects");
        } else if (path === "/payments" || path.startsWith("/payments/")) {
          targetPath = path.replace(/^\/payments/, "/admin/payments");
        } else if (path === "/roi" || path.startsWith("/roi/")) {
          targetPath = path.replace(/^\/roi/, "/admin/roi");
        } else if (path === "/notifications" || path.startsWith("/notifications/")) {
          targetPath = path.replace(/^\/notifications/, "/admin/notifications");
        } else if (path === "/reports" || path.startsWith("/reports/")) {
          targetPath = path.replace(/^\/reports/, "/admin/reports");
        } else {
          shouldTranslate = false;
        }

        if (shouldTranslate) {
          const finalUrl = `${apiTargetUrl}/api${targetPath}${url.search}`;
          const newInit: RequestInit = {
            ...init,
            headers,
            body: newBody
          };
          console.log(`[Client-side Routing] ${method} ${url.pathname} -> ${finalUrl}`);
          
          try {
            const response = await originalFetch(finalUrl, newInit);
            
            // Map the response data for GET /api/users
            if (response.ok && path === "/users" && method === "GET") {
              const rawData = await response.json();
              const mappedData = (rawData || []).map((u: any) => ({
                id: u.Id || u.id,
                email: u.Email || u.email,
                name: `${u.FirstName || u.firstName || ""} ${u.LastName || u.lastName || ""}`.trim() || u.Email || u.email,
                role: u.Role || u.role || "admin",
                status: (u.IsActive !== undefined ? u.IsActive : u.isActive) ? "active" : "inactive"
              }));
              
              const blob = new Blob([JSON.stringify(mappedData)], { type: "application/json" });
              return new Response(blob, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            }

            return response;
          } catch (err) {
            console.error("[Client-side Routing Error]", err);
            throw err;
          }
        }
      }
      return originalFetch(input, init);
    };
    return;
  }

  console.log("%c[Data Source] Client-Side Persistent INTERCEPTOR Active (Mock Mode) ✔", "color: #10b981; font-weight: bold;");

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr = typeof input === "string" ? input : (input as any).url || "";
    
    // Parse URL relative to window location origin
    let url: URL;
    try {
      url = new URL(urlStr, window.location.origin);
    } catch {
      return originalFetch(input, init);
    }

    const pathname = url.pathname;
    const method = (init?.method || "GET").toUpperCase();

    // We only intercept `/api/` endpoints
    if (!pathname.startsWith("/api")) {
      return originalFetch(input, init);
    }

    console.log(`[Mock Fetch Interceptor] ${method} ${pathname}`, init);

    // Load active DB state
    const db = loadDB();

    // Parse payload body if exists
    let body: any = {};
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch (err) {
        console.warn("Could not parse request body", init.body);
      }
    }

    // Role validation header support helper
    const userRoleHeader = init?.headers ? (init.headers as any)["x-user-role"] : "";

    // helper to build response
    const jsonResponse = (data: any, status = 200) => {
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const response = new Response(blob, {
        status,
        headers: { "Content-Type": "application/json" }
      });
      return Promise.resolve(response);
    };

    // --- MAPPING API ENDPOINTS ---

    if (pathname === "/api/lookups/investor-types") {
      return jsonResponse([
        { value: 1, text: "Individual" },
        { value: 2, text: "Business" }
      ]);
    }
    if (pathname === "/api/lookups/investment-interests") {
      return jsonResponse([
        { value: 1, text: "50,000 - 100,000" },
        { value: 2, text: "100,000 - 500,000" },
        { value: 3, text: "500,000 - 1,000,000" },
        { value: 4, text: "1,000,000+" }
      ]);
    }
    if (pathname === "/api/lookups/roi-ranges") {
      return jsonResponse([
        { value: 1, text: "5.0% Fixed Minimum" },
        { value: 2, text: "7.5% Target Conservative" },
        { value: 3, text: "10.0% Growth Dynamic" },
        { value: 4, text: "12.5% High-Yield Aggressive" }
      ]);
    }
    if (pathname === "/api/lookups/roi-types") {
      return jsonResponse([
        { value: 1, text: "Fixed" },
        { value: 2, text: "Half-Yearly" },
        { value: 3, text: "Quarterly" },
        { value: 4, text: "Monthly" }
      ]);
    }
    if (pathname === "/api/lookups/banks") {
      return jsonResponse([
        { value: 1, text: "JPMorgan Chase" },
        { value: 2, text: "Bank of America" },
        { value: 3, text: "Wells Fargo" },
        { value: 4, text: "Citigroup" },
        { value: 5, text: "Goldman Sachs" }
      ]);
    }

    // 1. STATS
    if (pathname === "/api/stats") {
      const userCount = db.users.length;
      const investorCount = db.investors.length;
      const totalInvestment = db.investors.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
      const documentCount = db.documents.length;
      const projectCount = db.projects.length;

      return jsonResponse({
        userCount,
        investorCount,
        totalInvestment,
        documentCount,
        projectCount
      });
    }

    // 2. AUTHENTICATION (Login, register, magic-links, password reset)
    if (pathname === "/api/login" && method === "POST") {
      const { email, password } = body;
      const user = db.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
      if (!user) {
        return jsonResponse({ message: "Invalid email or credentials" }, 401);
      }
      if (user.password !== password) {
        return jsonResponse({ message: "Invalid email or credentials" }, 401);
      }
      if (user.status === "inactive") {
        return jsonResponse({ message: "This account has been deactivated. Contact an Administrator." }, 403);
      }
      // Success
      return jsonResponse({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
        token: `mock-token-session-${user.id}-${Date.now()}`
      });
    }

    if (pathname === "/api/register" && method === "POST") {
      const { email, name, password } = body;
      if (!email || !name || !password) {
        return jsonResponse({ message: "Email, name, and password are required." }, 400);
      }
      // Check existing permanent list
      if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return jsonResponse({ message: "Email is already taken." }, 400);
      }
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Store in pending
      db.pendingRegistrations = db.pendingRegistrations.filter(p => p.email !== email);
      db.pendingRegistrations.push({ email, name, password, otp, expiresAt });
      saveDB(db);

      console.log(`%c[Mock Email OTP] Sent to ${email} -> ${otp}`, "background: #1e293b; color: #fbbf24; padding: 4px;");

      return jsonResponse({ message: "OTP sent successfully to your email." });
    }

    if (pathname === "/api/register-verify" && method === "POST") {
      const { email, otp } = body;
      const pendingIndex = db.pendingRegistrations.findIndex(p => p.email.toLowerCase() === email?.toLowerCase() && p.otp === otp);
      if (pendingIndex === -1) {
        return jsonResponse({ message: "Invalid email or verification OTP code." }, 400);
      }
      const pending = db.pendingRegistrations[pendingIndex];
      
      // Confirm registration of verified user
      const newId = String(db.users.length + 1);
      const newUser = {
        id: newId,
        email: pending.email,
        name: pending.name,
        password: pending.password,
        role: "client" as const,
        status: "active" as const
      };

      db.users.push(newUser);
      db.pendingRegistrations.splice(pendingIndex, 1);
      saveDB(db);

      return jsonResponse({
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status },
        token: `mock-token-session-${newUser.id}-${Date.now()}`
      });
    }

    if (pathname === "/api/forgot-password" && method === "POST") {
      const { email } = body;
      const user = db.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
      if (!user) {
        return jsonResponse({ message: "A recovery link has been shared if your email is registered." });
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      db.magicLinks.push({ token, email: user.email, expiresAt, used: 0 });
      saveDB(db);

      console.log(`%c[Mock Magic Link] Dispatching password reset token: ${token}`, "background: #1e293b; color: #60a5fa; padding: 4px;");

      return jsonResponse({ message: "A recovery link has been shared if your email is registered." });
    }

    if (pathname === "/api/magic-login" && method === "POST") {
      const { token } = body;
      const link = db.magicLinks.find(l => l.token === token && l.used === 0);
      if (!link) {
        return jsonResponse({ message: "Invalid or expired magic login token." }, 401);
      }
      
      if (new Date(link.expiresAt) < new Date()) {
        return jsonResponse({ message: "This email magic token is expired." }, 401);
      }

      const user = db.users.find(u => u.email.toLowerCase() === link.email.toLowerCase());
      if (!user) {
        return jsonResponse({ message: "Magic token bound to non-existing user node." }, 404);
      }

      link.used = 1;
      saveDB(db);

      return jsonResponse({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
        token: `mock-token-session-${user.id}-${Date.now()}`
      });
    }

    if (pathname === "/api/verify-token" && method === "GET") {
      const token = url.searchParams.get("token");
      const link = db.magicLinks.find(l => l.token === token && l.used === 0);
      if (!link || new Date(link.expiresAt) < new Date()) {
        return jsonResponse({ message: "Token expired or corrupt." }, 400);
      }
      return jsonResponse({ success: true, email: link.email });
    }

    if (pathname === "/api/reset-password" && method === "POST") {
      const { email, token, newPassword } = body;
      const link = db.magicLinks.find(l => l.token === token && l.email.toLowerCase() === email?.toLowerCase());
      if (!link) {
        return jsonResponse({ message: "Failed security matches. Clean authentication is required." }, 401);
      }

      const userIndex = db.users.findIndex(u => u.email.toLowerCase() === email?.toLowerCase());
      if (userIndex === -1) {
        return jsonResponse({ message: "User not found." }, 404);
      }

      db.users[userIndex].password = newPassword;
      link.used = 1;
      saveDB(db);

      return jsonResponse({ success: true, message: "Your password has been successfully reset! You can now log in." });
    }

    // 3. USERS MANAGEMENT
    if (pathname === "/api/users" && method === "GET") {
      return jsonResponse(db.users.map(u => ({ ...u, password: "_" })));
    }

    if (pathname === "/api/users" && method === "POST") {
      const { name, email, password, role, status, firstName, lastName } = body;
      const finalName = name || `${firstName || ""} ${lastName || ""}`.trim() || "New User";
      const finalRole = role || "manager";
      if (!email) {
        return jsonResponse({ message: "Email is required." }, 400);
      }
      if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return jsonResponse({ message: "Email is already taken." }, 400);
      }

      const newUser = {
        id: String(db.users.length + 1),
        name: finalName,
        email,
        password: password || "Password123!",
        role: finalRole,
        status: status || "active"
      };

      db.users.push(newUser);
      saveDB(db);

      return jsonResponse({ id: newUser.id, name: finalName, email, role: finalRole, status: newUser.status }, 201);
    }

    // Nested User updates or CRUD Matching regex-style wildcard
    const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && method === "PUT") {
      const targetId = userMatch[1];
      const { name, email, role, status, password } = body;
      
      const userIndex = db.users.findIndex(u => String(u.id) === String(targetId));
      if (userIndex === -1) {
        return jsonResponse({ message: "User not found." }, 404);
      }

      const targetUser = db.users[userIndex];
      // Protected system admin account rule
      if (targetUser.email === "admin@investpro.com" || targetUser.name === "System Admin") {
        if (email !== targetUser.email || role !== "admin" || status !== "active") {
          return jsonResponse({ message: "The System Admin account details, role and active status are protected." }, 403);
        }
      }

      if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase() && String(u.id) !== String(targetId))) {
        return jsonResponse({ message: "Email is already taken by another user." }, 400);
      }

      db.users[userIndex] = {
        ...db.users[userIndex],
        name,
        email,
        role,
        status: status || "active",
        ...(password ? { password } : {})
      };
      saveDB(db);

      return jsonResponse({ id: targetId, name, email, role, status: status || "active" });
    }

    if (userMatch && method === "DELETE") {
      const targetId = userMatch[1];
      const targetUser = db.users.find(u => String(u.id) === String(targetId));
      if (!targetUser) {
        return jsonResponse({ message: "User profile not found." }, 404);
      }

      if (targetUser.email === "admin@investpro.com" || targetUser.name === "System Admin") {
        return jsonResponse({ message: "Safety alert: Main system administrators is blocked for deletion!" }, 403);
      }

      db.users = db.users.filter(u => String(u.id) !== String(targetId));
      saveDB(db);

      return jsonResponse({ success: true, message: "User permanently cleared." });
    }

    // Role switcher patch
    const roleMatch = pathname.match(/^\/api\/users\/([^/]+)\/role$/);
    if (roleMatch && method === "PATCH") {
      const targetId = roleMatch[1];
      const { role } = body;
      const userIndex = db.users.findIndex(u => String(u.id) === String(targetId));
      if (userIndex === -1) {
        return jsonResponse({ message: "User not found." }, 404);
      }

      const targetUser = db.users[userIndex];
      if (targetUser.email === "admin@investpro.com" || targetUser.name === "System Admin") {
        return jsonResponse({ message: "The System Admin account role is protected." }, 403);
      }

      db.users[userIndex].role = role;
      saveDB(db);

      return jsonResponse({ success: true, message: "User role updated successfully." });
    }

    // Status switcher patch
    const statusMatch = pathname.match(/^\/api\/users\/([^/]+)\/status$/);
    if (statusMatch && method === "PATCH") {
      const targetId = statusMatch[1];
      const { status } = body;
      const userIndex = db.users.findIndex(u => String(u.id) === String(targetId));
      if (userIndex === -1) {
        return jsonResponse({ message: "User not found." }, 404);
      }

      const targetUser = db.users[userIndex];
      if (targetUser.email === "admin@investpro.com" || targetUser.name === "System Admin") {
        return jsonResponse({ message: "The System Admin account active status is protected." }, 403);
      }

      db.users[userIndex].status = status;
      saveDB(db);

      return jsonResponse({ success: true, message: "User status updated successfully." });
    }

    // 4. INVESTORS DIRECTORY
    if (pathname === "/api/investors" && method === "GET") {
      return jsonResponse(db.investors);
    }

    if (pathname === "/api/investors" && method === "POST") {
      const { name, type, email, mobile, organization, amount, reg_number, interest, accreditation, country, status } = body;
      
      const newId = String(db.investors.length > 0 ? Math.max(...db.investors.map(i => Number(i.id))) + 1 : 1);
      const newInvestor = {
        id: newId,
        name,
        type: type || "Individual",
        email: email || "",
        mobile: mobile || "",
        organization: organization || "—",
        amount: Number(amount) || 0,
        reg_number: reg_number || "—",
        interest: interest || "",
        accreditation: accreditation || "Accredited",
        country: country || "",
        status: status || "active",
        date_of_onboarding: new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })
      };

      db.investors.push(newInvestor);
      saveDB(db);

      return jsonResponse(newInvestor, 201);
    }

    const investorMatch = pathname.match(/^\/api\/investors\/([^/]+)$/);
    if (investorMatch && method === "PUT") {
      const targetId = investorMatch[1];
      const { name, type, email, mobile, organization, amount, reg_number, interest, accreditation, country, status } = body;
      
      const idx = db.investors.findIndex(i => String(i.id) === String(targetId));
      if (idx === -1) {
        return jsonResponse({ message: "Investor not found." }, 404);
      }

      db.investors[idx] = {
        ...db.investors[idx],
        name,
        type,
        email,
        mobile,
        organization,
        amount: Number(amount) || 0,
        reg_number,
        interest,
        accreditation,
        country,
        status: status || "active"
      };
      saveDB(db);

      return jsonResponse(db.investors[idx]);
    }

    if (investorMatch && method === "DELETE") {
      const targetId = investorMatch[1];
      db.investors = db.investors.filter(i => String(i.id) !== String(targetId));
      saveDB(db);
      return jsonResponse({ success: true, message: "Investor removed successfully." });
    }

    // 5. DOCUMENTS REPOSITORY
    if (pathname === "/api/documents" && method === "GET") {
      return jsonResponse(db.documents);
    }

    if (pathname === "/api/documents" && method === "POST") {
      const { title, type, size, url, uploaded_by } = body;
      
      const newId = String(db.documents.length > 0 ? Math.max(...db.documents.map(d => Number(d.id))) + 1 : 1);
      const newDoc = {
        id: newId,
        title,
        type,
        size,
        url: url || "#",
        uploaded_by: uploaded_by || "System Admin",
        created_at: new Date().toISOString()
      };

      db.documents.push(newDoc);
      saveDB(db);

      return jsonResponse(newDoc, 201);
    }

    const docMatch = pathname.match(/^\/api\/documents\/([^/]+)$/);
    if (docMatch && method === "DELETE") {
      const targetId = docMatch[1];
      db.documents = db.documents.filter(d => String(d.id) !== String(targetId));
      saveDB(db);
      return jsonResponse({ success: true, message: "Document removed." });
    }

    // 6. PROJECTS INTERFACES
    if (pathname === "/api/projects" && method === "GET") {
      return jsonResponse(db.projects);
    }

    if (pathname === "/api/projects" && method === "POST") {
      const { title, description, budget, duration, start_date, end_date, comments, status } = body;
      const newId = String(db.projects.length > 0 ? Math.max(...db.projects.map(p => Number(p.id))) + 1 : 1);
      
      const newProj = {
        id: newId,
        title,
        description,
        budget: Number(budget) || 0,
        duration,
        start_date,
        end_date,
        comments,
        status: status || "active"
      };

      db.projects.push(newProj);
      saveDB(db);

      return jsonResponse(newProj, 201);
    }

    const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch && method === "PUT") {
      const targetId = projectMatch[1];
      const { title, description, budget, duration, start_date, end_date, comments, status } = body;

      const idx = db.projects.findIndex(p => String(p.id) === String(targetId));
      if (idx === -1) {
        return jsonResponse({ message: "Project not found." }, 404);
      }

      db.projects[idx] = {
        ...db.projects[idx],
        title,
        description,
        budget: Number(budget) || 0,
        duration,
        start_date,
        end_date,
        comments,
        status: status || "active"
      };
      saveDB(db);

      return jsonResponse(db.projects[idx]);
    }

    if (projectMatch && method === "DELETE") {
      const targetId = projectMatch[1];
      db.projects = db.projects.filter(p => String(p.id) !== String(targetId));
      saveDB(db);
      return jsonResponse({ success: true });
    }

    const projectStatusMatch = pathname.match(/^\/api\/projects\/([^/]+)\/status$/);
    if (projectStatusMatch && method === "PATCH") {
      const targetId = projectStatusMatch[1];
      const { status } = body;

      const idx = db.projects.findIndex(p => String(p.id) === String(targetId));
      if (idx === -1) {
        return jsonResponse({ message: "Project not found." }, 404);
      }

      db.projects[idx].status = status;
      saveDB(db);

      return jsonResponse({ success: true, message: "Project status modified." });
    }
    

    // Fallback error
    return Promise.resolve(new Response(JSON.stringify({ message: `Mock route ${method} ${pathname} not found.` }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    }));
  };
}
