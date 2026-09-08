import { Resend } from 'resend';
import { eq } from 'drizzle-orm';
import { createDb } from '../db';
import * as schema from '../db/schema';
import type { Env } from '../types/env';

// ── Email Settings Type ──
export type EmailSettings = {
  fromName: string;
  fromEmail: string;
  resendApiKey: string;
};

// ── Notification Settings Type ──
export type NotificationSettings = {
  orderConfirmation: boolean;
  orderConfirmed: boolean;
  orderProcessing: boolean;
  orderShipped: boolean;
  orderDelivered: boolean;
  orderCancelled: boolean;
  orderRefunded: boolean;
  welcomeEmail: boolean;
  passwordReset: boolean;
};

// ── Default Notification Settings ──
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  orderConfirmation: true,
  orderConfirmed: true,
  orderProcessing: true,
  orderShipped: true,
  orderDelivered: true,
  orderCancelled: true,
  orderRefunded: true,
  welcomeEmail: true,
  passwordReset: true,
};

// ── Get Settings from DB ──
export async function getEmailSettings(env: Env): Promise<EmailSettings> {
  const db = createDb();

  const [fromName] = await db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, 'fromName'))
    .limit(1);

  const [fromEmail] = await db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, 'fromEmail'))
    .limit(1);

  const [resendApiKey] = await db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, 'resendApiKey'))
    .limit(1);

  return {
    fromName: fromName?.value || 'Tuktak',
    fromEmail: fromEmail?.value || 'noreply@tuktakdot.com',
    resendApiKey: resendApiKey?.value || env.RESEND_API_KEY || '',
  };
}

export async function getNotificationSettings(env: Env): Promise<NotificationSettings> {
  const db = createDb();

  const [settings] = await db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, 'notificationSettings'))
    .limit(1);

  if (settings?.value) {
    try {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(settings.value) };
    } catch {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  }

  return DEFAULT_NOTIFICATION_SETTINGS;
}

// ── Log Email ──
async function logEmail(
  env: Env,
  data: {
    to: string;
    subject: string;
    template: string;
    status: 'sent' | 'failed';
    orderId?: string;
    error?: string;
  }
) {
  try {
    const db = createDb();
    const now = new Date().toISOString();
    await db.insert(schema.emailLogs).values({
      id: crypto.randomUUID(),
      to: data.to,
      subject: data.subject,
      template: data.template,
      status: data.status,
      orderId: data.orderId || null,
      error: data.error || null,
      createdAt: now,
    });
  } catch (err) {
    console.error('[EMAIL LOG] Failed to log email:', err);
  }
}

