// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_API_KEY);

// export async function sendOtpEmail(email: string, otp: string) {
//   return resend.emails.send({
//     from: "onboarding@resend.dev",
//     to: email,
//     subject: "Your verification code",
//     html: `
//       <h2>Email Verification</h2>
//       <p>Your verification code is:</p>

//       <h1>${otp}</h1>

//       <p>This code will expire in 10 minutes.</p>

//       <p>If you did not request this code, you can ignore this email.</p>
//     `,
//   });
// }

// Console OTP Printing

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  // Development only
  console.log("=================================");
  console.log("OTP EMAIL");
  console.log("To:", email);
  console.log("OTP:", otp);
  console.log("=================================");
}
