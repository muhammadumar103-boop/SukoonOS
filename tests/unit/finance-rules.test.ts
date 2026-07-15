import { describe, expect, it } from "vitest";
import { expenseSignedAmounts, financialRecordSignedAmounts, donationSignedAmounts, transferImpactsBalances } from "@/lib/local-data/finance-rules";

describe("finance rules", () => {
  it("keeps historical exchange-rate conversions on approved expenses", () => {
    const signed = expenseSignedAmounts({
      id: "expense-1",
      date: "2026-07-15",
      originalAmount: 100,
      originalCurrency: "USD",
      exchangeRate: 300,
      category: "Food",
      projectId: "project-food",
      project: "Food Parcels",
      fundingAccountId: "main-donations-bank",
      description: "Field purchase",
      paymentMethod: "Card",
      paidBy: "Ops",
      receiptReference: "EXP-1",
      transferReference: "",
      approvalStatus: "Approved",
      proofNotes: "",
      notes: "",
      attachments: [],
    });

    expect(signed.pkrAmount).toBe(-30000);
    expect(signed.usdAmount).toBe(-100);
    expect(signed.netPkrAmount).toBe(-30000);
    expect(signed.netUsdAmount).toBe(-100);
  });

  it("keeps non-final donations out of balances and flips refunded donations negative", () => {
    const processingDonation = {
      id: "donation-processing",
      donorId: "donor-1",
      donorName: "Donor",
      projectId: "project-1",
      project: "Food Parcels",
      accountId: "main-donations-bank",
      method: "Bank Transfer",
      date: "2026-07-15",
      status: "Processing",
      receiptReference: "DON-1",
      notes: "",
      originalAmount: 500,
      originalCurrency: "USD",
      exchangeRate: 280,
      pkrAmount: 140000,
      usdAmount: 500,
    } as const;
    const processing = donationSignedAmounts(processingDonation);
    const refunded = donationSignedAmounts({
      ...processingDonation,
      id: "donation-refunded",
      status: "Refunded",
    });

    expect(processing.netPkrAmount).toBe(0);
    expect(processing.netUsdAmount).toBe(0);
    expect(refunded.netPkrAmount).toBe(-140000);
    expect(refunded.netUsdAmount).toBe(-500);
  });

  it("only lets completed transfers and posted records affect balances", () => {
    expect(transferImpactsBalances({ status: "Review" })).toBe(false);
    expect(transferImpactsBalances({ status: "Scheduled" })).toBe(false);
    expect(transferImpactsBalances({ status: "Completed" })).toBe(true);

    const feeRecord = {
      id: "fee-1",
      type: "Fee",
      accountId: "operations-bank-pkr",
      projectId: "project-general",
      project: "General Operations",
      date: "2026-07-15",
      status: "Posted",
      description: "Transfer fee",
      party: "Bank",
      method: "Bank Transfer",
      reference: "FEE-1",
      notes: "",
      originalAmount: 1000,
      originalCurrency: "PKR",
      exchangeRate: 280,
      pkrAmount: 1000,
      usdAmount: 1000 / 280,
    } as const;
    const fee = financialRecordSignedAmounts(feeRecord);
    const draftAdjustment = financialRecordSignedAmounts({
      ...feeRecord,
      id: "adj-1",
      type: "Adjustment",
      status: "Draft",
    });

    expect(fee.netPkrAmount).toBe(-1000);
    expect(draftAdjustment.netPkrAmount).toBe(0);
  });
});