// ── Send Email ──
export async function sendEmail(
  env: Env,
  options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    template: string;
    orderId?: string;
  }
) {
  const settings = await getEmailSettings(env);

  if (!settings.resendApiKey) {
    console.warn('[EMAIL] No Resend API key configured, skipping email send');
    await logEmail(env, {
      to: options.to,
      subject: options.subject,
      template: options.template,
      status: 'failed',
      orderId: options.orderId,
      error: 'No API key configured — set resendApiKey in Settings → Email or RESEND_API_KEY env',
    });
    return { success: false, error: 'No API key configured' };
  }

  const resend = new Resend(settings.resendApiKey);

  try {
    const { error } = await resend.emails.send({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
    });

    if (error) {
      console.error('[EMAIL] Send failed:', error);
      await logEmail(env, {
        to: options.to,
        subject: options.subject,
        template: options.template,
        status: 'failed',
        orderId: options.orderId,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    await logEmail(env, {
      to: options.to,
      subject: options.subject,
      template: options.template,
      status: 'sent',
      orderId: options.orderId,
    });

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('[EMAIL] Send exception:', error);
    await logEmail(env, {
      to: options.to,
      subject: options.subject,
      template: options.template,
      status: 'failed',
      orderId: options.orderId,
      error,
    });
    return { success: false, error };
  }
}

// ── HTML escape utility ──
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Render React Email to HTML ──
// Since we can't use React Server Components in Workers,
// we'll use a simple HTML template approach

const LOGO_URL = 'https://tuktakdot.com/logo/logo_light_mode.png';

function renderLogoHtml(): string {
  return `<img src="${LOGO_URL}" alt="Tuktak" height="40" style="display:block;margin:0 auto;height:40px" />`;
}

function renderOrderConfirmationHtml(data: {
  orderId: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: string;
  deliveryAddress?: string;
  invoiceAccessToken?: string;
  orderNumber?: string;
}) {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee;font-size:14px;color:#333">${escapeHtml(item.name)}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;font-size:14px;color:#666;text-align:center">${item.quantity}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right">৳${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <div style="text-align:center;margin-bottom:24px">
      ${renderLogoHtml()}
    </div>
    
    <div style="background-color:#dcfce7;padding:16px;border-radius:8px;text-align:center;margin-bottom:24px">
      <div style="font-size:32px;margin-bottom:8px">✅</div>
      <h2 style="font-size:18px;font-weight:bold;color:#166534;margin:0">Order Confirmed!</h2>
      <p style="font-size:14px;color:#16a34a;margin:8px 0 0">Thank you for your purchase, ${escapeHtml(data.customerName)}.</p>
    </div>

    <table style="width:100%;border:1px solid #eee;border-radius:8px;padding:16px;margin-bottom:24px">
      <tr>
        <td>
          <div style="font-size:11px;color:#999;text-transform:uppercase">Order ID</div>
          <div style="font-size:14px;font-weight:600;font-family:monospace">${data.orderId}</div>
        </td>
        <td style="text-align:right">
          <div style="font-size:11px;color:#999;text-transform:uppercase">Payment</div>
          <div style="font-size:14px;font-weight:600">${escapeHtml(data.paymentMethod)}</div>
        </td>
      </tr>
    </table>

    <h3 style="font-size:14px;font-weight:600;color:#333;margin-bottom:12px">Order Items</h3>
    <table style="width:100%;border:1px solid #eee;border-radius:8px;border-collapse:collapse">
      <tr style="background-color:#f9f9f9">
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;font-weight:600">Item</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;color:#666;font-weight:600">Qty</th>
        <th style="padding:8px 12px;text-align:right;font-size:12px;color:#666;font-weight:600">Price</th>
      </tr>
      ${itemsHtml}
      <tr style="background-color:#f9f9f9">
        <td colspan="2" style="padding:12px;font-size:14px;font-weight:bold;border-top:2px solid #eee">Total</td>
        <td style="padding:12px;font-size:16px;font-weight:bold;color:#10b981;text-align:right;border-top:2px solid #eee">৳${data.total.toLocaleString()}</td>
      </tr>
    </table>

    ${
      data.deliveryAddress
        ? `
    <div style="margin-top:16px">
      <h3 style="font-size:14px;font-weight:600;color:#333;margin-bottom:8px">Delivery Address</h3>
      <p style="font-size:14px;color:#666;margin:0">${escapeHtml(data.deliveryAddress)}</p>
    </div>
    `
        : ''
    }

    <a href="https://tuktakdot.com/orders/${data.orderId}" style="display:block;margin-top:24px;padding:12px 24px;background-color:#10b981;color:#ffffff;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Track Your Order</a>
    ${
      data.invoiceAccessToken && data.orderNumber
        ? `
    <a href="https://tuktakdot.com/invoices/${encodeURIComponent(data.orderNumber)}?token=${encodeURIComponent(data.invoiceAccessToken)}" style="display:block;margin-top:12px;padding:12px 24px;background-color:#ffffff;color:#10b981;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:2px solid #10b981">View Invoice</a>
    `
        : ''
    }

    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="text-align:center;font-size:11px;color:#999">© ${new Date().getFullYear()} Tuktak.com. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

function renderOrderStatusHtml(data: {
  orderId: string;
  customerName: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  reason?: string;
  refundAmount?: number;
}) {
  const STATUS_CONFIG: Record<
    string,
    { title: string; emoji: string; message: string; bgColor: string; textColor: string }
  > = {
    confirmed: {
      title: 'Order Confirmed',
      emoji: '📋',
      message: `Hi ${data.customerName}, your order has been confirmed and is being prepared.`,
      bgColor: '#dbeafe',
      textColor: '#1e40af',
    },
    processing: {
      title: 'Order Processing',
      emoji: '⚙️',
      message: `Hi ${data.customerName}, your order is now being processed and prepared for shipment.`,
      bgColor: '#fef3c7',
      textColor: '#92400e',
    },
    shipped: {
      title: 'Your Order Has Been Shipped!',
      emoji: '📦',
      message: `Hi ${data.customerName}, great news! Your order is on its way to you.`,
      bgColor: '#dbeafe',
      textColor: '#1e40af',
    },
    delivered: {
      title: 'Order Delivered!',
      emoji: '🎉',
      message: `Hi ${data.customerName}, your order has been delivered successfully!`,
      bgColor: '#dcfce7',
      textColor: '#166534',
    },
    cancelled: {
      title: 'Order Cancelled',
      emoji: '❌',
      message: `Hi ${data.customerName}, your order has been cancelled.`,
      bgColor: '#fee2e2',
      textColor: '#991b1b',
    },
    refunded: {
      title: 'Refund Processed',
      emoji: '💰',
      message: `Hi ${data.customerName}, your refund has been processed successfully.`,
      bgColor: '#f3e8ff',
      textColor: '#6b21a8',
    },
  };

  const config = STATUS_CONFIG[data.status] || STATUS_CONFIG.confirmed;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <div style="text-align:center;margin-bottom:24px">
      ${renderLogoHtml()}
    </div>
    
    <div style="background-color:${config.bgColor};padding:16px;border-radius:8px;text-align:center;margin-bottom:24px">
      <div style="font-size:32px;margin-bottom:8px">${config.emoji}</div>
      <h2 style="font-size:18px;font-weight:bold;color:${config.textColor};margin:0">${config.title}</h2>
      <p style="font-size:14px;color:${config.textColor};margin:8px 0 0">${escapeHtml(config.message)}</p>
    </div>

    <table style="width:100%;border:1px solid #eee;border-radius:8px;padding:16px;margin-bottom:24px">
      <tr>
        <td>
          <div style="font-size:11px;color:#999;text-transform:uppercase">Order ID</div>
          <div style="font-size:14px;font-weight:600;font-family:monospace">${escapeHtml(data.orderId)}</div>
        </td>
        ${
          data.trackingNumber
            ? `
        <td>
          <div style="font-size:11px;color:#999;text-transform:uppercase">Tracking #</div>
          <div style="font-size:14px;font-weight:600;font-family:monospace">${escapeHtml(data.trackingNumber)}</div>
        </td>
        `
            : ''
        }
      </tr>
    </table>

    ${
      data.estimatedDelivery
        ? `
    <div style="background-color:#dcfce7;padding:12px;border-radius:8px;margin-bottom:16px">
      <p style="text-align:center;font-size:14px;font-weight:600;color:#166534;margin:0">Estimated Delivery: ${escapeHtml(data.estimatedDelivery)}</p>
    </div>
    `
        : ''
    }

    ${
      data.reason
        ? `
    <div style="margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:600;color:#333;margin-bottom:8px">Reason</h3>
      <p style="font-size:14px;color:#666;margin:0">${escapeHtml(data.reason)}</p>
    </div>
    `
        : ''
    }

    ${
      data.refundAmount
        ? `
    <div style="background-color:#fef3c7;padding:12px;border-radius:8px;margin-bottom:16px">
      <p style="text-align:center;font-size:16px;font-weight:bold;color:#92400e;margin:0">Refund Amount: ৳${data.refundAmount.toLocaleString()}</p>
    </div>
    `
        : ''
    }

    ${
      data.status === 'shipped'
        ? `
    <div style="margin-top:24px">
      <h3 style="font-size:14px;font-weight:600;color:#333;margin-bottom:12px">Shipping Progress</h3>
      <div style="display:flex;justify-content:space-between;text-align:center">
        <div>
          <div style="width:32px;height:32px;border-radius:50%;background-color:#10b981;margin:0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px">✓</div>
          <div style="font-size:11px;color:#666;margin-top:4px">Shipped</div>
        </div>
        <div>
          <div style="width:32px;height:32px;border-radius:50%;background-color:#e5e7eb;margin:0 auto;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px">2</div>
          <div style="font-size:11px;color:#666;margin-top:4px">In Transit</div>
        </div>
        <div>
          <div style="width:32px;height:32px;border-radius:50%;background-color:#e5e7eb;margin:0 auto;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px">3</div>
          <div style="font-size:11px;color:#666;margin-top:4px">Delivered</div>
        </div>
      </div>
    </div>
    `
        : ''
    }

    <a href="https://tuktakdot.com/orders/${data.orderId}" style="display:block;margin-top:24px;padding:12px 24px;background-color:#10b981;color:#ffffff;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Track Your Order</a>

    ${
      data.status === 'delivered'
        ? `
    <a href="https://tuktakdot.com/orders/${data.orderId}/review" style="display:block;margin-top:8px;padding:12px 24px;background-color:#ffffff;color:#333;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:1px solid #ddd">Rate Your Experience</a>
    `
        : ''
    }

    ${
      data.status === 'cancelled' || data.status === 'refunded'
        ? `
    <a href="https://tuktakdot.com/products" style="display:block;margin-top:8px;padding:12px 24px;background-color:#ffffff;color:#333;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;border:1px solid #ddd">Continue Shopping</a>
    `
        : ''
    }

    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="text-align:center;font-size:11px;color:#999">© ${new Date().getFullYear()} Tuktak.com. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

function renderWelcomeHtml(data: { name: string }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <div style="text-align:center;margin-bottom:24px">
      ${renderLogoHtml()}
      <p style="font-size:12px;color:#999;margin:4px 0 0">Premium Electronics & Gadgets</p>
    </div>
    
    <hr style="margin:16px 0;border:none;border-top:1px solid #eee">

    <h2 style="font-size:22px;font-weight:bold;color:#333;margin-top:24px">Welcome, ${escapeHtml(data.name)}!</h2>
    <p style="font-size:14px;color:#666;margin-top:16px;line-height:1.6">
      Thank you for joining Tuktak — your one-stop shop for premium electronics and gadgets in Bangladesh.
    </p>

    <div style="background-color:#f9f9f9;padding:16px;border-radius:8px;margin-top:24px">
      <p style="font-size:14px;font-weight:600;color:#333;margin:0 0 8px">What you can do:</p>
      <p style="font-size:13px;color:#666;margin:4px 0">• Browse 1000+ genuine products at the best prices</p>
      <p style="font-size:13px;color:#666;margin:4px 0">• Enjoy same-day delivery inside Dhaka</p>
      <p style="font-size:13px;color:#666;margin:4px 0">• Track your orders in real-time</p>
      <p style="font-size:13px;color:#666;margin:4px 0">• Get exclusive member-only deals and offers</p>
    </div>

    <a href="https://tuktakdot.com/products" style="display:block;margin-top:24px;padding:12px 24px;background-color:#10b981;color:#ffffff;text-align:center;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Start Shopping</a>

    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="text-align:center;font-size:11px;color:#999">© ${new Date().getFullYear()} Tuktak.com. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

function renderPasswordResetHtml(data: { name: string; otp: string }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <div style="text-align:center;margin-bottom:24px">
      ${renderLogoHtml()}
    </div>
    
    <div style="background-color:#dbeafe;padding:16px;border-radius:8px;text-align:center;margin-bottom:24px">
      <div style="font-size:32px;margin-bottom:8px">🔐</div>
      <h2 style="font-size:18px;font-weight:bold;color:#1e40af;margin:0">Password Reset</h2>
      <p style="font-size:14px;color:#1e40af;margin:8px 0 0">Hi ${escapeHtml(data.name)}, here's your OTP to reset your password.</p>
    </div>

    <div style="text-align:center;margin:24px 0">
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#333;font-family:monospace;background-color:#f9f9f9;padding:16px;border-radius:8px;display:inline-block">${data.otp}</div>
    </div>

    <p style="font-size:13px;color:#666;text-align:center;margin:16px 0">
      This OTP will expire in 15 minutes. If you didn't request this, please ignore this email.
    </p>

    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="text-align:center;font-size:11px;color:#999">© ${new Date().getFullYear()} Tuktak.com. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

// ── High-Level Email Senders ──

export async function sendOrderConfirmationEmail(
  env: Env,
  data: {
    orderId: string;
    customerEmail: string;
    customerName: string;
    items: { name: string; quantity: number; price: number }[];
    total: number;
    paymentMethod: string;
    deliveryAddress?: string;
    invoiceAccessToken?: string;
    orderNumber?: string;
  }
) {
  const settings = await getNotificationSettings(env);
  if (!settings.orderConfirmation) {
    console.log('[EMAIL] Order confirmation emails disabled, skipping');
    return { success: false, error: 'Email type disabled' };
  }

  const html = renderOrderConfirmationHtml(data);
  return sendEmail(env, {
    to: data.customerEmail,
    subject: `Order Confirmed - #${data.orderId}`,
    html,
    template: 'order-confirmation',
    orderId: data.orderId,
  });
}

export async function sendOrderStatusEmail(
  env: Env,
  data: {
    orderId: string;
    customerEmail: string;
    customerName: string;
    status: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    reason?: string;
    refundAmount?: number;
  }
) {
  // Pending is the initial order state — confirmation email already covers it, no separate status email needed
  if (data.status === 'pending') {
    console.log('[EMAIL] Skipping pending status email (covered by order confirmation)');
    return { success: false, error: 'Pending status does not require email' };
  }

  const settings = await getNotificationSettings(env);

  const statusKey =
    `order${data.status.charAt(0).toUpperCase() + data.status.slice(1)}` as keyof NotificationSettings;
  if (statusKey in settings && !settings[statusKey]) {
    console.log(`[EMAIL] ${data.status} emails disabled, skipping`);
    return { success: false, error: 'Email type disabled' };
  }

  const html = renderOrderStatusHtml(data);
  return sendEmail(env, {
    to: data.customerEmail,
    subject: `Order ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} - #${data.orderId}`,
    html,
    template: `order-${data.status}`,
    orderId: data.orderId,
  });
}

export async function sendWelcomeEmail(
  env: Env,
  data: {
    customerEmail: string;
    customerName: string;
  }
) {
  const settings = await getNotificationSettings(env);
  if (!settings.welcomeEmail) {
    console.log('[EMAIL] Welcome emails disabled, skipping');
    return { success: false, error: 'Email type disabled' };
  }

  const html = renderWelcomeHtml({ name: data.customerName });
  return sendEmail(env, {
    to: data.customerEmail,
    subject: 'Welcome to Tuktak!',
    html,
    template: 'welcome',
  });
}

export async function sendPasswordResetEmail(
  env: Env,
  data: {
    customerEmail: string;
    customerName: string;
    otp: string;
  }
) {
  const settings = await getNotificationSettings(env);
  if (!settings.passwordReset) {
    console.log('[EMAIL] Password reset emails disabled, skipping');
    return { success: false, error: 'Email type disabled' };
  }

  const html = renderPasswordResetHtml({ name: data.customerName, otp: data.otp });
  return sendEmail(env, {
    to: data.customerEmail,
    subject: 'Password Reset - Tuktak',
    html,
    template: 'password-reset',
  });
}

function renderTestEmailHtml(data: { to: string; template: string }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <div style="text-align:center;margin-bottom:24px">
      ${renderLogoHtml()}
    </div>
    <div style="background-color:#dcfce7;padding:16px;border-radius:8px;text-align:center;margin-bottom:24px">
      <div style="font-size:32px;margin-bottom:8px">📬</div>
      <h2 style="font-size:18px;font-weight:bold;color:#166534;margin:0">Email delivery test</h2>
      <p style="font-size:14px;color:#16a34a;margin:8px 0 0">This message confirms your Resend integration is working.</p>
    </div>
    <table style="width:100%;border:1px solid #eee;border-radius:8px;border-collapse:collapse">
      <tr>
        <td style="padding:10px 12px;font-size:12px;color:#666">Delivered to</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:600;text-align:right">${data.to}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:12px;color:#666;border-top:1px solid #eee">Template</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:600;text-align:right;border-top:1px solid #eee">${data.template}</td>
      </tr>
    </table>
    <p style="font-size:13px;color:#666;text-align:center;margin:24px 0 0">You can preview every email template from Settings → Email in the admin panel.</p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="text-align:center;font-size:11px;color:#999">© ${new Date().getFullYear()} Tuktak.com. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send a rendered preview of any supported email template to an arbitrary
 * address. Used by the admin "Email" settings tab to let store owners
 * visually verify templates before enabling them.
 */
export async function sendTemplatePreview(env: Env, data: { to: string; template?: string }) {
  const template = data.template || 'test';
  const sampleItems = [
    { name: 'Example Product A', quantity: 2, price: 1250 },
    { name: 'Example Product B', quantity: 1, price: 799 },
  ];

  let subject: string;
  let html: string;
  let logTemplate: string;

  switch (template) {
    case 'welcome':
      subject = 'Welcome to Tuktak! (test)';
      html = renderWelcomeHtml({ name: 'Test Customer' });
      logTemplate = 'preview-welcome';
      break;
    case 'password-reset':
      subject = 'Password Reset - Tuktak (test)';
      html = renderPasswordResetHtml({ name: 'Test Customer', otp: '482913' });
      logTemplate = 'preview-password-reset';
      break;
    case 'order-confirmation':
      subject = 'Order Confirmed - #DEMO123 (test)';
      html = renderOrderConfirmationHtml({
        orderId: 'DEMO123',
        customerName: 'Test Customer',
        items: sampleItems,
        total: 3677,
        paymentMethod: 'bKash',
        deliveryAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
      });
      logTemplate = 'preview-order-confirmation';
      break;
    case 'order-status':
      subject = 'Your Order Has Been Shipped! (test)';
      html = renderOrderStatusHtml({
        orderId: 'DEMO123',
        customerName: 'Test Customer',
        status: 'shipped',
        trackingNumber: 'P01HDA000123',
        estimatedDelivery: '1-2 days',
      });
      logTemplate = 'preview-order-status';
      break;
    default:
      subject = 'Tuktak Email Test';
      html = renderTestEmailHtml({ to: data.to, template });
      logTemplate = 'preview-test';
  }

  return sendEmail(env, { to: data.to, subject, html, template: logTemplate });
}
