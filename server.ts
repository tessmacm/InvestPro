import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import crypto from "crypto";

const db = new Database("investpro.db");

// Rebuild users table if older design with ('admin', 'user', 'guest') check constraint is active.
try {
  const containsOldRoles = db.prepare("SELECT count(*) as count FROM sqlite_schema WHERE type = 'table' AND name = 'users' AND sql LIKE '%CHECK (role IN (''admin'', ''user'', ''guest''))%'").get() as any;
  if (containsOldRoles && containsOldRoles.count > 0) {
    console.log("[Migration] Found old roles constraints. Rebuilding users table with ('admin', 'manager', 'client') constraints.");
    db.exec("DROP TABLE IF EXISTS users;");
  }
} catch (migErr) {
  console.log("Could not drop/migrate users table:", migErr);
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'client')),
    status TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS investors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    organization TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    last_investment_date TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    size TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget REAL NOT NULL,
    duration TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    comments TEXT,
    status TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS magic_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pending_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migration check to add status column if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
} catch (e) {
  // Column already exists or table doesn't exist yet, ignore
}

// Safe migration check to add extra columns to investors table
const investorColumns = [
  { name: "type", type: "TEXT NOT NULL DEFAULT 'Individual'" },
  { name: "email", type: "TEXT NOT NULL DEFAULT ''" },
  { name: "mobile", type: "TEXT NOT NULL DEFAULT ''" },
  { name: "reg_number", type: "TEXT NOT NULL DEFAULT ''" },
  { name: "interest", type: "TEXT NOT NULL DEFAULT ''" },
  { name: "accreditation", type: "TEXT NOT NULL DEFAULT 'Accredited'" },
  { name: "country", type: "TEXT NOT NULL DEFAULT ''" },
  { name: "date_of_onboarding", type: "TEXT DEFAULT ''" }
];

for (const col of investorColumns) {
  try {
    db.prepare(`ALTER TABLE investors ADD COLUMN ${col.name} ${col.type}`).run();
  } catch (e) {
    // Column already exists, ignore
  }
}

