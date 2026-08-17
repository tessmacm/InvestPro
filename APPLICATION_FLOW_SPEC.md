# InvestPro Application Specifications & Flow Master (Source of Truth)

This document serves as the comprehensive single source of truth for all application flows, UI pages, features, business rules, and validation criteria for both **Admin / Manager** and **Investor** user roles.

---

## 1. Global & Common Specifications

- **Role Separation**:
  - **Admin / Manager**: Full platform oversight, configuration, onboarding, manual/bulk investment creation, payment reconciliation, reports, document management, and targeted/broadcast communications.
  - **Investor**: Self-service portal scoped strictly to their own investment contracts, payout schedules, personal agreement documents requiring digital signature, compliance files, and direct messaging with management.
- **Header & Navigation**:
  - **Main Links**: `Dashboard`, `Investments`, `Documents`, `Payments`, `Reports`, `Notifications`.
  - **User Role Badge & Profile**: Displays active logged-in user name and role badge.
  - **Action Controls**: Theme toggle (Dark/Light), Notifications bell with unread indicator badge, Logout.
- **Accreditation Status**:
  - Completely removed across all UI pages, backend DTOs, and database tables.

---

## 2. Page-by-Page Specifications & User Flows

### A. Dashboard (`/dashboard`)

| Feature / Element | Login as Admin / Manager | Login as Investor | Notes / Validation Rules |
| :--- | :--- | :--- | :--- |
| **Page Title** | `Dashboard Overview` | `Dashboard Overview` | |
| **Subtitle / Below Text** | `Welcome back, [User Name]. Monitor key metrics, capital growth, and recent activities.` | `Welcome back, [User Name]. Monitor key metrics, capital growth, and recent activities.` | Tailored to investor's individual portfolio |
| **Card 1: Total Investment** | Sum of all platform investments | Total investments made by this investor | Shows formatted currency (`£...`) and trend indicator |
| **Card 2: Payouts Till Date** | Total payout payments executed till date across all investors | Payout payments received till date for this investor | Sum of completed payment records |
| **Card 3: Average / Total Payouts Schedule** | Total payouts (Paid and pending) till date vs complete scheduled payouts | Payouts (Paid and pending) till date vs complete scheduled payouts for this investor | Ratio of disbursed capital return vs remaining horizon |
| **Card 4: Total Investors / Portfolio Count** | Total unique investors count & active breakdown | Investor's active investment contracts count | Admin: Investors total. Investor: Active tranches |
| **Chart: Capital Growth & Payout Trends** | Dual-line / bar graph for investments & payout distribution with labels; shows empty state if no data | Investor's personal investment trajectory and monthly returns; shows empty state if no data | Clear axis labels, tooltips, responsive grid |
| **Secondary Analytics Card** | **Payment Performance Chart**: Bar chart representing Total Payments vs Completed Payments till date | Investor's payout progress chart (completed vs pending tranches) | Replaces old Module Management with modern analytical view |
| **Recent Onboarding Activity** | Displays list/table of latest onboarded investors & investments with timestamps | Recent activity log related to investor's contracts and payout receipts | |
| **Active Access** | **Removed** | **Removed** | Clean layout without redundant access cards |
| **Agreement Modal (Sequential Queue)** | *Not Applicable* (Admin creates investments) | **Active Pop-up Queue**: Automatically triggers pop-up modal on login if one or more unsigned investment agreement documents exist | Supports multiple unsigned agreements sequentially. Investor signs each contract; once all are signed, modal dismisses and updates document records with timestamp and base64 signature |

---

### Agreement Document Lifecycle & Single Source of Truth

The platform enforces a strict **Single Source of Truth** for investor agreement documents:

1. **Generation on Create / Update**:
   - When an investment contract is created (manually or via bulk CSV onboarding) or updated, an official Agreement Document is dynamically generated containing the investor's personal details, entity profile, investment terms (capital amount, duration, min/max ROI, payout schedule), banking settlement info, and witness details.
   - The document is automatically stored in the database repository (`InvestorDocuments`) with status `Pending Signature`.
