/**
 * Global test setup.
 * - `server-only` throws outside a React Server environment; stub it for tests.
 * - Provide a deterministic session secret.
 */
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123";
process.env.LOG_LEVEL = "error";
