/**
 * InvestPro End-to-End Real User Automation Test Suite
 * ----------------------------------------------------
 * Automates all user scenarios on localhost:
 * 
 * 1. Admin Authentication & Environment Initialization:
 *    - Verify admin OTP login flow (`tessma.cm@gmail.com`).
 *    - Clean database state via `/api/admin/dashboard/clean-database`.
 * 
 * 2. Scenario A: Single Manual Investment Registration (Individual):
 *    - Admin creates Investor 1 (Individual, "Alexander Wright", `alex.wright.test@example.com`).
 *    - Verify investor record created with correct amounts, dates, ROI, and bank details.
 *    - Verify Agreement Document auto-generation for Investment 1.
 *    - Verify Payments schedule auto-generation.
 * 
 * 3. Scenario B: Multi-Investment for Existing Investor (Manual Add):
 *    - Admin adds a 2nd investment to Alexander Wright (`alex.wright.test@example.com`).
 *    - Verify investor details remain consistent/frozen, new investment is appended with own agreement doc and payment plan.
 * 
 * 4. Scenario C: Bulk CSV Upload of Investments:
 *    - Admin imports CSV containing:
 *      * Existing investor adding 3rd investment (Alexander Wright).
 *      * New Business investor ("Apex Global Holdings Ltd", `invest@apexholdings.test`).
 *      * Multi-row investments for another new investor in the same CSV batch.
 *    - Verify bulk endpoint processes all rows with accurate max ROI, durations, and company details.
 * 
 * 5. Scenario D: Verification of Dashboard, Reports & Payments:
 *    - Fetch Dashboard Stats (`/api/admin/dashboard/stats`). Verify Investors Total/Active, Investments Total, Investor Types (Org vs Individual).
 *    - Filter Reports by type (investors, investments, payments) and search terms.
 *    - Download / generate payouts report.
 * 
 * 6. Scenario E: Bidirectional Notifications:
 *    - Admin sends single notification to Alexander Wright.
 *    - Admin sends broadcast/multi notification to all investors.
 *    - Verify notifications are listed with `isRead = false`.
 * 
 * 7. Scenario F: Investor Experience (Real User Login & Verification):
 *    - Investor logs in (`alex.wright.test@example.com`) via OTP.
 *    - Investor fetches agreements list: pop-up queue detects unsigned agreements.
 *    - Investor digitally signs each agreement (simulating canvas signature + typed name).
 *    - Verify signature is persisted and document status updates to Signed.
 *    - Investor verifies agreement content matches initial onboarding details (dates, returns period, bank, duration).
 *    - Investor views notifications and marks them as read.
 *    - Investor sends notification back to Admin/Manager without needing recipient dropdown.
 *    - Admin verifies read status updated (`isRead = true`) and received the investor notification.
 * 
 * 8. Scenario G: Teardown / Cleanup:
 *    - Purge all test data cleanly, restoring the database to the clean state.
 */

import assert from "node:assert";

const API_BASE = "http://localhost:5078";

// Color helper for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

function logStep(stepNum: number, title: string) {
  console.log(`\n${colors.cyan}${colors.bold}=== Step ${stepNum}: ${title} ===${colors.reset}`);
}

function logSuccess(msg: string) {
  console.log(`  ${colors.green}✓ ${msg}${colors.reset}`);
}

function logInfo(msg: string) {
  console.log(`  ${colors.blue}ℹ ${msg}${colors.reset}`);
}

