import nodemailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

if (!gmailUser || !gmailAppPassword) {
  throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be configured");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: gmailAppPassword,
  },
});

export async function sendActivationEmail(
  email: string,
  token: string,
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const activationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: gmailUser,
    to: email,
    subject: "Activate your account",
    html: `
      <h2>Activate Your Account</h2>

      <p>Thank you for registering.</p>

      <p>
        Click the button below to activate your account:
      </p>

      <p>
        <a
          href="${activationUrl}"
          style="
            display:inline-block;
            padding:10px 18px;
            background:#000;
            color:#fff;
            text-decoration:none;
            border-radius:6px;
          "
        >
          Activate Account
        </a>
      </p>

      <p>
        This activation link will expire in 24 hours.
      </p>

      <p>
        If you did not create this account, you can ignore this email.
      </p>
    `,
  });

  console.log("Activation email sent to:", email);
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: gmailUser,
    to: email,
    subject: "Reset your password",
    html: `
      <h2>Reset Your Password</h2>

      <p>
        We received a request to reset your password.
      </p>

      <p>
        Click the button below to choose a new password:
      </p>

      <p>
        <a
          href="${resetUrl}"
          style="
            display:inline-block;
            padding:10px 18px;
            background:#000;
            color:#fff;
            text-decoration:none;
            border-radius:6px;
          "
        >
          Reset Password
        </a>
      </p>

      <p>
        This reset link will expire in 30 minutes.
      </p>

      <p>
        If you did not request a password reset, you can ignore this email.
      </p>
    `,
  });

  console.log("Password reset email sent to:", email);
}