try {
  const currentInvCount = db.prepare("SELECT count(*) as count FROM investors").get() as { count: number };
  if (currentInvCount.count <= 2) {
    db.prepare("DELETE FROM investors").run();
    const insertInv = db.prepare(`
      INSERT INTO investors (
        name, type, email, mobile, organization, amount, reg_number, interest, accreditation, country, status, date_of_onboarding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertInv.run("John Doe", "Individual", "john@example.com", "+1234567890", "—", 500000, "—", "Venture Capital", "Accredited", "United States", "active", "15 May 2024");
    insertInv.run("ABC Ventures", "Business", "contact@abc.com", "+1987654321", "ABC Ventures Ltd.", 1250000, "REG-102948", "Private Equity", "Accredited", "United Kingdom", "active", "12 Mar 2024");
    insertInv.run("Michael Smith", "Individual", "michael@example.com", "+1212121234", "—", 750000, "—", "Real Estate", "Non-Accredited", "Canada", "inactive", "08 Jan 2024");
    insertInv.run("XYZ Capital", "Business", "info@xyzcapital.com", "+1122334455", "XYZ Capital Inc.", 2000000, "REG-993812", "Venture Capital", "Accredited", "India", "active", "24 Apr 2024");
    insertInv.run("Sarah Johnson", "Individual", "sarah@example.com", "+1212121212", "—", 350000, "—", "Stocks & Bonds", "Accredited", "United States", "active", "30 May 2024");
  }
} catch (e) {
  console.error("Failed to seed rich investor list:", e);
}

// Resend Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_YkKpkP3K_Bh6LqvHk8kvwCiFNtUPd4QAT";

async function sendEmail(to: string, subject: string, htmlContent: string) {
  try {
    console.log(`[Resend Engine] Attempting to send email to: ${to} with subject: "${subject}"`);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "InvestPro <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      console.error("[Resend Engine] Resend API Error Response:", data);
      return { success: false, error: data.message || "Failed to send email" };
    }

    console.log("[Resend Engine] Email sent successfully!", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("[Resend Engine] Resend connection/network error:", error);
    return { success: false, error: error.message || "Connection timed out" };
  }
}

// Seed Initial Data if empty
const rowCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (rowCount.count === 0) {
  const insert = db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
  insert.run("admin@investpro.com", "password", "System Admin", "admin");
  insert.run("manager@investpro.com", "password", "System Manager", "manager");
  insert.run("client@investpro.com", "password", "System Client", "client");

  const insertInv = db.prepare(`
    INSERT INTO investors (
      name, type, email, mobile, organization, amount, reg_number, interest, accreditation, country, status, date_of_onboarding
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertInv.run("John Doe", "Individual", "john@example.com", "+1234567890", "—", 500000, "—", "Venture Capital", "Accredited", "United States", "active", "15 May 2024");
  insertInv.run("ABC Ventures", "Business", "contact@abc.com", "+1987654321", "ABC Ventures Ltd.", 1250000, "REG-102948", "Private Equity", "Accredited", "United Kingdom", "active", "12 Mar 2024");
  insertInv.run("Michael Smith", "Individual", "michael@example.com", "+1212121234", "—", 750000, "—", "Real Estate", "Non-Accredited", "Canada", "inactive", "08 Jan 2024");
  insertInv.run("XYZ Capital", "Business", "info@xyzcapital.com", "+1122334455", "XYZ Capital Inc.", 2000000, "REG-993812", "Venture Capital", "Accredited", "India", "active", "24 Apr 2024");
  insertInv.run("Sarah Johnson", "Individual", "sarah@example.com", "+1212121212", "—", 350000, "—", "Stocks & Bonds", "Accredited", "United States", "active", "30 May 2024");

  const insertDoc = db.prepare("INSERT INTO documents (title, type, size, url, uploaded_by) VALUES (?, ?, ?, ?, ?)");
  insertDoc.run("Q4 Financial Report", "PDF", "2.4 MB", "#", "System Admin");
  insertDoc.run("Investor Agreement", "DOCX", "1.1 MB", "#", "System Admin");
}

// Seed Projects if empty
try {
  const projectCount = db.prepare("SELECT count(*) as count FROM projects").get() as { count: number };
  if (projectCount.count === 0) {
    const insertProj = db.prepare(`
      INSERT INTO projects (title, description, budget, duration, start_date, end_date, comments, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertProj.run(
      "InvestPro Mobile App",
      "A modern mobile application for investors to track portfolios, analyze performance and manage investments on the go. The InvestPro Mobile App will provide investors with real-time portfolio tracking, market insights, secure transactions, and investment recommendations. The app aims to deliver a seamless and intuitive experience for both new and experienced investors.",
      250000,
      "120 Days",
      "01 May 2024",
      "28 Aug 2024",
      "Focus on user experience, security and performance optimization.",
      "active"
    );
    insertProj.run(
      "Investor Dashboard Redesign",
      "Revamping the client-facing investor dashboard with modern UI/UX components. Simplify navigation, accelerate reporting modules, and integrate interactive charts for a sleeker financial review workflow.",
      180000,
      "90 Days",
      "10 Apr 2024",
      "08 Jul 2024",
      "Ensure robust mobile responsiveness and accessibility compliance across major browsers.",
      "active"
    );
    insertProj.run(
      "Payment Gateway Integration",
      "Enable multi-currency seamless deposits and withdrawals by partnering with Stripe and global merchant processors. Emphasize compliance, localized credit systems, and bank transfers.",
      300000,
      "150 Days",
      "05 Feb 2024",
      "04 Jul 2024",
      "Mandatory end-to-end security audit and penetration testing before deployment to staging environments.",
      "active"
    );
    insertProj.run(
      "Website Revamp",
      "A complete redesign of the public-facing corporate website to improve user positioning, modernize the brand voice, and introduce streamlined onboarding sections.",
      220000,
      "100 Days",
      "15 Mar 2024",
      "22 Jun 2024",
      "Work closely with marketing to align on copy standards and dynamic landing page graphics.",
      "active"
    );
    insertProj.run(
      "CRM System Development",
      "In-house customer relationship management platform personalized for investor relationship managers to ease tracking emails, phone calls, interactions, and potential leads.",
      400000,
      "180 Days",
      "01 Jan 2024",
      "29 Jun 2024",
      "Transition from legacy spreadsheets to this centralized CRM platform. Provide comprehensive user training sessions.",
      "inactive"
    );
    insertProj.run(
      "Marketing Automation Tool",
      "A specialized service built to trigger automated email newsletters, custom onboarding tips, and localized promotional events for prospective and existing VIP partners.",
      150000,
      "60 Days",
      "20 Mar 2024",
      "19 May 2024",
      "Focus intensely on fine-tuning bounce rates and delivery optimization metrics.",
      "inactive"
    );
    insertProj.run(
      "Data Analytics Platform",
      "Deep business intelligence platform analyzing aggregate user portfolios, transaction loops, and regional interest margins to extract insights for structural advisory boards.",
      500000,
      "200 Days",
      "01 Feb 2024",
      "20 Aug 2024",
      "Implement highly secure enterprise-scale data warehouses and optimized complex database views.",
      "active"
    );
    insertProj.run(
      "Customer Support Portal",
      "An integrated service portal introducing smart automated triage chatbots, persistent live desk assistants, and comprehensive knowledgebase search layers.",
      250000,
      "90 Days",
      "18 Apr 2024",
      "16 Jul 2024",
      "Ensure live chat operates smoothly with minimal lag and connects seamlessly to support backends.",
      "active"
    );
  }
} catch (e) {
  console.error("Failed to seed projects table:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());
  app.use(cors());

  // Swagger Documentation
  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "InvestPro API",
        version: "1.0.0",
        description: "API documentation for the InvestPro investment platform",
      },
      servers: [
        {
          url: "https://nexus-multi-role-platform-138544333120.asia-southeast1.run.app",
          description: "Test server",
        },
      ],
    },
    apis: ["./server.ts"],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve swagger specification directly in JSON format
  app.get("/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(swaggerSpec);
  });

  // Serve Postman collection dynamically, resolving current protocol and host
  app.get("/api/postman-collection", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "postman_collection.json");
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const collection = JSON.parse(fileContent);
        
        // Dynamically override the baseUrl variable in the response to match the incoming request host
        const host = req.get("host");
        const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
        const protocol = isHttps ? "https" : "http";
        const currentUrl = `${protocol}://${host}`;
        
        if (collection.variable && Array.isArray(collection.variable)) {
          collection.variable = collection.variable.map((v: any) => {
            if (v.key === "baseUrl") {
              return { ...v, value: currentUrl };
            }
            return v;
          });
        }
        
        res.setHeader("Content-Type", "application/json");
        res.json(collection);
      } else {
        res.status(404).json({ message: "Postman collection file not found on disk" });
      }
    } catch (e: any) {
      console.error("Failed to read postman collection:", e);
      res.status(500).json({ message: "Failed to load Postman collection", error: e.message });
    }
  });

  /**
   * @openapi
   * /api/login:
   *   post:
   *     summary: User login
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;

      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        userWithoutPassword.id = String(userWithoutPassword.id);
        res.json({ token: "mock-jwt-token", user: userWithoutPassword });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (err) {
      res.status(500).json({ message: "Database error" });
    }
  });

  /**
   * @openapi
   * /api/register:
   *   post:
   *     summary: Request user registration. Generates and mails a 6-digit OTP code.
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               name:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: OTP dispatched successfully
   *       400:
   *         description: User already exists
   */
  app.post("/api/register", (req, res) => {
    const { email, name, password } = req.body;
    try {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Generate a highly secure 6-digit verification code
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

      // Remove any stale unregistered sessions with the same email
      db.prepare("DELETE FROM pending_registrations WHERE email = ?").run(email);

      // Insert new session
      db.prepare("INSERT INTO pending_registrations (email, name, password, otp, expires_at) VALUES (?, ?, ?, ?, ?)").run(email, name, password, otp, expiresAt);

      // Construct visually rich OTP layout
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Verify Your Account</h1>
          </div>
          <div style="padding: 32px 24px; text-align: center;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; text-align: left;">Hello <strong>${name}</strong>,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; text-align: left;">
              Thank you for signing up to the InvestPro Platform. To finalize your account setup, please enter the following 6-digit verification code:
            </p>
            
            <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: inline-block; margin: 12px 0 24px 0; text-align: center; min-width: 200px;">
              <span style="color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Your OTP Code</span>
              <strong style="color: #1e3a8a; font-size: 32px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 4px; font-weight: 800;">${otp}</strong>
            </div>

            <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0; text-align: left;">
              This code will expire in exactly 15 minutes. If you did not request this code, please ignore this email.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">InvestPro Platform | Live Sandbox Mode</p>
          </div>
        </div>
      `;

      sendEmail(email, `${otp} is your InvestPro account verification code`, emailHtml).catch(e => {
        console.error("Resend delivery failed for registration requested OTP:", e);
      });

      res.json({ 
        message: "Verification OTP has been sent successfully to your email.", 
        email,
        otp: otp // Expose OTP in response for sandboxed testing environment
      });
    } catch (err) {
      res.status(500).json({ message: "Registration initiation failed" });
    }
  });

  /**
   * @openapi
   * /api/register-verify:
   *   post:
   *     summary: Verify registered user via OTP code and complete login
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               otp:
   *                 type: string
   *     responses:
   *       200:
   *         description: Verification complete, login success
   *       400:
   *         description: Invalid/expired code or user exists
   */
  app.post("/api/register-verify", (req, res) => {
    const { email, otp } = req.body;
    try {
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP code are required" });
      }

      const pending = db.prepare("SELECT * FROM pending_registrations WHERE email = ? ORDER BY id DESC LIMIT 1").get(email) as any;
      if (!pending) {
        return res.status(400).json({ message: "No pending registration found for this email. Please try signing up again." });
      }

      const isExpired = new Date(pending.expires_at).getTime() < Date.now();
      if (isExpired) {
        return res.status(400).json({ message: "Your verification code has expired. Please sign up again to generate another." });
      }

      if (pending.otp.trim() !== otp.trim()) {
        return res.status(400).json({ message: "The verification code you entered is invalid. Please try again." });
      }

      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) {
        return res.status(400).json({ message: "This email is already registered and verified." });
      }

      // Create permanent verified user
      const info = db.prepare("INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)").run(pending.email, pending.name, pending.password, "client");
      const newUser = { id: String(info.lastInsertRowid), email: pending.email, name: pending.name, role: "client" };

      // Dispatch Welcome Email
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          <div style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Welcome to InvestPro</h1>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>${pending.name}</strong>,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Your email has been verified successfully! Thank you for registering at the InvestPro Platform. Your account has been initialized and is ready for use.
            </p>
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://nexus-multi-role-platform-138544333120.asia-southeast1.run.app/login" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                Log In to Dashboard
              </a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">InvestPro Platform | Live Sandbox Mode</p>
          </div>
        </div>
      `;

      sendEmail(pending.email, "Welcome to InvestPro! Account Successfully Verified", emailHtml).catch(e => {
        console.error("Resend delivery failed welcome email:", e);
      });

      // Clear pending
      db.prepare("DELETE FROM pending_registrations WHERE email = ?").run(email);

      res.json({ token: "mock-jwt-token", user: newUser });
    } catch (err) {
      res.status(500).json({ message: "Registration verification failed" });
    }
  });

  /**
   * @openapi
   * /api/forgot-password:
   *   post:
   *     summary: Reset password and send new password via email with magic link
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *     responses:
   *       200:
   *         description: Temporary password and magic link successfully generated and dispatched
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 magicLink:
   *                   type: string
   *                 resetLink:
   *                   type: string
   *                 newPassword:
   *                   type: string
   *                 email:
   *                   type: string
   *       404:
   *         description: User not found
   */
  app.post("/api/forgot-password", (req, res) => {
    const { email } = req.body;
    try {
      const user = db.prepare("SELECT name FROM users WHERE email = ?").get(email) as any;
      if (!user) {
        return res.status(404).json({ message: "No account found with this email" });
      }

      // Generate secure human-friendly password
      const newPassword = `IP-${Math.floor(100000 + Math.random() * 900000)}`;

      // Update password inside users table
      db.prepare("UPDATE users SET password = ? WHERE email = ?").run(newPassword, email);

      // Generate secure token and set expiration to 1 hour
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // Store token in SQLite DB for magic login session
      db.prepare("INSERT INTO magic_links (token, email, expires_at) VALUES (?, ?, ?)").run(token, email, expiresAt);

      // Determine dynamic base path for localhost or developer proxy
      const host = req.get("host") || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const baseUrl = `${protocol}://${host}`;
      
      const magicLink = `${baseUrl}/login?token=${token}`;
      const resetLink = `${baseUrl}/reset-password?token=${token}`;

      // Dispatch Reset Email with credentials via Resend
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
          <div style="background-color: #ef4444; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Password Reset Notice</h1>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              A password reset request has been received for your InvestPro account. We have generated a new temporary password and stored it securely in our system.
            </p>
            
            <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="color: #ef4444; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 6px;">New Temporary Password</span>
              <strong style="color: #991b1b; font-size: 22px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 1px;">${newPassword}</strong>
            </div>

            <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
              Alternatively, you can skip typing your password and instantly access your account securely by clicking the button below:
            </p>
            
            <div style="text-align: center; margin-bottom: 28px;">
              <a href="${magicLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(15, 23, 42, 0.2);">
                Instant Magic Login
              </a>
            </div>

            <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
              This magic login link expires in exactly 1 hour. If you did not make this request, please change your password inside the dashboard.
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">InvestPro Platform | Live Sandbox Mode</p>
          </div>
        </div>
      `;

      sendEmail(email, "Your InvestPro Temporary Password & Reset Notice", emailHtml).catch(e => {
        console.error("Resend delivery failed for forgot password:", e);
      });

      res.json({
        message: "A new password and secure magic login link have been dispatched to your email address successfully.",
        magicLink,
        resetLink,
        newPassword,
        email
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  /**
   * @openapi
   * /api/verify-token:
   *   get:
   *     summary: Verify magic link token
   *     tags: [Auth]
   *     parameters:
   *       - in: query
   *         name: token
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Verification response
   *       400:
   *         description: Invalid or expired token
   */
  app.get("/api/verify-token", (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ valid: false, message: "Token parameter is required" });
    }

    try {
      const link = db.prepare("SELECT * FROM magic_links WHERE token = ? AND used = 0").get(token) as any;
      if (!link) {
        return res.status(400).json({ valid: false, message: "Invalid or already used password reset link." });
      }

      const isExpired = new Date(link.expires_at).getTime() < Date.now();
      if (isExpired) {
        return res.status(400).json({ valid: false, message: "This reset link has expired." });
      }

      res.json({ valid: true, email: link.email });
    } catch (err) {
      res.status(500).json({ valid: false, message: "Verification failed on server" });
    }
  });

  /**
   * @openapi
   * /api/magic-login:
   *   post:
   *     summary: Login passwordlessly via magic link token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               token:
   *                 type: string
   *     responses:
   *       200:
   *         description: Magic login successful
   *       401:
   *         description: Invalid or expired magic link
   */
  app.post("/api/magic-login", (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    try {
      const link = db.prepare("SELECT * FROM magic_links WHERE token = ? AND used = 0").get(token) as any;
      if (!link) {
        return res.status(401).json({ message: "Invalid or already used magic login link" });
      }

      const isExpired = new Date(link.expires_at).getTime() < Date.now();
      if (isExpired) {
        return res.status(401).json({ message: "This magic link has expired" });
      }

      // Mark token as used
      db.prepare("UPDATE magic_links SET used = 1 WHERE token = ?").run(token);

      // Fetch corresponding user
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(link.email) as any;
      if (!user) {
        return res.status(404).json({ message: "User account no longer exists" });
      }

      const { password: _, ...userWithoutPassword } = user;
      userWithoutPassword.id = String(userWithoutPassword.id);

      res.json({ token: "mock-jwt-token", user: userWithoutPassword });
    } catch (err) {
      res.status(500).json({ message: "Server error during magic login" });
    }
  });

  /**
   * @openapi
   * /api/reset-password:
   *   post:
   *     summary: Reset password via email or magic token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *               token:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password reset successful
   *       400:
   *         description: Invalid request
   */
  app.post("/api/reset-password", (req, res) => {
    const { email, token, newPassword } = req.body;
    try {
      let targetEmail = email;

      if (token) {
        // Look up by token
        const link = db.prepare("SELECT * FROM magic_links WHERE token = ? AND used = 0").get(token) as any;
        if (!link) {
          return res.status(400).json({ message: "Invalid or already used reset token" });
        }
        const isExpired = new Date(link.expires_at).getTime() < Date.now();
        if (isExpired) {
          return res.status(400).json({ message: "This token has expired" });
        }
        targetEmail = link.email;

        // Mark token as used
        db.prepare("UPDATE magic_links SET used = 1 WHERE token = ?").run(token);
      }

      if (!targetEmail) {
        return res.status(400).json({ message: "Email or Token is required" });
      }

      const result = db.prepare("UPDATE users SET password = ? WHERE email = ?").run(newPassword, targetEmail);
      if (result.changes === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Password successfully updated" });
    } catch (err) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Middleware helper to authorize route access based on role
  const verifyRole = (allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
      const userRoleRaw = req.headers["x-user-role"] || req.headers["authorization"]?.replace("Bearer ", "");
      if (!userRoleRaw) {
        if (req.method === "GET") {
          return next();
        }
        return res.status(401).json({ message: "Authentication required. X-User-Role header must be present." });
      }

      const userRole = String(userRoleRaw).trim().toLowerCase();
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: `Access denied. Role '${userRole}' is not authorized to access this API.` });
      }
      next();
    };
  };

  /**
   * @openapi
   * /api/users:
   *   get:
   *     summary: Get all users
   *     description: Retrieve all registered users with their status, role, and details.
   *     tags: [Admin]
   *     responses:
   *       200:
   *         description: List of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                   email:
   *                     type: string
   *                   name:
   *                     type: string
   *                   role:
   *                     type: string
   *                     enum: [admin, manager, client]
   *                   status:
   *                     type: string
   *                     enum: [active, inactive]
   */
  app.get("/api/users", verifyRole(["admin"]), (req, res) => {
    try {
      const users = db.prepare("SELECT id, email, name, role, status FROM users").all() as any[];
      res.json(users.map(u => ({ ...u, id: String(u.id) })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  /**
   * @openapi
   * /api/users/{id}/role:
   *   patch:
   *     summary: Update user role
   *     description: Change the role of a user. Only the super admin has the permission to perform this action. The System Admin (super admin) account's role cannot be changed.
   *     tags: [Admin]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               role:
   *                 type: string
   *                 enum: [admin, manager, client]
   *     responses:
   *       200:
   *         description: Role successfully updated
   *       403:
   *         description: Unauthorized or forbidden (e.g. attempting to modify System Admin or no super admin bypass)
   */
  app.patch("/api/users/:id/role", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    console.log(`PATCH /api/users/${id}/role was triggered with role: ${role}`);
    try {
      const parsedId = isNaN(Number(id)) ? id : Number(id);
      
      // Fetch target user first to ensure it's not the System Admin
      const targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(parsedId) as any;
      if (targetUser && (targetUser.email === "admin@investpro.com" || targetUser.name === "System Admin")) {
        return res.status(403).json({ message: "The System Admin account role cannot be changed." });
      }

      const result = db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, parsedId);
      console.log(`Updated user role. Row changes: ${result.changes}`);
      res.json({ success: true });
    } catch (err) {
      console.error(`Failed to update user role for id ${id}:`, err);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  /**
   * @openapi
   * /api/users/{id}/status:
   *   patch:
   *     summary: Update user status (activate / deactivate)
   *     description: Change the status (active/inactive) of a user. Only the super admin has permission to perform this action. The System Admin (super admin) account's status cannot be changed or deactivated.
   *     tags: [Admin]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [active, inactive]
   *     responses:
   *       200:
   *         description: Status successfully updated
   *       403:
   *         description: Unauthorized or forbidden (e.g. attempting to change status of System Admin)
   */
  app.patch("/api/users/:id/status", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    console.log(`PATCH /api/users/${id}/status was triggered with status: ${status}`);
    try {
      const parsedId = isNaN(Number(id)) ? id : Number(id);

      // Fetch target user first to ensure it's not the System Admin
      const targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(parsedId) as any;
      if (targetUser && (targetUser.email === "admin@investpro.com" || targetUser.name === "System Admin")) {
        return res.status(403).json({ message: "The System Admin account status cannot be changed or deactivated." });
      }

      const result = db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, parsedId);
      console.log(`Updated user status. Row changes: ${result.changes}`);
      res.json({ success: true });
    } catch (err) {
      console.error(`Failed to update user status for id ${id}:`, err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  /**
   * @openapi
   * /api/users/{id}:
   *   delete:
   *     summary: Delete a user
   *     description: Permanently delete a registered user from the database. Only the super admin has permission to perform this action. The System Admin (super admin) account itself cannot be deleted.
   *     tags: [Admin]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User successfully deleted
   *       403:
   *         description: Unauthorized or forbidden (e.g. attempting to delete System Admin)
   */
  app.delete("/api/users/:id", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    console.log(`DELETE /api/users/${id} was triggered`);
    try {
      const parsedId = isNaN(Number(id)) ? id : Number(id);

      // Fetch target user first to ensure it's not the System Admin
      const targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(parsedId) as any;
      if (targetUser && (targetUser.email === "admin@investpro.com" || targetUser.name === "System Admin")) {
        return res.status(403).json({ message: "The System Admin account cannot be deleted." });
      }

      const result = db.prepare("DELETE FROM users WHERE id = ?").run(parsedId);
      console.log(`Deleted user. Row changes: ${result.changes}`);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (err) {
      console.error(`Failed to delete user for id ${id}:`, err);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/users", verifyRole(["admin"]), (req, res) => {
    const { name, email, password, role, status } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, email and role are required." });
    }
    try {
      const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (existing) {
        return res.status(400).json({ message: "Email is already taken." });
      }

      const pass = password || "password";
      const stat = status || "active";
      const info = db.prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)").run(name, email, pass, role, stat);
      const newUser = { id: String(info.lastInsertRowid), name, email, role, status: stat };
      res.status(201).json(newUser);
    } catch (err: any) {
      console.error("Failed to create user:", err);
      res.status(500).json({ message: "Failed to create user: " + err.message });
    }
  });

  app.put("/api/users/:id", verifyRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { name, email, role, status, password } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, email and role are required." });
    }
    try {
      const parsedId = isNaN(Number(id)) ? id : Number(id);
      const targetUser = db.prepare("SELECT * FROM users WHERE id = ?").get(parsedId) as any;
      if (!targetUser) {
        return res.status(404).json({ message: "User not found." });
      }

      if (targetUser.email === "admin@investpro.com" || targetUser.name === "System Admin") {
        if (email !== targetUser.email || role !== "admin" || status !== "active") {
          return res.status(403).json({ message: "The System Admin account details, role and active status are protected." });
        }
      }

      const checkEmail = db.prepare("SELECT * FROM users WHERE email = ? AND id != ?").get(email, parsedId);
      if (checkEmail) {
        return res.status(400).json({ message: "Email is already taken by another user." });
      }

      if (password) {
        db.prepare("UPDATE users SET name = ?, email = ?, role = ?, status = ?, password = ? WHERE id = ?")
          .run(name, email, role, status || "active", password, parsedId);
      } else {
        db.prepare("UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?")
          .run(name, email, role, status || "active", parsedId);
      }

      const updatedUser = { id: String(parsedId), name, email, role, status: status || "active" };
      res.json(updatedUser);
    } catch (err: any) {
      console.error(`Failed to update user for id ${id}:`, err);
      res.status(500).json({ message: "Failed to update user details." });
    }
  });

  // Investors API
  /**
   * @openapi
   * /api/investors:
   *   get:
   *     summary: Get all investors
   *     tags: [Investors]
   *     responses:
   *       200:
   *         description: List of investors
   */
  app.get("/api/investors", verifyRole(["admin", "manager", "client"]), (req, res) => {
    try {
      const investors = db.prepare("SELECT * FROM investors").all() as any[];
      res.json(investors.map(i => ({ ...i, id: String(i.id) })));
    } catch (err) {
       res.status(500).json({ message: "Failed to fetch investors" });
    }
  });

  /**
   * @openapi
   * /api/investors:
   *   post:
   *     summary: Add new investor
   *     tags: [Investors]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               organization:
   *                 type: string
   *               amount:
   *                 type: number
   *               status:
   *                 type: string
   *     responses:
   *       200:
   *         description: Investor added
   */
  app.post("/api/investors", verifyRole(["admin", "manager"]), (req, res) => {
    const { 
      name, 
      type, 
      email, 
      mobile, 
      organization, 
      amount, 
      reg_number, 
      interest, 
      accreditation, 
      country, 
      status, 
      date_of_onboarding 
    } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO investors (
          name, type, email, mobile, organization, amount, reg_number, interest, accreditation, country, status, date_of_onboarding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, 
        type || "Individual", 
        email || "", 
        mobile || "", 
        organization || "", 
        Number(amount) || 0, 
        reg_number || "", 
        interest || "", 
        accreditation || "Accredited", 
        country || "", 
        status || "active", 
        date_of_onboarding || ""
      );
      res.json({ 
        id: String(info.lastInsertRowid), 
        name, 
        type: type || "Individual",
        email: email || "",
        mobile: mobile || "",
        organization: organization || "",
        amount: Number(amount) || 0,
        reg_number: reg_number || "",
        interest: interest || "",
        accreditation: accreditation || "Accredited",
        country: country || "",
        status: status || "active",
        date_of_onboarding: date_of_onboarding || ""
      });
    } catch (err: any) {
      console.error("Failed to add investor:", err);
      res.status(500).json({ message: "Failed to add investor: " + err.message });
    }
  });

  app.put("/api/investors/:id", verifyRole(["admin", "manager"]), (req, res) => {
    const { id } = req.params;
    const { 
      name, 
      type, 
      email, 
      mobile, 
      organization, 
      amount, 
      reg_number, 
      interest, 
      accreditation, 
      country, 
      status, 
      date_of_onboarding 
    } = req.body;
    try {
      db.prepare(`
        UPDATE investors SET 
          name = ?, 
          type = ?, 
          email = ?, 
          mobile = ?, 
          organization = ?, 
          amount = ?, 
          reg_number = ?, 
          interest = ?, 
          accreditation = ?, 
          country = ?, 
          status = ?, 
          date_of_onboarding = ? 
        WHERE id = ?
      `).run(
        name, 
        type, 
        email, 
        mobile, 
        organization, 
        Number(amount) || 0, 
        reg_number, 
        interest, 
        accreditation, 
        country, 
        status, 
        date_of_onboarding, 
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update investor:", err);
      res.status(500).json({ message: "Failed to update investor: " + err.message });
    }
  });

  app.delete("/api/investors/:id", verifyRole(["admin", "manager"]), (req, res) => {
    try {
      db.prepare("DELETE FROM investors WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete investor" });
    }
  });

  // Documents API
  /**
   * @openapi
   * /api/documents:
   *   get:
   *     summary: Get all documents
   *     tags: [Documents]
   *     responses:
   *       200:
   *         description: List of documents
   */
  app.get("/api/documents", verifyRole(["admin", "manager", "client"]), (req, res) => {
    try {
      const documents = db.prepare("SELECT * FROM documents").all() as any[];
      res.json(documents.map(d => ({ ...d, id: String(d.id) })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", verifyRole(["admin", "manager"]), (req, res) => {
    const { title, type, size, url, uploaded_by } = req.body;
    try {
      const info = db.prepare("INSERT INTO documents (title, type, size, url, uploaded_by) VALUES (?, ?, ?, ?, ?)").run(title, type, size, url || "#", uploaded_by);
      res.json({ id: String(info.lastInsertRowid), title, type, size, url: url || "#", uploaded_by });
    } catch (err) {
      res.status(500).json({ message: "Failed to add document" });
    }
  });

  app.delete("/api/documents/:id", verifyRole(["admin", "manager"]), (req, res) => {
    try {
      db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Projects API
  app.get("/api/projects", verifyRole(["admin", "manager", "client"]), (req, res) => {
    try {
      const projects = db.prepare("SELECT * FROM projects").all() as any[];
      res.json(projects.map(p => ({ ...p, id: String(p.id) })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", verifyRole(["admin", "manager"]), (req, res) => {
    const { title, description, budget, duration, start_date, end_date, comments, status } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO projects (title, description, budget, duration, start_date, end_date, comments, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title,
        description,
        Number(budget) || 0,
        duration,
        start_date,
        end_date,
        comments || "",
        status || "active"
      );
      res.json({
        id: String(info.lastInsertRowid),
        title,
        description,
        budget: Number(budget) || 0,
        duration,
        start_date,
        end_date,
        comments: comments || "",
        status: status || "active"
      });
    } catch (err: any) {
      console.error("Failed to add project:", err);
      res.status(500).json({ message: "Failed to add project: " + err.message });
    }
  });

  app.put("/api/projects/:id", verifyRole(["admin", "manager"]), (req, res) => {
    const { id } = req.params;
    const { title, description, budget, duration, start_date, end_date, comments, status } = req.body;
    try {
      db.prepare(`
        UPDATE projects SET
          title = ?,
          description = ?,
          budget = ?,
          duration = ?,
          start_date = ?,
          end_date = ?,
          comments = ?,
          status = ?
        WHERE id = ?
      `).run(
        title,
        description,
        Number(budget) || 0,
        duration,
        start_date,
        end_date,
        comments,
        status,
        id
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update project:", err);
      res.status(500).json({ message: "Failed to update project: " + err.message });
    }
  });

  app.patch("/api/projects/:id/status", verifyRole(["admin", "manager"]), (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare("UPDATE projects SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update project status:", err);
      res.status(500).json({ message: "Failed to update project status: " + err.message });
    }
  });

  app.delete("/api/projects/:id", verifyRole(["admin", "manager"]), (req, res) => {
    try {
      db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Stats API
  /**
   * @openapi
   * /api/stats:
   *   get:
   *     summary: Get platform stats
   *     tags: [Stats]
   *     responses:
   *       200:
   *         description: Platform statistics
   */
  app.get("/api/stats", verifyRole(["admin", "manager", "client"]), (req, res) => {
    try {
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const investorCount = db.prepare("SELECT COUNT(*) as count FROM investors").get() as any;
      const totalInvestment = db.prepare("SELECT SUM(amount) as total FROM investors").get() as any;
      const documentCount = db.prepare("SELECT COUNT(*) as count FROM documents").get() as any;

      res.json({
        users: userCount.count,
        investors: investorCount.count,
        investment: totalInvestment.total || 0,
        documents: documentCount.count
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Postman Collection download route
  app.get("/api/postman-collection", (req, res) => {
    try {
      const filePath = path.join(process.cwd(), "postman_collection.json");
      res.download(filePath, "postman_collection.json");
    } catch (err) {
      res.status(500).json({ message: "Failed to download Postman collection." });
    }
  });

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
