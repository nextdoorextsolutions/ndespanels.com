import { ENV } from "./_core/env";

interface WelcomeEmailParams {
  recipientEmail: string;
  recipientName: string;
  role: string;
  loginUrl: string;
  companyName?: string;
}

/**
 * Get the display name for a role
 */
function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    team_lead: "Team Lead",
    sales_rep: "Sales Rep",
    office: "Office Staff",
  };
  return roleNames[role] || role;
}

/**
 * Get role description for the email
 */
function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    owner: "As an Owner, you have full access to all features including viewing, editing, deleting records, and viewing edit history.",
    admin: "As an Admin, you can view and edit all jobs and team data. You have access to reports and analytics.",
    team_lead: "As a Team Lead, you can view and manage your own jobs as well as jobs assigned to team members under your supervision.",
    sales_rep: "As a Sales Rep, you can view and edit jobs that are assigned to you. Track your leads and manage your pipeline.",
    office: "As Office Staff, you have administrative access to view and edit all jobs and assist with day-to-day operations.",
  };
  return descriptions[role] || "Welcome to the team!";
}

/**
 * Build HTML email template for welcome email
 */
function buildWelcomeEmailHtml(params: WelcomeEmailParams): string {
  const { recipientName, role, loginUrl, companyName = "NextDoor Exterior Solutions" } = params;
  const roleDisplayName = getRoleDisplayName(role);
  const roleDescription = getRoleDescription(role);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 40px 30px;">
              <h1 style="margin: 0; color: #2dd4bf; font-size: 28px; font-weight: 700;">
                Welcome to ${companyName}
              </h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 16px;">
                Your CRM account has been created
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
                Hi <strong>${recipientName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
                Your account has been created for the ${companyName} CRM system. You've been assigned the role of <strong style="color: #2dd4bf;">${roleDisplayName}</strong>.
              </p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #2dd4bf; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                  ${roleDescription}
                </p>
              </div>
              
              <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">
                Click the button below to log in to your account:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #2dd4bf;">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; color: #0f172a; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Log In to CRM →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                <strong>How to log in:</strong><br>
                Use the email address <strong>${params.recipientEmail}</strong> to sign in via Manus authentication. If you don't have a Manus account yet, you'll be prompted to create one using this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                This email was sent by ${companyName} CRM.<br>
                If you didn't expect this email, please contact your administrator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Build plain text version of welcome email
 */
function buildWelcomeEmailText(params: WelcomeEmailParams): string {
  const { recipientName, role, loginUrl, companyName = "NextDoor Exterior Solutions" } = params;
  const roleDisplayName = getRoleDisplayName(role);
  const roleDescription = getRoleDescription(role);

  return `
Welcome to ${companyName}!

Hi ${recipientName},

Your account has been created for the ${companyName} CRM system. You've been assigned the role of ${roleDisplayName}.

${roleDescription}

Log in to your account here:
${loginUrl}

How to log in:
Use the email address ${params.recipientEmail} to sign in via Manus authentication. If you don't have a Manus account yet, you'll be prompted to create one using this email.

---
This email was sent by ${companyName} CRM.
If you didn't expect this email, please contact your administrator.
`.trim();
}

/**
 * Send welcome email to new team member using the Manus notification service
 * This sends a notification to the owner who can then forward the login info
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  const { recipientEmail, recipientName, role, loginUrl } = params;
  const roleDisplayName = getRoleDisplayName(role);
  
  // Since we can't send emails directly to users, we'll notify the owner
  // with the welcome message details so they can share with the new team member
  
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.log("[Email] Notification service not configured, skipping welcome email");
    return false;
  }

  const endpoint = `${ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : ENV.forgeApiUrl + "/"}webdevtoken.v1.WebDevService/SendNotification`;

  try {
    const title = `New Team Account Created: ${recipientName}`;
    const content = `
A new team account has been created. Please share the following login information with the new team member:

👤 Name: ${recipientName}
📧 Email: ${recipientEmail}
🔑 Role: ${roleDisplayName}

Login Instructions:
1. Go to: ${loginUrl}
2. Click "Sign In" 
3. Use email: ${recipientEmail}
4. Create a Manus account if needed using this email

---
Welcome Email Content to Share:
---

Hi ${recipientName},

Your account has been created for the NextDoor Exterior Solutions CRM. You've been assigned the role of ${roleDisplayName}.

${getRoleDescription(role)}

Log in here: ${loginUrl}

Use your email (${recipientEmail}) to sign in via Manus authentication.
`.trim();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[Email] Failed to send welcome notification (${response.status})${detail ? `: ${detail}` : ""}`);
      return false;
    }

    console.log(`[Email] Welcome notification sent for ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Error sending welcome notification:", error);
    return false;
  }
}

/**
 * Get the HTML content of the welcome email (for display in UI)
 */
export function getWelcomeEmailHtml(params: WelcomeEmailParams): string {
  return buildWelcomeEmailHtml(params);
}

/**
 * Get the plain text content of the welcome email (for display in UI)
 */
export function getWelcomeEmailText(params: WelcomeEmailParams): string {
  return buildWelcomeEmailText(params);
}