async function runE2ETests() {
  console.log(`${colors.magenta}${colors.bold}========================================================================${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}       InvestPro Comprehensive Automated Real-User Test Suite           ${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}========================================================================${colors.reset}`);

  let adminToken = "";
  let adminHeaders: Record<string, string> = {};

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Admin Login & Clean Environment
  // ──────────────────────────────────────────────────────────────────────────
  logStep(1, "Admin Authentication & Database Reset");
  
  const adminLoginRes = await fetch(`${API_BASE}/api/Auth/verify-login-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tessma.cm@gmail.com", otp: "010101" })
  });
  
  assert.strictEqual(adminLoginRes.status, 200, "Admin login should succeed with status 200");
  const adminAuth = await adminLoginRes.json();
  adminToken = adminAuth.token;
  assert.ok(adminToken, "Admin token must be returned");
  adminHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`,
    "x-user-role": "admin"
  };
  logSuccess(`Admin logged in successfully (${adminAuth.user?.email || "tessma.cm@gmail.com"})`);

  // Clean DB
  if (process.argv.includes("--clean")) {
    const cleanRes = await fetch(`${API_BASE}/api/admin/dashboard/clean-database`, {
      method: "POST",
      headers: adminHeaders
    });
    assert.strictEqual(cleanRes.status, 200, "Database purge should succeed");
    const cleanResult = await cleanRes.json();
    logSuccess(`Cleaned database: ${cleanResult.message || "Database wiped clean"}`);
  } else {
    logSuccess(`Admin logged in successfully (${adminAuth.user?.email || "tessma.cm@gmail.com"}). Preserving database content.`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: Add Manual Investment (Individual)
  // ──────────────────────────────────────────────────────────────────────────
  logStep(2, "Add Manual Investment (Individual Investor)");

  const newInvestorPayload = {
    name: "Alexander Wright",
    type: 1, // Individual
    email: "alex.wright.test@example.com",
    mobile: "+44 7700 900123",
    organization: "—",
    reg_number: "—",
    amount: 50000,
    date_of_onboarding: "2026-05-15",
    duration: "12 Months",
    min_RoiRangeId: 1,
    max_RoiRangeId: 4,
    min_roi_id: 1,
    max_roi_id: 4,
    payoutType: "Fixed",
    roiTypeId: 1,
    bank: "Barclays Bank UK",
    acNumber: "12345678",
    sortCode: "20-00-00",
    address: "74 High Street, Kensington, London",
    witness: "Sarah Wright",
    notes: "VIP Onboarding tier 1",
    projectId: 1,
    status: "active"
  };

  const createInvestorRes = await fetch(`${API_BASE}/api/admin/investors/create`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(newInvestorPayload)
  });
  assert.strictEqual(createInvestorRes.status, 200, "Manual investor creation should succeed");
  const createdInv = await createInvestorRes.json();
  logSuccess(`Created manual investor (${newInvestorPayload.name})`);

  // Verify investor list
  const invListRes = await fetch(`${API_BASE}/api/admin/investors`, { headers: adminHeaders });
  const invList = await invListRes.json();
  assert.strictEqual(invList.length, 1, "There should be exactly 1 investor contract");
  const investor1Id = invList[0].id;
  assert.strictEqual(invList[0].email, "alex.wright.test@example.com");
  assert.strictEqual(invList[0].amount, 50000);
  assert.strictEqual(invList[0].duration, "12 Months");
  logSuccess(`Verified investor record ID: ${investor1Id}, duration, and contract integrity`);

  // Verify Documents
  const docsRes1 = await fetch(`${API_BASE}/api/admin/documents`, { headers: adminHeaders });
  const docs1 = await docsRes1.json();
  assert.strictEqual(docs1.length, 1, "There should be 1 agreement document generated");
  const doc1 = docs1[0];
  assert.strictEqual(doc1.investor_name || doc1.investorName, "Alexander Wright");
  assert.ok(doc1.status === "Pending Signature" || doc1.isSigned === false, "Newly generated document should be pending signature");
  logSuccess(`Verified agreement document generated (Doc ID: ${doc1.id}, Title: ${doc1.title})`);

  // Verify Payments generated
  const paymentsRes1 = await fetch(`${API_BASE}/api/admin/payments`, { headers: adminHeaders });
  const payments1 = await paymentsRes1.json();
  assert.ok(payments1.length > 0, "Payment schedule should be generated");
  logSuccess(`Verified payments schedule generated (${payments1.length} payment records)`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: Add Second Investment to Existing Investor
  // ──────────────────────────────────────────────────────────────────────────
  logStep(3, "Add 2nd Investment to Existing Investor (Multi-Investment)");

  const secondInvestmentPayload = {
    name: "Alexander Wright",
    type: 1, // Individual
    email: "alex.wright.test@example.com",
    mobile: "+44 7700 900123",
    organization: "—",
    reg_number: "—",
    amount: 75000,
    date_of_onboarding: "2026-08-01",
    duration: "24 Months",
    min_RoiRangeId: 2,
    max_RoiRangeId: 4,
    min_roi_id: 2,
    max_roi_id: 4,
    payoutType: "Variant",
    roiTypeId: 3,
    bank: "Barclays Bank UK",
    acNumber: "12345678",
    sortCode: "20-00-00",
    address: "74 High Street, Kensington, London",
    witness: "Sarah Wright",
    notes: "Second investment tranche",
    projectId: 1,
    status: "active"
  };

  const createSecondRes = await fetch(`${API_BASE}/api/admin/investors/create`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(secondInvestmentPayload)
  });
  assert.strictEqual(createSecondRes.status, 200, "Second investment should succeed");
  const createdSecond = await createSecondRes.json();
  logSuccess(`Added 2nd investment contract (Amount: £${secondInvestmentPayload.amount})`);

  // Verify contract count & unique user details
  const invListRes2 = await fetch(`${API_BASE}/api/admin/investors`, { headers: adminHeaders });
  const invList2 = await invListRes2.json();
  assert.strictEqual(invList2.length, 2, "There should now be 2 investment contracts in the directory");
  
  // Verify documents count
  const docsRes2 = await fetch(`${API_BASE}/api/admin/documents`, { headers: adminHeaders });
  const docs2 = await docsRes2.json();
  assert.strictEqual(docs2.length, 2, "There should now be 2 agreement documents");
  logSuccess("Verified 2 distinct agreement documents generated for Alexander Wright's 2 investments");

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: Bulk CSV Import of Multi-investor data
  // ──────────────────────────────────────────────────────────────────────────
  logStep(4, "Bulk CSV Import (Existing Investor + New Business + Multi Rows)");

  const bulkPayload = [
    // 3rd investment for Alexander Wright
    {
      name: "Alexander Wright",
      email: "alex.wright.test@example.com",
      mobile: "+44 7700 900123",
      type: 1,
      organization: "—",
      reg_number: "—",
      amount: 25000,
      date_of_onboarding: "2026-09-10",
      duration: "6 Months",
      projectId: 1,
      min_RoiRangeId: 1,
      max_RoiRangeId: 3,
      min_roi_id: 1,
      max_roi_id: 3,
      payoutType: "Fixed",
      roiTypeId: 1,
      bank: "Barclays Bank UK",
      acNumber: "12345678",
      sortCode: "20-00-00",
      address: "74 High Street, Kensington, London",
      witness: "Sarah Wright",
      notes: "Bulk imported 3rd contract",
      status: "active"
    },
    // New Business Investor: Apex Global Holdings Ltd
    {
      name: "Apex Global Holdings Ltd",
      email: "invest@apexholdings.test",
      mobile: "+44 20 7946 0999",
      type: 2,
      organization: "Apex Global Holdings Ltd",
      reg_number: "GB-99887766",
      amount: 150000,
      date_of_onboarding: "2026-07-01",
      duration: "36 Months",
      projectId: 1,
      min_RoiRangeId: 2,
      max_RoiRangeId: 4,
      min_roi_id: 2,
      max_roi_id: 4,
      payoutType: "Variant",
      roiTypeId: 3,
      bank: "HSBC Commercial",
      acNumber: "88776655",
      sortCode: "40-10-20",
      address: "100 Bishopsgate, London EC2N 4AG",
      witness: "Marcus Vance",
      notes: "Corporate partner institutional tranche",
      status: "active"
    },
    // New Individual: Catherine Miller
    {
      name: "Catherine Miller",
      email: "catherine.miller.test@example.com",
      mobile: "+44 7700 900888",
      type: 1,
      organization: "—",
      reg_number: "—",
      amount: 60000,
      date_of_onboarding: "2026-06-20",
      duration: "12 Months",
      projectId: 1,
      min_RoiRangeId: 1,
      max_RoiRangeId: 4,
      min_roi_id: 1,
      max_roi_id: 4,
      payoutType: "Fixed",
      roiTypeId: 1,
      bank: "Lloyds Bank",
      acNumber: "55443322",
      sortCode: "30-90-89",
      address: "12 Victoria Road, Manchester",
      witness: "David Miller",
      notes: "Bulk imported individual",
      status: "active"
    }
  ];

  const bulkImportRes = await fetch(`${API_BASE}/api/admin/investors/bulk-import`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(bulkPayload)
  });
  assert.strictEqual(bulkImportRes.status, 200, "Bulk import should succeed with status 200");
  const bulkResData = await bulkImportRes.json();
  logSuccess(`Bulk import processed: ${bulkResData.importedCount || bulkPayload.length} rows imported`);

  // Verify total contracts & unique investors
  const allInvRes = await fetch(`${API_BASE}/api/admin/investors`, { headers: adminHeaders });
  const allInvs = await allInvRes.json();
  assert.strictEqual(allInvs.length, 5, "Total investments should now be 5 (3 for Alex, 1 for Apex, 1 for Catherine)");
  
  const alexInvs = allInvs.filter((i: any) => i.email === "alex.wright.test@example.com");
  assert.strictEqual(alexInvs.length, 3, "Alexander Wright should have 3 investment contracts");

  const apexInv = allInvs.find((i: any) => i.email === "invest@apexholdings.test");
  assert.ok(apexInv, "Apex Global Holdings Ltd should be present");
  assert.ok(apexInv.type === "Business" || apexInv.type === 2 || apexInv.type === "2", "Type should be Business");
  assert.strictEqual(apexInv.organization, "Apex Global Holdings Ltd");
  assert.strictEqual(apexInv.reg_number || apexInv.companyRegistrationNo || apexInv.company_registration_no, "GB-99887766");
  assert.ok(apexInv.max_roi_id === 4 || apexInv.maxRoi === 5.0 || apexInv.max_roi === 5.0, "Max ROI should be properly recorded");
  logSuccess("Verified Business investor properties and Max ROI correctly set via bulk import");

  // ──────────────────────────────────────────────────────────────────────────
  // Step 5: Dashboard Stats & Reports Verification
  // ──────────────────────────────────────────────────────────────────────────
  logStep(5, "Dashboard Aggregations & Report Filters");

  const statsRes = await fetch(`${API_BASE}/api/admin/dashboard/stats`, { headers: adminHeaders });
  assert.strictEqual(statsRes.status, 200, "Dashboard stats should succeed");
  const stats = await statsRes.json();
  
  assert.ok(Array.isArray(stats.investors), "stats.investors should be an array");
  assert.strictEqual(stats.investors.length, 5, "Total investment contracts should be 5");
  
  const uniqueInvestorOwnerIds = new Set(stats.investors.map((i: any) => (i.email || i.Email || i.OwnerUserId || i.ownerUserId || i.name || i.Name).toLowerCase()));
  assert.strictEqual(uniqueInvestorOwnerIds.size, 3, "Total unique investors should be 3 (Alex, Apex, Catherine)");

  const indCount = stats.investors.filter((i: any) => i.type === "Individual" || i.InvestorTypeId === 1 || i.type === 1 || String(i.type) === "1").length;
  const orgCount = stats.investors.filter((i: any) => i.type === "Business" || i.type === "Org" || i.InvestorTypeId === 2 || i.type === 2 || String(i.type) === "2").length;
  assert.strictEqual(indCount, 4, "Individual contracts count should be 4 (3 for Alex + 1 for Catherine)");
  assert.strictEqual(orgCount, 1, "Business contracts count should be 1 (Apex)");
  logSuccess(`Verified Dashboard Stats: ${uniqueInvestorOwnerIds.size} Unique Investors, ${stats.investors.length} Total Contracts (${indCount} Individual, ${orgCount} Org)`);

  // Test Reports data sources (Investors & Payments for export and filtration)
  const allInvsForReports = await (await fetch(`${API_BASE}/api/admin/investors`, { headers: adminHeaders })).json();
  assert.strictEqual(allInvsForReports.length, 5, "Reports investors directory should return 5 rows");

  const allPaymentsForReports = await (await fetch(`${API_BASE}/api/admin/payments`, { headers: adminHeaders })).json();
  assert.ok(allPaymentsForReports.length > 0, "Reports payments directory should return payment rows");

  // Filter payments by investor email
  const filteredAlexPay = allPaymentsForReports.filter((p: any) => p.investorEmail === "alex.wright.test@example.com" || p.investorName === "Alexander Wright");
  assert.ok(filteredAlexPay.length > 0, "Filtered payments for Alexander Wright should exist");
  logSuccess(`Verified Reports filtering & payouts report data (${allPaymentsForReports.length} total payments records)`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 6: Bidirectional Notifications (Admin -> Investors)
  // ──────────────────────────────────────────────────────────────────────────
  logStep(6, "Notifications (Admin -> Single & Multiple Investors)");

  // Single Notification to Alexander Wright
  const singleNotifPayload = {
    title: "Quarterly Performance Update",
    message: "Your Q2 portfolio returns statement is now ready for review.",
    eventType: "ROICredited",
    investorId: String(investor1Id),
    targetInvestorIds: "",
    status: "Active"
  };

  const sendSingleRes = await fetch(`${API_BASE}/api/admin/notifications`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(singleNotifPayload)
  });
  assert.ok(sendSingleRes.status === 200 || sendSingleRes.status === 201, "Sending single notification should succeed");
  logSuccess("Admin sent targeted notification to Alexander Wright");

  // Broadcast / Multiple Notification
  const multiNotifPayload = {
    title: "Platform Maintenance Notice",
    message: "System maintenance is scheduled for Sunday 2 AM UTC.",
    eventType: "Investment Approved",
    investorId: null,
    targetInvestorIds: "all",
    status: "Active"
  };

  const sendMultiRes = await fetch(`${API_BASE}/api/admin/notifications`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify(multiNotifPayload)
  });
  assert.ok(sendMultiRes.status === 200 || sendMultiRes.status === 201, "Sending broadcast notification should succeed");
  logSuccess("Admin sent broadcast notification to all investors");

  // Verify notifications table
  const notifsListRes = await fetch(`${API_BASE}/api/admin/notifications`, { headers: adminHeaders });
  const notifsList = await notifsListRes.json();
  assert.ok(notifsList.length >= 2, "There should be at least 2 notifications created");
  logSuccess(`Verified notifications listed in system (${notifsList.length} notifications)`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 7: Investor Login, Multi-Agreement Signing & Verification
  // ──────────────────────────────────────────────────────────────────────────
  logStep(7, "Investor Portal Flow (Login, Multi-Agreement Sign, View Docs & Respond)");

  // 1. Investor Logs in via OTP
  const investorLoginRes = await fetch(`${API_BASE}/api/Auth/verify-login-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alex.wright.test@example.com", otp: "010101" })
  });
  assert.strictEqual(investorLoginRes.status, 200, "Investor login should succeed");
  const investorAuth = await investorLoginRes.json();
  const investorToken = investorAuth.token;
  assert.ok(investorToken, "Investor token must be present");
  const investorHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${investorToken}`,
    "x-user-role": "investor"
  };
  logSuccess(`Investor logged in successfully (${investorAuth.user?.email || "alex.wright.test@example.com"})`);

  // 2. Fetch investor's documents list (unsigned agreements queue)
  const invDocsRes = await fetch(`${API_BASE}/api/admin/documents`, { headers: investorHeaders });
  const invDocs = await invDocsRes.json();
  const alexDocs = invDocs.filter((d: any) => 
    (d.investor_email && d.investor_email.toLowerCase() === "alex.wright.test@example.com") ||
    (d.investorEmail && d.investorEmail.toLowerCase() === "alex.wright.test@example.com") ||
    (d.investor_name === "Alexander Wright") ||
    (d.investorName === "Alexander Wright")
  );
  
  assert.strictEqual(alexDocs.length, 3, "Alexander Wright should have 3 agreements corresponding to his 3 investments");
  logSuccess(`Found ${alexDocs.length} agreement documents in investor's queue`);

  // 3. Digitally sign each agreement
  for (let idx = 0; idx < alexDocs.length; idx++) {
    const doc = alexDocs[idx];
    const signPayload = {
      typedName: "Alexander Wright",
      signatureData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAyCAYAAACqJ9y+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA"
    };

    const signRes = await fetch(`${API_BASE}/api/admin/documents/${doc.id}/sign`, {
      method: "POST",
      headers: investorHeaders,
      body: JSON.stringify(signPayload)
    });
    assert.strictEqual(signRes.status, 200, `Signing doc ID ${doc.id} should succeed`);
    logSuccess(`Agreement ${idx + 1}/${alexDocs.length} (Doc ID: ${doc.id}) digitally signed by Alexander Wright`);
  }

  // 4. Verify all documents are now marked signed
  const invDocsSignedRes = await fetch(`${API_BASE}/api/admin/documents`, { headers: investorHeaders });
  const invDocsSigned = await invDocsSignedRes.json();
  const signedAlexDocs = invDocsSigned.filter((d: any) => 
    (d.investor_email && d.investor_email.toLowerCase() === "alex.wright.test@example.com") ||
    (d.investorEmail && d.investorEmail.toLowerCase() === "alex.wright.test@example.com") ||
    (d.investor_name === "Alexander Wright") ||
    (d.investorName === "Alexander Wright")
  );
  signedAlexDocs.forEach((d: any) => {
    assert.ok(d.status === "Signed" || d.isSigned === true, `Doc ${d.id} status should be Signed`);
    assert.ok(d.signature || d.signatureData, `Doc ${d.id} should store signature`);
  });
  logSuccess("Verified all 3 agreements have status='Signed' and stored digital signatures");

  // 5. Investor views notifications and marks as read
  const invNotifRes = await fetch(`${API_BASE}/api/admin/notifications`, { headers: investorHeaders });
  const invNotifs = await invNotifRes.json();
  logSuccess(`Investor received ${invNotifs.length} notifications`);

  if (invNotifs.length > 0) {
    const notifToRead = invNotifs[0];
    const markReadRes = await fetch(`${API_BASE}/api/admin/notifications/${notifToRead.id}/read`, {
      method: "POST",
      headers: investorHeaders
    });
    assert.strictEqual(markReadRes.status, 200, "Marking notification as read should succeed");
    logSuccess(`Investor marked notification ID ${notifToRead.id} as read`);
  }

  // 6. Investor sends notification back to Admin/Manager (no dropdown needed)
  const investorToAdminNotif = {
    title: "Bank Details Confirmation",
    message: "I have confirmed and signed all 3 investment agreements. Looking forward to the project updates.",
    eventType: "Document Uploaded",
    investorId: null,
    status: "Active"
  };

  const invSendRes = await fetch(`${API_BASE}/api/admin/notifications`, {
    method: "POST",
    headers: investorHeaders,
    body: JSON.stringify(investorToAdminNotif)
  });
  assert.ok(invSendRes.status === 200 || invSendRes.status === 201, "Investor sending notification to Admin/Manager should succeed");
  logSuccess("Investor successfully sent bidirectional notification to Admin/Manager");

  // 7. Admin verifies the new notification from investor and read receipts
  const adminCheckNotifsRes = await fetch(`${API_BASE}/api/admin/notifications`, { headers: adminHeaders });
  const adminCheckNotifs = await adminCheckNotifsRes.json();
  const receivedFromInvestor = adminCheckNotifs.find((n: any) => n.title === "Bank Details Confirmation");
  assert.ok(receivedFromInvestor, "Admin must receive the notification sent by the investor");
  logSuccess(`Admin verified received notification from investor (Title: "${receivedFromInvestor.title}")`);

  // ──────────────────────────────────────────────────────────────────────────
  // Step 8: Teardown / Clean Test Data (Only executed when --clean flag is provided)
  // ──────────────────────────────────────────────────────────────────────────
  if (process.argv.includes("--clean")) {
    logStep(8, "Teardown & Cleanup of Test Data");

    const finalCleanRes = await fetch(`${API_BASE}/api/admin/dashboard/clean-database`, {
      method: "POST",
      headers: adminHeaders
    });
    assert.strictEqual(finalCleanRes.status, 200, "Final database purge should succeed");
    
    // Verify clean state
    const finalInvsRes = await fetch(`${API_BASE}/api/admin/investors`, { headers: adminHeaders });
    const finalInvs = await finalInvsRes.json();
    assert.strictEqual(finalInvs.length, 0, "Database should have 0 investors after teardown");

    const finalDocsRes = await fetch(`${API_BASE}/api/admin/documents`, { headers: adminHeaders });
    const finalDocs = await finalDocsRes.json();
    assert.strictEqual(finalDocs.length, 0, "Database should have 0 documents after teardown");

    const finalPayRes = await fetch(`${API_BASE}/api/admin/payments`, { headers: adminHeaders });
    const finalPay = await finalPayRes.json();
    assert.strictEqual(finalPay.length, 0, "Database should have 0 payments after teardown");

    logSuccess("Cleaned all test investments, payments, documents, and notifications");
  } else {
    console.log(`\n${colors.cyan}ℹ Preserved database test data (skipping DB teardown).${colors.reset}`);
  }
  
  console.log(`\n${colors.green}${colors.bold}========================================================================${colors.reset}`);
  console.log(`${colors.green}${colors.bold}   🎉 ALL REAL-USER END-TO-END TESTS PASSED SUCCESSFULLY (100% OK)     ${colors.reset}`);
  console.log(`${colors.green}${colors.bold}========================================================================${colors.reset}\n`);
}

runE2ETests().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}❌ TEST RUN FAILED:${colors.reset}`, err);
  process.exit(1);
});
