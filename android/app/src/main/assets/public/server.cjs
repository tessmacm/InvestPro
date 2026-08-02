var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_vite = require("vite");
var import_swagger_jsdoc = __toESM(require("swagger-jsdoc"), 1);
var import_swagger_ui_express = __toESM(require("swagger-ui-express"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var PORT = 3005;
var db = {
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
      organization: "\u2014",
      amount: 5e5,
      reg_number: "\u2014",
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
      amount: 125e4,
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
      name: "Michael Scott",
      type: "Individual",
      email: "michael@example.com",
      mobile: "+1212121234",
      organization: "\u2014",
      amount: 75e4,
      reg_number: "\u2014",
      interest: "Real Estate",
      accreditation: "Non-Accredited",
      country: "Canada",
      status: "inactive",
      date_of_onboarding: "08 Jan 2024",
      last_investment_date: "2024-01-08T12:00:00Z"
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
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3).toISOString()
    },
    {
      id: "2",
      title: "Investor Agreement",
      type: "DOCX",
      size: "1.1 MB",
      url: "#",
      uploaded_by: "System Admin",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3).toISOString()
    }
  ],
  projects: [
    {
      id: "1",
      title: "InvestPro Mobile App",
      description: "A modern mobile app for tracking real-time investments.",
      budget: 25e4,
      duration: "120 Days",
      start_date: "01 May 2024",
      end_date: "28 Aug 2024",
      comments: "Ensure secure transactions and beautiful responsive visual design.",
      status: "active"
    }
  ],
  magicLinks: [],
  pendingRegistrations: []
};
var verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.headers["x-user-role"];
    const userId = req.headers["x-user-id"];
    if (!userRole || !userId) {
      return res.status(401).json({ message: "Authentication required. Missing user identity headers." });
    }
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Unauthorized role privilege level." });
    }
    next();
  };
};
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.use((0, import_cors.default)());
  app.use("/api", async (req, res, next) => {
    let apiTargetUrl = process.env.BACKEND_API_URL || process.env.VITE_API_URL || "";
    if (apiTargetUrl === "/") {
      apiTargetUrl = "";
    }
    if (!apiTargetUrl) {
      return next();
    }
    let targetPath = req.path;
    let shouldProxy = false;
    if (req.path === "/login") {
      targetPath = "/Auth/login";
      shouldProxy = true;
    } else if (req.path === "/register") {
      targetPath = "/Auth/register";
      shouldProxy = true;
    } else if (req.path === "/register-verify") {
      targetPath = "/Auth/register-verify";
      shouldProxy = true;
    } else if (req.path === "/forgot-password") {
      targetPath = "/Auth/forgot-password";
      shouldProxy = true;
    } else if (req.path === "/reset-password") {
      targetPath = "/Auth/reset-password";
      shouldProxy = true;
    } else if (req.path === "/magic-login") {
      targetPath = "/Auth/magic-login";
      shouldProxy = true;
    } else if (req.path === "/verify-token") {
      targetPath = "/Auth/verify-token";
      shouldProxy = true;
    } else if (req.path === "/users" || req.path.startsWith("/users/")) {
      shouldProxy = true;
      if (req.method === "PUT" && req.path.split("/").length === 3) {
        targetPath = `/admin/users/${req.path.split("/")[2]}/role`;
      } else {
        targetPath = req.path.replace(/^\/users/, "/admin/users");
      }
    } else if (req.path === "/investors" || req.path.startsWith("/investors/")) {
      shouldProxy = true;
      if (req.method === "POST" && req.path === "/investors") {
        targetPath = "/admin/investors/create";
      } else if (req.method === "PUT" && req.path.split("/").length === 3) {
        targetPath = `/admin/investors/update/${req.path.split("/")[2]}`;
      } else {
        targetPath = req.path.replace(/^\/investors/, "/admin/investors");
      }
    } else if (req.path === "/documents" || req.path.startsWith("/documents/")) {
      shouldProxy = true;
      targetPath = req.path.replace(/^\/documents/, "/admin/documents");
    }
    if (!shouldProxy) {
      console.log(`[Proxy Bypass] Falling back to Mock DB for endpoint: ${req.method} /api${req.path}`);
      return next();
    }
    try {
      const targetUrl = `${apiTargetUrl.replace(/\/$/, "")}/api${targetPath}${req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""}`;
      console.log(`[Proxy] Routing ${req.method} /api${req.path} to External API: ${targetUrl}`);
      const headers = {};
      const forbiddenHeaders = [
        "host",
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "content-length",
        "expect"
      ];
      for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (value && typeof value === "string") {
          if (!forbiddenHeaders.includes(lowerKey) && !lowerKey.startsWith(":")) {
            headers[key] = value;
          }
        }
      }
      const options = {
        method: req.method,
        headers
      };
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.body) {
        options.body = JSON.stringify(req.body);
      }
      const response = await fetch(targetUrl, options);
      const responseData = await response.text();
      const skipResponseHeaders = ["connection", "content-length", "transfer-encoding", "content-encoding", "keep-alive"];
      response.headers.forEach((val, key) => {
        if (!skipResponseHeaders.includes(key.toLowerCase())) {
          res.setHeader(key, val);
        }
      });
      res.status(response.status).send(responseData);
    } catch (err) {
      console.error("[External Proxy Server Error]", err);
      res.status(502).json({
        message: `Bad Gateway. Failed to connect to external API at ${apiTargetUrl}`,
        error: err.message
      });
    }
  });
  app.get("/api/stats", (req, res) => {
    const userCount = db.users.length;
    const investorCount = db.investors.length;
    const totalInvestment = db.investors.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
    const documentCount = db.documents.length;
    const projectCount = db.projects.length;
    res.json({
      userCount,
      investorCount,
      totalInvestment,
      documentCount,
      projectCount
    });
  });
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find((u) => u.email.toLowerCase() === email?.toLowerCase());
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or credentials" });
    }
    if (user.status === "inactive") {
      return res.status(403).json({ message: "This account has been deactivated." });
    }
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
      token: `session-${user.id}-${Date.now()}`
    });
  });
  app.post("/api/register", (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ message: "Email, name, and password are required." });
    }
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    db.pendingRegistrations.push({ email, name, password, otp });
    console.log(`[Server Registration OTP] Sent ${otp} to ${email}`);
    res.json({ message: "OTP sent successfully to your email." });
  });
  app.post("/api/register-verify", (req, res) => {
    const { email, otp } = req.body;
    const idx = db.pendingRegistrations.findIndex((p) => p.email.toLowerCase() === email?.toLowerCase() && p.otp === otp);
    if (idx === -1) {
      return res.status(400).json({ message: "Invalid OTP verification code." });
    }
    const pending = db.pendingRegistrations[idx];
    const newUser = {
      id: String(db.users.length + 1),
      email: pending.email,
      name: pending.name,
      password: pending.password,
      role: "client",
      status: "active"
    };
    db.users.push(newUser);
    db.pendingRegistrations.splice(idx, 1);
    res.json({
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status },
      token: `session-${newUser.id}-${Date.now()}`
    });
  });
  app.post("/api/forgot-password", (req, res) => {
    const { email } = req.body;
    const token = import_crypto.default.randomUUID?.() || Math.random().toString(36).substring(7);
    db.magicLinks.push({ token, email, used: false });
    console.log(`[Server Forgot Password Link] Reset token: ${token}`);
    res.json({ message: "A recovery link has been shared if your email is registered." });
  });
  app.post("/api/magic-login", (req, res) => {
    const { token } = req.body;
    const link = db.magicLinks.find((l) => l.token === token && !l.used);
    if (!link) {
      return res.status(401).json({ message: "Invalid magic token." });
    }
    const user = db.users.find((u) => u.email.toLowerCase() === link.email.toLowerCase()) || db.users[0];
    link.used = true;
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
      token: `session-${user.id}-${Date.now()}`
    });
  });
  app.get("/api/verify-token", (req, res) => {
    const token = req.query.token;
    const link = db.magicLinks.find((l) => l.token === token);
    if (!link) {
      return res.status(400).json({ message: "Token expired or corrupt." });
    }
    res.json({ success: true, email: link.email });
  });
  app.post("/api/reset-password", (req, res) => {
    const { email, token, newPassword } = req.body;
    const user = db.users.find((u) => u.email.toLowerCase() === email?.toLowerCase());
    if (user) {
      user.password = newPassword;
    }
    res.json({ success: true, message: "Your password has been successfully reset!" });
  });
  app.get("/api/users", verifyRole(["admin"]), (req, res) => {
    res.json(db.users.map(({ password, ...u }) => u));
  });
  app.post("/api/users", verifyRole(["admin"]), (req, res) => {
    const { name, email, role, status } = req.body;
    const newUser = {
      id: String(db.users.length + 1),
      name,
      email,
      password: "password",
      role,
      status: status || "active"
    };
    db.users.push(newUser);
    res.status(201).json(newUser);
  });
  app.put("/api/users/:id", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { name, email, role, status } = req.body;
    const user = db.users.find((u) => u.id === id);
    if (user) {
      user.name = name;
      user.email = email;
      user.role = role;
      user.status = status;
    }
    res.json(user);
  });
  app.delete("/api/users/:id", verifyRole(["admin"]), (req, res) => {
    db.users = db.users.filter((u) => u.id !== req.params.id);
    res.json({ success: true });
  });
  app.patch("/api/users/:id/role", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const user = db.users.find((u) => u.id === id);
    if (user) {
      user.role = role;
    }
    res.json({ success: true });
  });
  app.patch("/api/users/:id/status", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = db.users.find((u) => u.id === id);
    if (user) {
      user.status = status;
    }
    res.json({ success: true });
  });
  app.get("/api/investors", verifyRole(["admin", "manager", "client"]), (req, res) => {
    res.json(db.investors);
  });
  app.post("/api/investors", verifyRole(["admin", "manager"]), (req, res) => {
    const newInvestor = {
      ...req.body,
      id: String(db.investors.length + 1),
      date_of_onboarding: (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB")
    };
    db.investors.push(newInvestor);
    res.status(201).json(newInvestor);
  });
  app.put("/api/investors/:id", verifyRole(["admin", "manager"]), (req, res) => {
    const idx = db.investors.findIndex((i) => i.id === req.params.id);
    if (idx !== -1) {
      db.investors[idx] = { ...db.investors[idx], ...req.body };
    }
    res.json(db.investors[idx]);
  });
  app.delete("/api/investors/:id", verifyRole(["admin", "manager"]), (req, res) => {
    db.investors = db.investors.filter((i) => i.id !== req.params.id);
    res.json({ success: true });
  });
  app.get("/api/documents", verifyRole(["admin", "manager", "client"]), (req, res) => {
    res.json(db.documents);
  });
  app.post("/api/documents", verifyRole(["admin", "manager"]), (req, res) => {
    const newDoc = {
      ...req.body,
      id: String(db.documents.length + 1),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.documents.push(newDoc);
    res.status(201).json(newDoc);
  });
  app.delete("/api/documents/:id", verifyRole(["admin", "manager"]), (req, res) => {
    db.documents = db.documents.filter((d) => d.id !== req.params.id);
    res.json({ success: true });
  });
  app.get("/api/projects", verifyRole(["admin", "manager", "client"]), (req, res) => {
    res.json(db.projects);
  });
  app.post("/api/projects", verifyRole(["admin", "manager"]), (req, res) => {
    const newProj = {
      ...req.body,
      id: String(db.projects.length + 1)
    };
    db.projects.push(newProj);
    res.status(201).json(newProj);
  });
  app.put("/api/projects/:id", verifyRole(["admin", "manager"]), (req, res) => {
    const idx = db.projects.findIndex((p) => p.id === req.params.id);
    if (idx !== -1) {
      db.projects[idx] = { ...db.projects[idx], ...req.body };
    }
    res.json(db.projects[idx]);
  });
  app.patch("/api/projects/:id/status", verifyRole(["admin", "manager"]), (req, res) => {
    const proj = db.projects.find((p) => p.id === req.params.id);
    if (proj) {
      proj.status = req.body.status;
    }
    res.json({ success: true });
  });
  app.delete("/api/projects/:id", verifyRole(["admin", "manager"]), (req, res) => {
    db.projects = db.projects.filter((p) => p.id !== req.params.id);
    res.json({ success: true });
  });
  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "InvestPro Portfolio management API Spec",
        version: "1.0.0",
        description: "Portfolio management and investors tracking API"
      }
    },
    apis: []
  };
  const swaggerDocs = (0, import_swagger_jsdoc.default)(swaggerOptions);
  app.use("/api/docs", import_swagger_ui_express.default.serve, import_swagger_ui_express.default.setup(swaggerDocs));
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
