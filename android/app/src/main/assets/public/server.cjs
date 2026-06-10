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
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_swagger_jsdoc = __toESM(require("swagger-jsdoc"), 1);
var import_swagger_ui_express = __toESM(require("swagger-ui-express"), 1);
var db = new import_better_sqlite3.default("investpro.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'guest'))
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
`);
var rowCount = db.prepare("SELECT count(*) as count FROM users").get();
if (rowCount.count === 0) {
  const insert = db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
  insert.run("admin@investpro.com", "password", "System Admin", "admin");
  insert.run("user@investpro.com", "password", "Standard User", "user");
  insert.run("guest@investpro.com", "password", "Guest User", "guest");
  const insertInv = db.prepare("INSERT INTO investors (name, organization, amount, status) VALUES (?, ?, ?, ?)");
  insertInv.run("John Doe", "Global Ventures", 5e5, "active");
  insertInv.run("Sarah Smith", "Innovation Capital", 25e4, "active");
  const insertDoc = db.prepare("INSERT INTO documents (title, type, size, url, uploaded_by) VALUES (?, ?, ?, ?, ?)");
  insertDoc.run("Q4 Financial Report", "PDF", "2.4 MB", "#", "System Admin");
  insertDoc.run("Investor Agreement", "DOCX", "1.1 MB", "#", "System Admin");
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.use((0, import_cors.default)());
  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "InvestPro API",
        version: "1.0.0",
        description: "API documentation for the InvestPro investment platform"
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development server"
        }
      ]
    },
    apis: ["./server.ts"]
  };
  const swaggerSpec = (0, import_swagger_jsdoc.default)(swaggerOptions);
  app.use("/api-docs", import_swagger_ui_express.default.serve, import_swagger_ui_express.default.setup(swaggerSpec));
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
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
  app.post("/api/register", (req, res) => {
    const { email, name, password } = req.body;
    try {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existing) {
        return res.status(400).json({ message: "User already exists" });
      }
      const info = db.prepare("INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)").run(email, name, password, "user");
      const newUser = { id: String(info.lastInsertRowid), email, name, role: "user" };
      res.json({ token: "mock-jwt-token", user: newUser });
    } catch (err) {
      res.status(500).json({ message: "Registration failed" });
    }
  });
  app.post("/api/forgot-password", (req, res) => {
    const { email } = req.body;
    try {
      const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (!user) {
        return res.status(404).json({ message: "No account found with this email" });
      }
      res.json({ message: "Password reset link sent to your email" });
    } catch (err) {
      res.status(500).json({ message: "Failed to process request" });
    }
  });
  app.post("/api/reset-password", (req, res) => {
    const { email, newPassword } = req.body;
    try {
      const result = db.prepare("UPDATE users SET password = ? WHERE email = ?").run(newPassword, email);
      if (result.changes === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "Password successfully updated" });
    } catch (err) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  app.get("/api/users", (req, res) => {
    try {
      const users = db.prepare("SELECT id, email, name, role FROM users").all();
      res.json(users.map((u) => ({ ...u, id: String(u.id) })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app.patch("/api/users/:id/role", (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update role" });
    }
  });
  app.get("/api/investors", (req, res) => {
    try {
      const investors = db.prepare("SELECT * FROM investors").all();
      res.json(investors.map((i) => ({ ...i, id: String(i.id) })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch investors" });
    }
  });
  app.post("/api/investors", (req, res) => {
    const { name, organization, amount, status } = req.body;
    try {
      const info = db.prepare("INSERT INTO investors (name, organization, amount, status) VALUES (?, ?, ?, ?)").run(name, organization, amount, status || "active");
      res.json({ id: String(info.lastInsertRowid), name, organization, amount, status: status || "active" });
    } catch (err) {
      res.status(500).json({ message: "Failed to add investor" });
    }
  });
  app.put("/api/investors/:id", (req, res) => {
    const { id } = req.params;
    const { name, organization, amount, status } = req.body;
    try {
      db.prepare("UPDATE investors SET name = ?, organization = ?, amount = ?, status = ? WHERE id = ?").run(name, organization, amount, status, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to update investor" });
    }
  });
  app.delete("/api/investors/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM investors WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete investor" });
    }
  });
  app.get("/api/documents", (req, res) => {
    try {
      const documents = db.prepare("SELECT * FROM documents").all();
      res.json(documents.map((d) => ({ ...d, id: String(d.id) })));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
  app.post("/api/documents", (req, res) => {
    const { title, type, size, url, uploaded_by } = req.body;
    try {
      const info = db.prepare("INSERT INTO documents (title, type, size, url, uploaded_by) VALUES (?, ?, ?, ?, ?)").run(title, type, size, url || "#", uploaded_by);
      res.json({ id: String(info.lastInsertRowid), title, type, size, url: url || "#", uploaded_by });
    } catch (err) {
      res.status(500).json({ message: "Failed to add document" });
    }
  });
  app.delete("/api/documents/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });
  app.get("/api/stats", (req, res) => {
    try {
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
      const investorCount = db.prepare("SELECT COUNT(*) as count FROM investors").get();
      const totalInvestment = db.prepare("SELECT SUM(amount) as total FROM investors").get();
      const documentCount = db.prepare("SELECT COUNT(*) as count FROM documents").get();
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