2. **First-Login / Unsigned Queue Pop-up**:
   - When the investor logs into the platform, the application queries their documents repository.
   - If any agreements have status `Pending Signature`, a modal queue automatically pops up (`AgreementModal`) displaying the exact contract terms via the single-source `AgreementDocument` template.
   - The modal renders sequential tranches (e.g. *Agreement 1 of 3*, *Agreement 2 of 3*) if multiple unsigned investments exist.
3. **Digital Signature & In-Place Replacement**:
   - The investor reviews terms, types their legal name, provides their drawn digital signature, and submits.
   - The backend records the signature payload (`SignatureData`), sets status to `Signed`, and stores the `SignedAt` timestamp.
   - In the **Documents Repository (`/documents`)**, the unsigned entry is updated in-place to `Signed`, retaining the digital signature for instant viewing, printing, and PDF export via `AgreementViewerModal`.
4. **Contract Updates**:
   - If an admin edits an investment contract's terms, the associated agreement document is reset to `Pending Signature`, and the updated contract is queued for re-signature on the investor's next login.

---

### B. Investments (`/investments`)

| Feature / Element | Login as Admin / Manager | Login as Investor | Notes / Validation Rules |
| :--- | :--- | :--- | :--- |
| **Page Path** | `/investments` | `/investments` | Main navigation renamed from "Investors" to "Investments" |
| **Page Title** | `Investments` | `Investments` | |
| **Subtitle / Below Text** | `Manage Investments` | `My Investments` | |
| **Card 1: Investors** | `Investors` (Total unique investors count) | Investor Profile Status / Verification status | |
| **Card 2: Investments Total** | `Total Investments` (Count & Total Capital Sum) | `Total Invested Capital` | |
| **Card 3: Investor Type** | `Investor Type` (Individual vs Business / Org counts) | `Account Type` (Individual or Business) | |
| **Add Investment(s) Action** | Available via `Add Investment(s)` button | *Not Applicable* | Opens modal supporting **New Registration** and **Select Existing Investor** |
| **Investor Selection / Mode** | 1. **New Registration**: User details + Investment fields enabled.<br>2. **Select Existing Investor**: Dropdown search by name/email; locks/freezes personal & banking details, allowing only investment terms to be input. | *Not Applicable* | Email is the primary identity key to link multi-investments to a single investor |
| **Form Section Grouping** | **1. Personal & Contact Profile**<br>**2. Business / Entity Details** (Legal Business Name & Reg No enabled *only* if Business type selected)<br>**3. Investment Terms & Payout Schedule** (Amount, Duration, Min/Max ROI, ROI Type, Payout Frequency, Project)<br>**4. Bank Settlement & Remarks** | *Not Applicable* | Field `Duration` (e.g. 6, 12, 24, 36, 48, 60 Months) required |
| **Bulk Import ("Bulk Onboard")** | Button renamed to **Bulk Onboard**. Supports CSV upload containing new investors, existing investors, or multiple rows for the same email. | *Not Applicable* | Automatically handles user creation vs linking to existing user |
| **Download Template** | Provides complete CSV template containing all required headers (`name, email, mobile, type, amount, date_of_onboarding, duration, min_roi, max_roi, roi_type, payout_type, bank, ac_number, sort_code, address, witness, organization, reg_number, notes`) | *Not Applicable* | Max ROI, duration, and business fields included |
| **Bulk Upload Validation** | Validates required fields, parses individual/business rows, processes multi-investments per investor, creates dynamic agreements and payment schedules for each row | *Not Applicable* | Toast feedback with success count and error summaries |
| **View Investment Details** | Modal displays all investment details (Personal, Business, Investment terms, Duration, ROI, Banking, Project) without omissions | View own investment terms and payout schedule | |
| **Edit Investment** | Allows editing investment details. If Personal or Banking details are modified, changes automatically synchronize across all investment contracts sharing that user account. | *Not Applicable* | |
| **Agreement Document Trigger** | Automatically generates dynamic Agreement Document (`.pdf` / web preview) on manual creation, bulk upload, or contract update containing all investor details, payout terms, and witness info | View agreement associated with each investment contract | Document queued for digital signature |
| **Empty State** | `No investments found. No investments have been created yet.` with `Add Investment(s)` button | `No active investments found.` | Standardized UX empty state |

