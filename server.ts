import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Replicate the mock data in-memory for the Express dev server fallback
const db = {
  users: [
    {
      id: "1",
      email: "admin@investpro.com",
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
      name: "Michael Scott",
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
      id: "1",
      title: "InvestPro Mobile App",
      description: "A modern mobile app for tracking real-time investments.",
      budget: 250000,
      duration: "120 Days",
      start_date: "01 May 2024",
      end_date: "28 Aug 2024",
      comments: "Ensure secure transactions and beautiful responsive visual design.",
      status: "active"
    }
  ],
  magicLinks: [] as any[],
  pendingRegistrations: [] as any[]
};

// Authentication verify helper
const verifyRole = (allowedRoles: string[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userRole = req.headers["x-user-role"] as string;
    const userId = req.headers["x-user-id"] as string;

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
  const app = express();
  app.use(express.json());
  app.use(cors());

  // Dynamic Data Source Direct URL Proxy Handler
  app.use("/api", async (req, res, next) => {
    const apiTargetUrl = process.env.VITE_API_URL || "";
    if (!apiTargetUrl) {
      // No external API URL defined, proceed with the in-memory mock handler endpoints below
      return next();
    }

    // Proxy requests to the external API
    try {
      const targetUrl = `${apiTargetUrl.replace(/\/$/, "")}/api${req.path}${req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""}`;
      console.log(`[Proxy] Routing ${req.method} /api${req.path} to External API: ${targetUrl}`);
      
      const headers: Record<string, string> = {};
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
        "content-length"
      ];
      for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (value && typeof value === "string") {
          if (!forbiddenHeaders.includes(lowerKey) && !lowerKey.startsWith(":")) {
            headers[key] = value;
          }
        }
      }

      const options: any = {
        method: req.method,
        headers,
      };

      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.body) {
        options.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, options);
      const responseData = await response.text();

      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      res.status(response.status).send(responseData);
    } catch (err: any) {
      console.error("[External Proxy Server Error]", err);
      res.status(502).json({
        message: `Bad Gateway. Failed to connect to external API at ${apiTargetUrl}`,
        error: err.message
      });
    }
  });

  // --- Mock Backend routes implementation ---

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
    const user = db.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    db.pendingRegistrations.push({ email, name, password, otp });
    console.log(`[Server Registration OTP] Sent ${otp} to ${email}`);
    res.json({ message: "OTP sent successfully to your email." });
  });

  app.post("/api/register-verify", (req, res) => {
    const { email, otp } = req.body;
    const idx = db.pendingRegistrations.findIndex(p => p.email.toLowerCase() === email?.toLowerCase() && p.otp === otp);
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
    const token = crypto.randomUUID?.() || Math.random().toString(36).substring(7);
    db.magicLinks.push({ token, email, used: false });
    console.log(`[Server Forgot Password Link] Reset token: ${token}`);
    res.json({ message: "A recovery link has been shared if your email is registered." });
  });

  app.post("/api/magic-login", (req, res) => {
    const { token } = req.body;
    const link = db.magicLinks.find(l => l.token === token && !l.used);
    if (!link) {
      return res.status(401).json({ message: "Invalid magic token." });
    }
    const user = db.users.find(u => u.email.toLowerCase() === link.email.toLowerCase()) || db.users[0];
    link.used = true;
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
      token: `session-${user.id}-${Date.now()}`
    });
  });

  app.get("/api/verify-token", (req, res) => {
    const token = req.query.token as string;
    const link = db.magicLinks.find(l => l.token === token);
    if (!link) {
      return res.status(400).json({ message: "Token expired or corrupt." });
    }
    res.json({ success: true, email: link.email });
  });

  app.post("/api/reset-password", (req, res) => {
    const { email, token, newPassword } = req.body;
    const user = db.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
    if (user) {
      user.password = newPassword;
    }
    res.json({ success: true, message: "Your password has been successfully reset!" });
  });

  // Users routes
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
    const user = db.users.find(u => u.id === id);
    if (user) {
      user.name = name;
      user.email = email;
      user.role = role;
      user.status = status;
    }
    res.json(user);
  });

  app.delete("/api/users/:id", verifyRole(["admin"]), (req, res) => {
    db.users = db.users.filter(u => u.id !== req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/users/:id/role", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const user = db.users.find(u => u.id === id);
    if (user) {
      user.role = role;
    }
    res.json({ success: true });
  });

  app.patch("/api/users/:id/status", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const user = db.users.find(u => u.id === id);
    if (user) {
      user.status = status;
    }
    res.json({ success: true });
  });

  // Investors routes
  app.get("/api/investors", verifyRole(["admin", "manager", "client"]), (req, res) => {
    res.json(db.investors);
  });

  app.post("/api/investors", verifyRole(["admin", "manager"]), (req, res) => {
    const newInvestor = {
      ...req.body,
      id: String(db.investors.length + 1),
      date_of_onboarding: new Date().toLocaleDateString("en-GB")
    };
    db.investors.push(newInvestor);
    res.status(201).json(newInvestor);
  });

  app.put("/api/investors/:id", verifyRole(["admin", "manager"]), (req, res) => {
    const idx = db.investors.findIndex(i => i.id === req.params.id);
    if (idx !== -1) {
      db.investors[idx] = { ...db.investors[idx], ...req.body };
    }
    res.json(db.investors[idx]);
  });

  app.delete("/api/investors/:id", verifyRole(["admin", "manager"]), (req, res) => {
    db.investors = db.investors.filter(i => i.id !== req.params.id);
    res.json({ success: true });
  });

  // Documents routes
  app.get("/api/documents", verifyRole(["admin", "manager", "client"]), (req, res) => {
    res.json(db.documents);
  });

  app.post("/api/documents", verifyRole(["admin", "manager"]), (req, res) => {
    const newDoc = {
      ...req.body,
      id: String(db.documents.length + 1),
      created_at: new Date().toISOString()
    };
    db.documents.push(newDoc);
    res.status(201).json(newDoc);
  });

  app.delete("/api/documents/:id", verifyRole(["admin", "manager"]), (req, res) => {
    db.documents = db.documents.filter(d => d.id !== req.params.id);
    res.json({ success: true });
  });

  // Projects routes
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
    const idx = db.projects.findIndex(p => p.id === req.params.id);
    if (idx !== -1) {
      db.projects[idx] = { ...db.projects[idx], ...req.body };
    }
    res.json(db.projects[idx]);
  });

  app.patch("/api/projects/:id/status", verifyRole(["admin", "manager"]), (req, res) => {
    const proj = db.projects.find(p => p.id === req.params.id);
    if (proj) {
      proj.status = req.body.status;
    }
    res.json({ success: true });
  });

  app.delete("/api/projects/:id", verifyRole(["admin", "manager"]), (req, res) => {
    db.projects = db.projects.filter(p => p.id !== req.params.id);
    res.json({ success: true });
  });

  // Swagger Documentation Setup
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
  const swaggerDocs = swaggerJsdoc(swaggerOptions);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
