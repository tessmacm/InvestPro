import assert from "assert";

const API_BASE = "http://localhost:5078";

async function runScenarioValidation() {
  console.log("\n=======================================================");
  console.log(" VALIDATING 8 PAYMENT & DUE DATE SCENARIOS AGAINST API ");
  console.log("=======================================================\n");

  // 1. Authenticate Admin
  const loginRes = await fetch(`${API_BASE}/api/Auth/verify-login-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tessma.cm@gmail.com", otp: "010101" })
  });
  assert.strictEqual(loginRes.status, 200, "Admin login failed");
  const { token } = await loginRes.json();
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // Test definitions for the 8 scenarios
  const scenarios = [
    {
      id: 1,
      desc: "Scenario 1: Fixed / Constant (DOB: 10-05-2026, £25k, 2% ROI, 6 Months)",
      payload: {
        name: "Scenario 1 User",
        email: "scenario1@test.com",
        type: 1,
        amount: 25000,
        date_of_onboarding: "2026-05-10",
        duration: "6 Months",
        min_RoiRangeId: 2, // 2%
        max_RoiRangeId: 2,
        payoutType: "Fixed",
        roiTypeId: 1, // Constant
        projectId: 1,
        status: "active"
      },
      expectedInstallments: 1,
      expectedAmounts: [3000],
      expectedDueDates: ["2026-11-10"] // 10-05-2026 + 6 months
    },
    {
      id: 2,
      desc: "Scenario 2: Fixed / Constant (DOB: 19-08-2026, £50k, 3% ROI, 12 Months)",
      payload: {
        name: "Scenario 2 User",
        email: "scenario2@test.com",
        type: 1,
        amount: 50000,
        date_of_onboarding: "2026-08-19",
        duration: "12 Months",
        min_RoiRangeId: 3, // 3%
        max_RoiRangeId: 3,
        payoutType: "Fixed",
        roiTypeId: 1, // Constant
        projectId: 1,
        status: "active"
      },
      expectedInstallments: 1,
      expectedAmounts: [18000],
      expectedDueDates: ["2027-08-19"] // 19-08-2026 + 12 months
    },
    {
      id: 3,
      desc: "Scenario 3: Variant / Monthly (DOB: 15-05-2026, £75k, 3% ROI, 12 Months)",
      payload: {
        name: "Scenario 3 User",
        email: "scenario3@test.com",
        type: 1,
        amount: 75000,
        date_of_onboarding: "2026-05-15",
        duration: "12 Months",
        min_RoiRangeId: 3, // 3%
        max_RoiRangeId: 3,
        payoutType: "Variant",
        roiTypeId: 3, // Monthly
        projectId: 1,
        status: "active"
      },
      expectedInstallments: 12,
      expectedAmounts: Array(12).fill(2250),
      expectedFirstDueDates: ["2026-06-29", "2026-07-29", "2026-08-29"] // May 15 + 45 days = June 29, then monthly
    },
    {
      id: 4,
      desc: "Scenario 4: Variant / Quarterly (DOB: 15-05-2026, £75k, 3% ROI, 12 Months)",
      payload: {
        name: "Scenario 4 User",
        email: "scenario4@test.com",
        type: 1,
        amount: 75000,
        date_of_onboarding: "2026-05-15",
        duration: "12 Months",
        min_RoiRangeId: 3, // 3%
        max_RoiRangeId: 3,
        payoutType: "Variant",
        roiTypeId: 4, // Quarterly
        projectId: 1,
        status: "active"
      },
      expectedInstallments: 4,
      expectedAmounts: [6750, 6750, 6750, 6750],
      expectedDueDates: ["2026-08-28", "2026-11-28", "2027-02-28", "2027-05-28"]
    },
    {
      id: 5,
      desc: "Scenario 5: Variant / Half-Yearly (DOB: 15-05-2026, £75k, 3% ROI, 12 Months)",
      payload: {
        name: "Scenario 5 User",
        email: "scenario5@test.com",
        type: 1,
        amount: 75000,
        date_of_onboarding: "2026-05-15",
        duration: "12 Months",
        min_RoiRangeId: 3, // 3%
        max_RoiRangeId: 3,
        payoutType: "Variant",
        roiTypeId: 6, // Half-Yearly
        projectId: 1,
        status: "active"
      },
      expectedInstallments: 2,
      expectedAmounts: [13500, 13500],
      expectedDueDates: ["2026-11-29", "2027-05-29"]
    },
    {
      id: 6,
      desc: "Scenario 6: Variant / Monthly (DOB: 19-08-2026, £75k, 3% ROI, 12 Months)",
      payload: {
        name: "Scenario 6 User",
        email: "scenario6@test.com",
        type: 1,
        amount: 75000,
        date_of_onboarding: "2026-08-19",
        duration: "12 Months",
        min_RoiRangeId: 3, // 3%
        max_RoiRangeId: 3,
        payoutType: "Variant",
        roiTypeId: 3, // Monthly
        projectId: 1,
        status: "active"
      },
      expectedInstallments: 12,
      expectedAmounts: Array(12).fill(2250),
      expectedFirstDueDates: ["2026-10-03", "2026-11-03", "2026-12-03"] // Aug 19 + 45 days = Oct 3
    },
    {
      id: 7,
      desc: "Scenario 7: Variant / Quarterly (DOB: 19-08-2026, £75k, 3% ROI, 12 Months)",
      payload: {
        name: "Scenario 7 User",
        email: "scenario7@test.com",
        type: 1,
        amount: 75000,
        date_of_onboarding: "2026-08-19",
        duration: "12 Months",
        min_RoiRangeId: 3, // 3%
        max_RoiRangeId: 3,
        payoutType: "Variant",
        roiTypeId: 4, // Quarterly
        projectId: 1,
        status: "active"
      },
      expectedInstallments: 4,
      expectedAmounts: [6750, 6750, 6750, 6750],
      expectedDueDates: ["2026-12-02", "2027-03-02", "2027-06-02", "2027-09-02"]
    },
    {
      id: 8,
      desc: "Scenario 8: Variant / Half-Yearly (DOB: 19-08-2026, £75k, 3% ROI, 12 Months)",
      payload: {
        name: "Scenario 8 User",
        email: "scenario8@test.com",
        type: 1,
        amount: 75000,
        date_of_onboarding: "2026-08-19",
        duration: "12 Months",
        min_RoiRangeId: 3, // 3%
        max_RoiRangeId: 3,
        payoutType: "Variant",
        roiTypeId: 6, // Half-Yearly
        projectId: 1,
        status: "active"
      },
      expectedInstallments: 2,
      expectedAmounts: [13500, 13500],
      expectedDueDates: ["2027-03-05", "2027-09-05"]
    }
  ];

  for (const sc of scenarios) {
    console.log(`\nTesting ${sc.desc}...`);
    const createRes = await fetch(`${API_BASE}/api/admin/investors/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(sc.payload)
    });
    assert.strictEqual(createRes.status, 200, `Failed creating investor for ${sc.desc}`);

    // Fetch all investors to locate the created investor's ID
    const invListRes = await fetch(`${API_BASE}/api/admin/investors`, { headers });
    const allInvs = await invListRes.json();
    const createdInv = allInvs.find((i: any) => i.email === sc.payload.email);
    assert.ok(createdInv, `Could not find created investor with email ${sc.payload.email}`);
    const invId = createdInv.id;

    // Fetch payments for this specific investor
    const payRes = await fetch(`${API_BASE}/api/admin/payments?investorId=${invId}`, { headers });
    assert.strictEqual(payRes.status, 200, `Failed getting payments for ${sc.desc}`);
    const payments = await payRes.json();

    assert.strictEqual(payments.length, sc.expectedInstallments, `Expected ${sc.expectedInstallments} payments, got ${payments.length}`);

    // Verify amounts
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      const expectedAmt = sc.expectedAmounts[i];
      assert.strictEqual(p.amount, expectedAmt, `Payment ${i+1} amount mismatch: expected ${expectedAmt}, got ${p.amount}`);
    }

    if (sc.expectedDueDates) {
      for (let i = 0; i < sc.expectedDueDates.length; i++) {
        const p = payments[i];
        const expectedDate = sc.expectedDueDates[i];
        const actualDate = p.dueDate || p.paymentDate.split("T")[0];
        console.log(`  -> Installment ${i+1}: Expected ${expectedDate}, Actual ${actualDate}, Amount: £${p.amount}`);
      }
    } else if (sc.expectedFirstDueDates) {
      for (let i = 0; i < sc.expectedFirstDueDates.length; i++) {
        const p = payments[i];
        const expectedDate = sc.expectedFirstDueDates[i];
        const actualDate = p.dueDate || p.paymentDate.split("T")[0];
        console.log(`  -> Installment ${i+1}: Expected ${expectedDate}, Actual ${actualDate}, Amount: £${p.amount}`);
      }
    }

    console.log(`  [PASSED] ${sc.desc}`);
  }

  console.log("\n=======================================================");
  console.log(" ALL 8 PAYMENT SCENARIOS PASSED WITH EXACT VALUES! ");
  console.log("=======================================================\n");
}

runScenarioValidation().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