---

### C. Projects / Products Portfolio (`/projects`)

| Feature / Element | Login as Admin / Manager | Login as Investor | Notes / Validation Rules |
| :--- | :--- | :--- | :--- |
| **Page Path** | `/projects` | `/projects` (or via Investment links) | Manages capital allocation products & projects |
| **Page Title** | `Projects` | `Investment Opportunities` | |
| **Subtitle / Below Text** | `Track, manage, and launch strategic capital investment projects.` | `Explore active investment projects and track your allocations.` | |
| **Card 1: Total Projects** | Total project count across platform | Total projects backed by investor | |
| **Card 2: Target Funding** | Cumulative target funding required | Cumulative funding across backed projects | Shows currency sum |
| **Card 3: Funded Capital** | Total capital committed / funded to date | Investor's capital allocated to projects | Percentage progress bar |
| **Card 4: Active Deployments** | Count of projects in active funding / execution status | Count of active ongoing projects | Status badge indicators |
| **Create Project Action** | Available via `New Project` button | *Not Applicable* | Opens comprehensive creation modal |
| **Project Form Fields** | **Title, Description, Target Funding (Budget), Duration (Months), Launch Date, End Date, Status (Active / Inactive), Investment Strategy / Comments** | *Not Applicable* | Full validation for financial figures and date horizons |
| **Search & Filters** | Instant search by title/description; filter by Status (`All`, `Active`, `Inactive`), funding threshold, and timeline | Search and filter backed / active opportunities | Real-time table and grid update |
| **Project Details View** | Tabbed modal / view with: 1. **Overview** (Target vs Funded, ROI tiering), 2. **Timeline** (Launch date, duration), 3. **Investors Allocated** (List of investors and investment tranches linked to this project) | View project overview, asset description, target returns, and personal tranche allocations | Fully responsive detail view |
| **Edit Project** | Modify project parameters, budget targets, descriptions, or status | *Not Applicable* | Updates reflected across dashboard and investment associations |
| **Delete / Toggle Status** | Soft toggle between `Active` and `Inactive`; delete allowed if no locked investor capital exists | *Not Applicable* | Confirmation modal with safeguards |

---

### D. Admin User Management Panel (`/admin`)

| Feature / Element | Login as Admin (Elevated) | Login as Manager / Investor | Notes / Validation Rules |
| :--- | :--- | :--- | :--- |
| **Page Path** | `/admin` | *Restricted* (HTTP 403 / Redirect to Dashboard) | Accessible only by SuperAdmin & Admin roles |
| **Page Title** | `User Management` | *Not Applicable* | |
| **Subtitle / Below Text** | `Manage team members, investor system accounts, credentials, and access roles.` | *Not Applicable* | |
| **Cards Summary** | `Total Users`, `Active Accounts`, `Administrator Roles`, `Investor Accounts` | *Not Applicable* | Summary metrics |
| **User Directory Table** | Lists all registered accounts (Name, Email, Role: `Admin`/`Manager`/`Investor`, Status: `Active`/`Inactive`, Created Date, Actions) | *Not Applicable* | Searchable by name, email, role |
| **Add Team Member** | Admin can invite/register new Manager or Administrator (`FirstName, LastName, Email, Role`) | *Not Applicable* | Sends invite or sets temporary password / OTP verification |
| **Status Toggle & Deletion** | Activate / Deactivate user accounts; delete accounts (with confirmation and referential integrity checks) | *Not Applicable* | Cannot delete own admin account |

