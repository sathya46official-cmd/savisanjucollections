import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'orders@savisanju.com';
const ADMIN_EMAIL = process.env.RESEND_ADMIN_EMAIL || 'admin@savisanju.com';
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Send email verification link to user
 * @param email - User's email address
 * @param userId - User's UUID
 */
export async function sendVerificationEmail(email: string, userId: string): Promise<void> {
  try {
    const verificationUrl = `${FRONTEND_URL}/api/auth/verify-email?token=${userId}`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify Your Email - SaviSanju Collections',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e0e0e0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">SaviSanju Collections</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Luxury Sarees</p>
            </div>
            <div class="content">
              <h2>Welcome to SaviSanju Collections!</h2>
              <p>Thank you for registering with us. Please verify your email address to complete your registration.</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </p>
              <p style="color: #666; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you didn't create an account with SaviSanju Collections, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>SaviSanju Collections - Luxury Sarees</p>
              <p>For support, contact us at <a href="mailto:support@savisanju.com" style="color: #667eea;">support@savisanju.com</a></p>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send order confirmation email to customer
 * @param email - Customer's email address
 * @param orderId - Order ID (SAVI-XXXXXXXX format)
 */
export async function sendOrderConfirmationEmail(email: string, orderId: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Order Confirmation - ${orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .order-id {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                font-size: 18px;
                font-weight: 600;
                color: #667eea;
                margin: 20px 0;
              }
              .info-box {
                background: #f9f9f9;
                padding: 20px;
                border-left: 4px solid #667eea;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e0e0e0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">Order Confirmed!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your order</p>
            </div>
            <div class="content">
              <h2>Your order has been received</h2>
              <p>Thank you for shopping with SaviSanju Collections. We've received your order and will contact you shortly to confirm the details.</p>
              
              <div class="order-id">
                Order ID: ${orderId}
              </div>

              <div class="info-box">
                <h3 style="margin-top: 0;">What happens next?</h3>
                <ol style="margin: 10px 0; padding-left: 20px;">
                  <li>Our team will review your order</li>
                  <li>We'll contact you to confirm the price and delivery details</li>
                  <li>Once confirmed, we'll process your order</li>
                  <li>Your order will be delivered within <strong>5-6 business days</strong></li>
                </ol>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>Need help?</strong><br>
                If you have any questions about your order, please contact us at:<br>
                <a href="mailto:support@savisanju.com" style="color: #667eea;">support@savisanju.com</a>
              </p>
            </div>
            <div class="footer">
              <p>SaviSanju Collections - Luxury Sarees</p>
              <p>Estimated delivery: 5-6 business days</p>
              <p>Support: <a href="mailto:support@savisanju.com" style="color: #667eea;">support@savisanju.com</a></p>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`✅ Order confirmation email sent to ${email} for order ${orderId}`);
  } catch (error) {
    console.error('❌ Failed to send order confirmation email:', error);
    throw new Error('Failed to send order confirmation email');
  }
}

/**
 * Send admin notification email for new order
 * @param orderId - Order ID (SAVI-XXXXXXXX format)
 * @param itemCount - Number of items in the order
 */
export async function sendAdminNotificationEmail(orderId: string, itemCount: number): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🔔 New Order: ${orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .order-id {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 6px;
                text-align: center;
                font-size: 18px;
                font-weight: 600;
                color: #667eea;
                margin: 20px 0;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #e0e0e0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">🔔 New Order Received!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Action Required</p>
            </div>
            <div class="content">
              <h2>New Order Details</h2>
              
              <div class="order-id">
                Order ID: ${orderId}
              </div>

              <p><strong>Items:</strong> ${itemCount} item${itemCount > 1 ? 's' : ''}</p>

              <p style="text-align: center;">
                <a href="${FRONTEND_URL}/admin" class="button">View Order in Dashboard</a>
              </p>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>Next Steps:</strong><br>
                1. Review the order details in the admin dashboard<br>
                2. Contact the customer to confirm details and pricing<br>
                3. Update the order status once confirmed
              </p>
            </div>
            <div class="footer">
              <p>SaviSanju Collections - Admin Notification</p>
              <p>This is an automated notification for new orders</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`✅ Admin notification email sent for order ${orderId}`);
  } catch (error) {
    console.error('❌ Failed to send admin notification email:', error);
    throw new Error('Failed to send admin notification email');
  }
}
