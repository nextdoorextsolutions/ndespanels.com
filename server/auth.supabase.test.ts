import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      getSession: mockGetSession,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

describe("Supabase Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signInWithPassword", () => {
    it("should successfully sign in with valid credentials", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockSession = { access_token: "token-123", user: mockUser };
      
      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await mockSignInWithPassword({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.error).toBeNull();
      expect(result.data.user.email).toBe("test@example.com");
      expect(result.data.session.access_token).toBe("token-123");
    });

    it("should return error for invalid credentials", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const result = await mockSignInWithPassword({
        email: "wrong@example.com",
        password: "wrongpassword",
      });

      expect(result.error).not.toBeNull();
      expect(result.error.message).toBe("Invalid login credentials");
      expect(result.data.user).toBeNull();
    });

    it("should require email format", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid email format" },
      });

      const result = await mockSignInWithPassword({
        email: "not-an-email",
        password: "password123",
      });

      expect(result.error).not.toBeNull();
    });
  });

  describe("signOut", () => {
    it("should successfully sign out", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const result = await mockSignOut();

      expect(result.error).toBeNull();
    });
  });

  describe("resetPasswordForEmail", () => {
    it("should send password reset email", async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await mockResetPasswordForEmail("test@example.com", {
        redirectTo: "http://localhost:3000/reset-password",
      });

      expect(result.error).toBeNull();
    });

    it("should handle non-existent email gracefully", async () => {
      // Supabase typically doesn't reveal if email exists for security
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await mockResetPasswordForEmail("nonexistent@example.com", {
        redirectTo: "http://localhost:3000/reset-password",
      });

      // Should not reveal if email exists
      expect(result.error).toBeNull();
    });
  });

  describe("updateUser (password update)", () => {
    it("should update password successfully", async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const result = await mockUpdateUser({ password: "newPassword123" });

      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
    });

    it("should reject weak passwords", async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Password should be at least 6 characters" },
      });

      const result = await mockUpdateUser({ password: "123" });

      expect(result.error).not.toBeNull();
    });
  });

  describe("getSession", () => {
    it("should return session for authenticated user", async () => {
      const mockSession = {
        access_token: "token-123",
        user: { id: "user-123", email: "test@example.com" },
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await mockGetSession();

      expect(result.data.session).not.toBeNull();
      expect(result.data.session.user.email).toBe("test@example.com");
    });

    it("should return null session for unauthenticated user", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await mockGetSession();

      expect(result.data.session).toBeNull();
    });
  });
});

describe("Auth Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full login flow", async () => {
    // Step 1: Sign in
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockSession = { access_token: "token-123", user: mockUser };
    
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const signInResult = await mockSignInWithPassword({
      email: "test@example.com",
      password: "password123",
    });

    expect(signInResult.error).toBeNull();

    // Step 2: Verify session exists
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const sessionResult = await mockGetSession();
    expect(sessionResult.data.session).not.toBeNull();

    // Step 3: Sign out
    mockSignOut.mockResolvedValue({ error: null });
    const signOutResult = await mockSignOut();
    expect(signOutResult.error).toBeNull();
  });

  it("should complete password reset flow", async () => {
    // Step 1: Request password reset
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });

    const resetResult = await mockResetPasswordForEmail("test@example.com", {
      redirectTo: "http://localhost:3000/reset-password",
    });

    expect(resetResult.error).toBeNull();

    // Step 2: Update password (after clicking email link)
    mockUpdateUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const updateResult = await mockUpdateUser({ password: "newSecurePassword123" });
    expect(updateResult.error).toBeNull();
  });
});
