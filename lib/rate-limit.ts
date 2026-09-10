import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Login attempts by IP address
export const loginIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  prefix: "login:ip",
  analytics: true,
});

// Login attempts by email address
export const loginEmailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "login:email",
  analytics: true,
});

// Registration attempts by IP address
export const registrationIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "register:ip",
  analytics: true,
});

// Registration attempts by email address
export const registrationEmailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  prefix: "register:email",
  analytics: true,
});

// Forgot password attempts by IP address
export const forgotPasswordIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "forgot-password:ip",
  analytics: true,
});

// Forgot password attempts by email address
export const forgotPasswordEmailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  prefix: "forgot-password:email",
  analytics: true,
});

// Password reset attempts by IP address
export const resetPasswordIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "reset-password:ip",
  analytics: true,
});

// Email verification attempts by IP address
export const verifyEmailIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "15 m"),
  prefix: "verify-email:ip",
  analytics: true,
});

// Resend verification attempts by IP address
export const resendVerificationIpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "resend-verification:ip",
  analytics: true,
});

// Resend verification attempts by email address
export const resendVerificationEmailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  prefix: "resend-verification:email",
  analytics: true,
});
