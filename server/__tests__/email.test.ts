import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ENV module
vi.mock("../_core/env", () => ({
  ENV: {
    forgeApiUrl: "https://api.test.com",
    forgeApiKey: "test-api-key",
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendWelcomeEmail", () => {
    it("should send welcome email notification with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      // Import after mocking
      const { sendWelcomeEmail } = await import("../email");

      const result = await sendWelcomeEmail({
        recipientEmail: "test@example.com",
        recipientName: "John Doe",
        role: "sales_rep",
        loginUrl: "https://example.com/crm",
        companyName: "Test Company",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("SendNotification");
      expect(options.method).toBe("POST");
      expect(options.headers.authorization).toBe("Bearer test-api-key");
      
      const body = JSON.parse(options.body);
      expect(body.title).toContain("John Doe");
      expect(body.content).toContain("test@example.com");
      expect(body.content).toContain("Sales Rep");
      expect(body.content).toContain("https://example.com/crm");
    });

    it("should return false when notification service fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const { sendWelcomeEmail } = await import("../email");

      const result = await sendWelcomeEmail({
        recipientEmail: "test@example.com",
        recipientName: "John Doe",
        role: "admin",
        loginUrl: "https://example.com/crm",
      });

      expect(result).toBe(false);
    });

    it("should return false when fetch throws an error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { sendWelcomeEmail } = await import("../email");

      const result = await sendWelcomeEmail({
        recipientEmail: "test@example.com",
        recipientName: "Jane Doe",
        role: "team_lead",
        loginUrl: "https://example.com/crm",
      });

      expect(result).toBe(false);
    });
  });

  describe("getWelcomeEmailHtml", () => {
    it("should generate HTML email with correct content", async () => {
      const { getWelcomeEmailHtml } = await import("../email");

      const html = getWelcomeEmailHtml({
        recipientEmail: "test@example.com",
        recipientName: "John Doe",
        role: "sales_rep",
        loginUrl: "https://example.com/crm",
        companyName: "NextDoor Exterior Solutions",
      });

      expect(html).toContain("John Doe");
      expect(html).toContain("test@example.com");
      expect(html).toContain("Sales Rep");
      expect(html).toContain("https://example.com/crm");
      expect(html).toContain("NextDoor Exterior Solutions");
      expect(html).toContain("<!DOCTYPE html>");
    });

    it("should include role-specific description", async () => {
      const { getWelcomeEmailHtml } = await import("../email");

      const salesRepHtml = getWelcomeEmailHtml({
        recipientEmail: "rep@example.com",
        recipientName: "Sales Person",
        role: "sales_rep",
        loginUrl: "https://example.com/crm",
      });

      expect(salesRepHtml).toContain("assigned to you");

      const adminHtml = getWelcomeEmailHtml({
        recipientEmail: "admin@example.com",
        recipientName: "Admin Person",
        role: "admin",
        loginUrl: "https://example.com/crm",
      });

      expect(adminHtml).toContain("view and edit all");
    });
  });

  describe("getWelcomeEmailText", () => {
    it("should generate plain text email with correct content", async () => {
      const { getWelcomeEmailText } = await import("../email");

      const text = getWelcomeEmailText({
        recipientEmail: "test@example.com",
        recipientName: "John Doe",
        role: "owner",
        loginUrl: "https://example.com/crm",
        companyName: "Test Company",
      });

      expect(text).toContain("John Doe");
      expect(text).toContain("test@example.com");
      expect(text).toContain("Owner");
      expect(text).toContain("https://example.com/crm");
      expect(text).toContain("Test Company");
      expect(text).not.toContain("<"); // No HTML tags
    });
  });

  describe("Role display names", () => {
    it("should correctly map all role values to display names", async () => {
      const { getWelcomeEmailText } = await import("../email");

      const roles = ["owner", "admin", "team_lead", "sales_rep", "office"];
      const expectedNames = ["Owner", "Admin", "Team Lead", "Sales Rep", "Office Staff"];

      roles.forEach((role, index) => {
        const text = getWelcomeEmailText({
          recipientEmail: "test@example.com",
          recipientName: "Test User",
          role,
          loginUrl: "https://example.com/crm",
        });

        expect(text).toContain(expectedNames[index]);
      });
    });
  });
});