---

### E. Documents Repository (`/documents`)

| Feature / Element | Login as Admin / Manager | Login as Investor | Notes / Validation Rules |
| :--- | :--- | :--- | :--- |
| **Page Title** | `Documents Repository` | `Documents Repository` | |
| **Subtitle / Below Text** | `Access, manage, and verify official investor agreements and compliance files.` | `Access and review your official investment agreements and uploaded documents.` | |
| **Total Documents Card** | Total count of all generated agreements and manual compliance uploads | Total count of investor's personal documents | |
| **Documents Table** | Displays all investor documents (Agreement docs, KYC, Tax reports, custom uploads) with columns: Title, Investor, Type, Size, Uploaded Date, Status (Pending Signature / Signed), Actions | Scoped strictly to investor's own documents and agreements | Filterable by document type and search query |
| **Upload Document** | Admin can upload compliance/contract files and target **Single Investor**, **Multiple Selected Investors**, or **All Investors** | View / Download documents | File validation for PDF/Images |
| **Digital Signature Actions** | Admin views signature status, signed timestamp, and digital signature preview | Investor can review and digitally sign pending agreements directly from the table or modal | Status transitions from `Pending Signature` $\rightarrow$ `Signed` |

---

### F. Payments & Payouts (`/payments`)

| Feature / Element | Login as Admin / Manager | Login as Investor | Notes / Validation Rules |
| :--- | :--- | :--- | :--- |
| **Page Title** | `Payments` | `Payments` | |
| **Subtitle / Below Text** | `Track payout disbursements, payment schedules, and investor transactions.` | `Track your payout receipts, upcoming disbursements, and transaction history.` | |
| **Card 1: Total Payouts** | `Total Payouts` (Total disbursed sum & total transaction count) | `Total Received Payouts` (Disbursed sum & count for this investor) | |
| **Card 2: Pending in Month** | `Pending in Month` (Total scheduled payout amount & count for current month) | `Pending This Month` (Upcoming payout amount & count for this investor) | Renamed from generic Pending Payouts |
| **Card 3: Acknowledge Sent** | `Acknowledge Sent` (Total count & amount of payouts where remittance acknowledgment sent) | `Payouts In Transit / Acknowledged` | Renamed from "Send Acknowledge" |
| **Card 4: Acknowledge Received** | `Acknowledge Received` (Total count & amount confirmed by bank/investor) | `Receipts Confirmed` | Renamed from "Acknowledge" |
| **Payments Table** | Lists all scheduled, pending, and completed payout records with Investor Name, Email, Investment Tranche, Due Date, Amount, ROI Type, and Status | Scoped strictly to investor's own payment schedule | Status badges: `Paid`, `Pending`, `Processing` |
| **Download Report** | Export filtered payments / payout reconciliation report to CSV/Excel | Download personal payout receipt report | Supports filtering by date range, investor, project, status |

---

### G. Notifications & Messaging (`/notifications`)

| Feature / Element | Login as Admin / Manager | Login as Investor | Notes / Validation Rules |
| :--- | :--- | :--- | :--- |
| **Page Title** | `Notifications` | `Notifications` | |
| **Subtitle / Below Text** | `Manage Notifications` | `Notifications & Updates` | |
| **Bidirectional Communication** | Admin/Manager $\rightarrow$ Investor **AND** Investor $\rightarrow$ Admin/Manager | Investor sends directly to Management without dropdown selection (automatically routed to Admin & Manager) | Full two-way messaging flow |
| **Target Recipients (Admin)** | 1. **Single Investor** (via dropdown search)<br>2. **Multiple Specific Investors** (multi-select)<br>3. **All Investors** (Broadcast) | *Default to Admin & Manager* (No recipient selection required) | |
| **Read / Unread Receipt Tracking** | Table displays whether the receiver has read the notification (`isRead: true/false`), including `ReadAt` timestamp visible at sender's end | Displays read status of incoming notifications from management | Live read receipt reflection |
| **Table & List View** | Displays notification history (Title, Message, Sender, Recipient, Created Date, Read Status, Actions) | Displays received announcements and sent queries | |
| **Empty State** | Displays `No notifications found` with quick `Send Notification` action | Displays `No notifications found` with quick `Contact Management` action | |

