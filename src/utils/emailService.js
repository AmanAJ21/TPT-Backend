const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Check if email is disabled
    this.isDisabled = process.env.EMAIL_DISABLED === 'true' ||
      (process.env.NODE_ENV === 'production' && !process.env.EMAIL_HOST);

    if (this.isDisabled) {
      console.log('📧 Email service is disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 120000, // 2 minutes
      greetingTimeout: 60000, // 1 minute
      socketTimeout: 120000, // 2 minutes
      pool: true, // Use connection pooling
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 14, // Max 14 messages per second
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
      tls: {
        rejectUnauthorized: false // For development/testing
      }
    });

    // Verify connection configuration (skip in production to avoid startup delays)
    this.verifyConnection(process.env.NODE_ENV === 'production');
  }

  async verifyConnection(skipVerification = false) {
    if (this.isDisabled) {
      console.log('📧 Email service is disabled - skipping verification');
      return false;
    }

    // Skip verification in production or if explicitly requested
    if (skipVerification || process.env.NODE_ENV === 'production') {
      console.log('📧 Skipping email verification - will verify on first send');
      return true;
    }

    try {
      console.log('🔄 Verifying email connection...');
      console.log(`📧 Host: ${process.env.EMAIL_HOST}`);
      console.log(`📧 Port: ${process.env.EMAIL_PORT}`);
      console.log(`📧 User: ${process.env.EMAIL_USER}`);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Verification timeout after 30 seconds')), 30000);
      });

      // Race between verification and timeout
      await Promise.race([
        this.transporter.verify(),
        timeoutPromise
      ]);

      console.log('✅ Email service is ready to send messages');
      return true;
    } catch (error) {
      console.warn('⚠️ Email service verification failed:', error.message);

      // Don't fail completely - just warn and continue
      if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        console.warn('⚠️ Verification timed out - will attempt to send emails anyway');
        console.warn('💡 This is common with Ethereal email - emails may still work');
        return true; // Return true to allow email sending attempts
      } else if (error.code === 'ENOTFOUND') {
        console.error('❌ SMTP server not found - check the EMAIL_HOST setting');
        return false;
      } else if (error.responseCode === 535) {
        console.error('❌ Authentication failed - check EMAIL_USER and EMAIL_PASS');
        return false;
      }

      // For other errors, warn but don't fail
      console.warn('⚠️ Verification failed but will attempt to send emails anyway');
      return true;
    }
  }

  async sendEmail({ to, subject, html, text }, retryCount = 0) {
    // Check if email service is disabled
    if (this.isDisabled) {
      console.log('📧 Email service disabled - would have sent email to:', to);
      console.log('📧 Subject:', subject);
      return {
        success: false,
        error: 'Email service is disabled. Configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your .env file to enable email functionality.'
      };
    }

    const maxRetries = 3;
    const retryDelay = 3000 * (retryCount + 1); // Exponential backoff

    try {
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'Transport Manager'} <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      console.log(`📧 Attempting to send email to: ${to} (attempt ${retryCount + 1}/${maxRetries + 1})`);

      // Create a timeout promise for the email sending
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 2 minutes')), 120000);
      });

      // Race between sending email and timeout
      const info = await Promise.race([
        this.transporter.sendMail(mailOptions),
        timeoutPromise
      ]);

      console.log('📧 Email sent successfully:', info.messageId);

      // For Ethereal Email, log the preview URL
      if (process.env.EMAIL_HOST === 'smtp.ethereal.email') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log('📧 Preview URL:', previewUrl);
        }
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: process.env.EMAIL_HOST === 'smtp.ethereal.email' ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error(`❌ Email sending failed (attempt ${retryCount + 1}):`, error.message);

      // Retry logic for connection issues
      const retryableErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH'];
      const shouldRetry = retryCount < maxRetries &&
        (retryableErrors.includes(error.code) || error.message.includes('timeout'));

      if (shouldRetry) {
        console.log(`🔄 Retrying email send in ${retryDelay}ms... (${error.code || 'UNKNOWN_ERROR'})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Recreate transporter for retry to get fresh connection
        if (retryCount === 1) {
          console.log('🔄 Recreating email transporter for retry...');
          this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            requireTLS: true,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            connectionTimeout: 120000,
            greetingTimeout: 60000,
            socketTimeout: 120000,
            pool: false, // Disable pooling for retry
            tls: {
              rejectUnauthorized: false
            }
          });
        }

        return this.sendEmail({ to, subject, html, text }, retryCount + 1);
      }

      // Log specific error information
      if (error.code === 'ETIMEDOUT') {
        console.error('❌ Email timeout - this is common with Ethereal email during high load');
      } else if (error.responseCode === 535) {
        console.error('❌ Authentication failed - check your Ethereal email credentials');
      }

      return {
        success: false,
        error: error.message,
        code: error.code,
        retryCount: retryCount
      };
    }
  }
  async sendPasswordResetEmail(email, resetToken, userName = '') {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #6b7280;
            font-size: 14px;
          }
          .content {
            margin: 30px 0;
          }
          .reset-button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
          }
          .reset-button:hover {
            background: #1d4ed8;
          }
          .info-box {
            background: #f3f4f6;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          .security-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 4px;
            padding: 12px;
            margin: 20px 0;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔐 Transport</div>
            <h1 class="title">Password Reset Request</h1>
            <p class="subtitle">We received a request to reset your password</p>
          </div>

          <div class="content">
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            
            <p>You recently requested to reset your password for your account. Click the button below to reset it:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
            </div>

            <div class="info-box">
              <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
            </div>

            <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>

            <div class="security-note">
              <strong>Security Note:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
          </div>

          <div class="footer">
            <p>This email was sent from ${process.env.EMAIL_FROM_NAME || 'Transport'}</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Password Reset Request

Hello${userName ? ` ${userName}` : ''},

You recently requested to reset your password for your account.

To reset your password, please visit the following link:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

---
This email was sent from ${process.env.EMAIL_FROM_NAME || 'Transport'}
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }
  async sendPasswordResetWithNewPassword(email, newPassword, userName = '') {
    const subject = 'Your New Password';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
          }
          .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #6b7280;
            font-size: 14px;
          }
          .content {
            margin: 30px 0;
          }
          .password-box {
            background: #f3f4f6;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .password {
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            background: #ffffff;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #d1d5db;
            letter-spacing: 2px;
            margin: 10px 0;
          }
          .login-button {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
          }
          .login-button:hover {
            background: #059669;
          }
          .security-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔑 Transport</div>
            <h1 class="title">Your New Password</h1>
            <p class="subtitle">Your password has been reset successfully</p>
          </div>

          <div class="content">
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            
            <p>As requested, we have generated a new password for your account. Please use the password below to log in:</p>
            
            <div class="password-box">
              <p><strong>Your New Password:</strong></p>
              <div class="password">${newPassword}</div>
              <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
                Click to select and copy the password above
              </p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="login-button">
                Login to Your Account
              </a>
            </div>

            <div class="security-note">
              <strong>🔒 Important Security Notice:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Please change this password after logging in</li>
                <li>Do not share this password with anyone</li>
                <li>Keep this email secure or delete it after changing your password</li>
                <li>If you didn't request this password reset, please contact support immediately</li>
              </ul>
            </div>

            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Copy the password above</li>
              <li>Go to the login page</li>
              <li>Enter your email and the new password</li>
              <li>Change your password to something memorable</li>
            </ol>
          </div>

          <div class="footer">
            <p>This email was sent from ${process.env.EMAIL_FROM_NAME || 'Transport'}</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Your New Password

Hello${userName ? ` ${userName}` : ''},

As requested, we have generated a new password for your account.

Your New Password: ${newPassword}

Please use this password to log in to your account at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

IMPORTANT SECURITY NOTICE:
- Please change this password after logging in
- Do not share this password with anyone
- Keep this email secure or delete it after changing your password
- If you didn't request this password reset, please contact support immediately

Next Steps:
1. Copy the password above
2. Go to the login page
3. Enter your email and the new password
4. Change your password to something memorable

---
This email was sent from ${process.env.EMAIL_FROM_NAME || 'Transport'}
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  } async
  sendWelcomeEmail(email, userName, userDetails) {
    const subject = 'Welcome to Transport!';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
          }
          .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
          }
          .welcome-box {
            background: #ecfdf5;
            border: 1px solid #10b981;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .user-details {
            background: #f9fafb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎉 Transport</div>
            <h1 class="title">Welcome to Transport!</h1>
          </div>

          <div class="welcome-box">
            <h2>Account Created Successfully!</h2>
            <p>Hello ${userName}, your account has been created and you're ready to get started.</p>
          </div>

          <div class="user-details">
            <h3>Your Account Details:</h3>
            <p><strong>Name:</strong> ${userDetails.profile?.ownerName || userName}</p>
            <p><strong>Company:</strong> ${userDetails.profile?.companyName || 'Not specified'}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Unique ID:</strong> ${userDetails.uniqueid}</p>
          </div>

          <p>You can now log in to your account and start using our services.</p>

          <div class="footer">
            <p>Thank you for joining us!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Utility method to strip HTML tags for plain text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Method to close transporter connections
  close() {
    if (this.transporter && typeof this.transporter.close === 'function') {
      console.log('📧 Closing email transporter connections...');
      this.transporter.close();
    }
  }

  // Method to test email configuration
  async testConnection() {
    if (this.isDisabled) {
      return { success: false, error: 'Email service is disabled' };
    }

    try {
      console.log('🔄 Testing email connection...');

      // Test with a simple email to the configured sender
      const testResult = await this.sendEmail({
        to: process.env.EMAIL_FROM,
        subject: 'Email Service Test',
        html: '<p>This is a test email to verify the email service is working correctly.</p>',
        text: 'This is a test email to verify the email service is working correctly.'
      });

      if (testResult.success) {
        console.log('✅ Email service test successful!');
        return { success: true, messageId: testResult.messageId, previewUrl: testResult.previewUrl };
      } else {
        console.error('❌ Email service test failed:', testResult.error);
        return { success: false, error: testResult.error };
      }
    } catch (error) {
      console.error('❌ Email service test error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Create and export a singleton instance
const emailService = new EmailService();

module.exports = emailService;