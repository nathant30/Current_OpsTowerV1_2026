/**
 * E2E Test Authentication Helpers
 * Reusable authentication utilities for Playwright tests
 */

import { Page, expect } from '@playwright/test';
import { TestUser } from '../fixtures/test-users';

export interface LoginOptions {
  rememberMe?: boolean;
  timeout?: number;
  expectSuccess?: boolean;
}

/**
 * Login as a test user
 */
export async function login(
  page: Page,
  email: string,
  password: string,
  options: LoginOptions = {}
): Promise<void> {
  const {
    rememberMe = false,
    timeout = 10000,
    expectSuccess = true
  } = options;

  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);

  // Handle remember me checkbox if present
  if (rememberMe) {
    const rememberCheckbox = page.locator('input[name="remember"], input[type="checkbox"][id*="remember"]');
    if (await rememberCheckbox.isVisible()) {
      await rememberCheckbox.check();
    }
  }

  // Submit login form
  await page.click('button[type="submit"]:has-text("Login"), button:has-text("Sign In")');

  if (expectSuccess) {
    // Wait for navigation away from login page
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout });

    // Verify we're logged in by checking for auth token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('xpress_auth_token'));
    if (!token) {
      throw new Error('Login failed: No auth token found');
    }
  }
}

/**
 * Login with a test user object
 */
export async function loginAsUser(
  page: Page,
  user: TestUser,
  options: LoginOptions = {}
): Promise<void> {
  await login(page, user.email, user.password, options);
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  // Try to find and click logout button
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Sign Out")',
    'a:has-text("Logout")',
    'a:has-text("Sign Out")',
    '[data-testid="logout-button"]',
    '[data-testid="signout-button"]'
  ];

  for (const selector of logoutSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
      await button.click();
      break;
    }
  }

  // Clear auth tokens manually as backup
  await clearAuthTokens(page);

  // Wait for redirect to login page
  await page.waitForTimeout(1000);
}

/**
 * Clear authentication tokens from localStorage
 */
export async function clearAuthTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('xpress_auth_token');
    localStorage.removeItem('xpress_refresh_token');
    localStorage.removeItem('xpress_user');
    sessionStorage.clear();
  });
}

/**
 * Get stored auth token
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('xpress_auth_token'));
}

/**
 * Get stored refresh token
 */
export async function getRefreshToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('xpress_refresh_token'));
}

/**
 * Set auth token directly (for bypassing login in some tests)
 */
export async function setAuthToken(page: Page, token: string, refreshToken?: string): Promise<void> {
  await page.evaluate(({ token, refreshToken }) => {
    localStorage.setItem('xpress_auth_token', token);
    if (refreshToken) {
      localStorage.setItem('xpress_refresh_token', refreshToken);
    }
  }, { token, refreshToken });
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await getAuthToken(page);
  return token !== null && token.length > 0;
}

/**
 * Get current user info from localStorage
 */
export async function getCurrentUser(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem('xpress_user');
    return userStr ? JSON.parse(userStr) : null;
  });
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page, timeout: number = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const token = localStorage.getItem('xpress_auth_token');
      return token !== null && token.length > 0;
    },
    { timeout }
  );
}

/**
 * Verify user role after login
 */
export async function verifyUserRole(page: Page, expectedRole: string): Promise<void> {
  const user = await getCurrentUser(page);
  expect(user).not.toBeNull();
  expect(user.role).toBe(expectedRole);
}

/**
 * Setup authenticated session with API token
 * Useful for tests that don't need to go through UI login
 */
export async function setupAuthenticatedSession(
  page: Page,
  user: TestUser,
  baseURL: string = 'http://localhost:4000'
): Promise<void> {
  // Make API call to get auth token
  const response = await page.request.post(`${baseURL}/api/auth/login`, {
    data: {
      email: user.email,
      password: user.password
    }
  });

  if (!response.ok()) {
    throw new Error(`Failed to authenticate: ${response.status()}`);
  }

  const data = await response.json();

  // Set tokens in localStorage
  await page.evaluate(({ token, refreshToken, user }) => {
    localStorage.setItem('xpress_auth_token', token);
    if (refreshToken) {
      localStorage.setItem('xpress_refresh_token', refreshToken);
    }
    if (user) {
      localStorage.setItem('xpress_user', JSON.stringify(user));
    }
  }, {
    token: data.token || data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user
  });
}

/**
 * Create auth context for tests that need authentication
 */
export async function createAuthenticatedContext(
  page: Page,
  user: TestUser
): Promise<void> {
  await clearAuthTokens(page);
  await loginAsUser(page, user);
  await waitForAuth(page);
}

/**
 * Handle MFA code entry if required
 */
export async function handleMFA(page: Page, code: string): Promise<void> {
  const mfaInput = page.locator('input[name="mfaCode"], input[name="otp"], input[placeholder*="code" i]');

  if (await mfaInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await mfaInput.fill(code);
    await page.click('button[type="submit"]:has-text("Verify"), button:has-text("Submit")');
    await page.waitForTimeout(1000);
  }
}

/**
 * Verify user has access to a protected page
 */
export async function verifyPageAccess(page: Page, path: string, shouldHaveAccess: boolean = true): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  const currentUrl = page.url();

  if (shouldHaveAccess) {
    // Should be on the requested page, not redirected to login
    expect(currentUrl).toContain(path);
    expect(currentUrl).not.toContain('/login');
  } else {
    // Should be redirected to login or show 403
    const isOnLogin = currentUrl.includes('/login');
    const has403 = await page.locator('text=/403|forbidden|unauthorized/i').isVisible().catch(() => false);
    expect(isOnLogin || has403).toBeTruthy();
  }
}