---

### H. Reports & Analytics (`/reports`)

| Feature / Element | Login as Admin / Manager | Login as Investor | Notes / Validation Rules |
| :--- | :--- | :--- | :--- |
| **Page Title** | `Reports & Analytics` | `Performance Reports` | |
| **Subtitle / Below Text** | `Generate, filter, and export investor distributions, capital performance, and compliance reports.` | `View and download your investment distribution statements and tax summaries.` | |
| **Filters** | Filter by Investor, Project, Investment Date Horizon, Payout Status, and Entity Type | Filter personal reports by Date Range and Contract | Real-time table updates on filter change |
| **Export Formats** | Download CSV / Excel reports for Investors directory, Payout schedules, and Transaction logs | Download CSV / PDF statement | Instant client-side & server-backed export |

---

### I. Authentication & Identity Management

| Flow | Steps / Rules |
| :--- | :--- |
| **First-Run Setup** | If zero users exist in the database, navigating to `/` or `/login` automatically routes to `/register` for initial Administrator creation. |
| **Admin & Investor OTP Login** | Two-step login: 1. Enter email address $\rightarrow$ 2. Input secure verification code (OTP). On verified match, issues JWT token with claims (`role`, `sub`, `email`, `investorId`). |
| **Password Reset** | `/forgot-password` generates verification token $\rightarrow$ `/reset-password` accepts new credentials and confirms update. |
| **Role-Based Redirection** | Protected routes guard privileged pages (`/admin` for Admins, `/investors` and `/projects` for Admin/Manager). Unauthorized attempts seamlessly redirect to `/dashboard`. |

---

## 3. Automated End-to-End Test Suite Mapping

All test runners (including [`test-e2e-real-user.ts`](file:///c:/Users/shaik/WORK/ANTIGRAVITY_WORKSPACES/InvestProApp/InvestPro/test-e2e-real-user.ts) and future test harnesses) must strictly follow the flow rules codified in this specification document:

1. **Step 1: System Baseline & Reset**: Purge test data via `clean-database` while retaining core administrative credentials.
2. **Step 2: Project / Product Setup**: Create or verify active investment project (e.g. `Current Operations - Project #1`).
3. **Step 3: Single Individual Investment Lifecycle**: Manual creation $\rightarrow$ Dynamic agreement doc generation $\rightarrow$ Payment schedule calculation.
4. **Step 4: Multi-Investment Association**: Add 2nd investment tranche to existing investor $\rightarrow$ Verify identity reuse without account duplication $\rightarrow$ Verify distinct 2nd agreement doc.
5. **Step 5: Bulk CSV Onboarding**: Upload batch containing existing investor (3rd tranche), new Business investor (with Org Name, CRN, Max ROI), and new Individual investor.
6. **Step 6: Dashboard & Reports Reconciliation**: Validate aggregations (unique investors vs total investment contracts, entity distribution), payment schedules, and report filtering.
7. **Step 7: Targeted & Broadcast Notifications**: Send single targeted and broadcast notifications; verify delivery and read receipts.
8. **Step 8: Investor Self-Service Flow**: Login via OTP $\rightarrow$ Sequential unsigned agreements signing modal queue $\rightarrow$ Document status transition to `Signed` $\rightarrow$ Notification reading & reply to management.
9. **Step 9: Final Teardown**: Reset system state to clean baseline.
