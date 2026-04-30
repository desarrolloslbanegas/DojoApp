const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const STOCK_ALERT_THRESHOLD = parseInt(process.env.STOCK_ALERT_THRESHOLD, 10) || 10;
const ALERT_RECIPIENT = process.env.STOCK_ALERT_EMAIL_RECIPIENT || process.env.NOTIFY_EMAIL || '';
const ALERT_FROM = process.env.STOCK_ALERT_EMAIL_FROM || process.env.SMTP_USER || 'no-reply@dojoapp.local';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || !ALERT_RECIPIENT) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

/**
 * TEXTO PLANO (legible)
 */
function buildMessageItemsText(items) {
  return items
    .map(item =>
      `- ${item.nombre} (ID: ${item.id_producto}) → Stock actual: ${item.stock_restante}`
    )
    .join('\n');
}

/**
 * HTML (con colores según criticidad)
 */
function buildMessageItemsHtml(items) {
  return items
    .map(item => {
      const isCritical = item.stock_restante <= Math.ceil(STOCK_ALERT_THRESHOLD * 0.5);

      console.log(isCritical)
      
      const stockColor = isCritical ? '#d32f2f' : '#f57c00'; // rojo o naranja

      return `
        <li style="margin-bottom: 6px;">
          <strong>${item.nombre}</strong> 
          Stock actual: 
          <span style="color: ${stockColor}; font-weight: bold;">
            ${item.stock_restante} unidades
          </span>
        </li>
      `;
    })
    .join('');
}

async function sendViaResend(mailOptions) {
  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html
  });
}

async function notifyLowStock(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  const subject = `🚫 Sin stock disponible (${items[0].nombre})`;

  /**
   * TEXTO PLANO
   */
  const bodyText = [
    '🚫 NO HAY STOCK DISPONIBLE',
    '----------------------------------------',
    '',
    'Los siguientes productos no tienen stock disponible en este momento:',
    '',
    buildMessageItemsText(items),
    '',
    'Por favor, reponga stock cuanto antes.'
  ].join('\n');

  /**
   * HTML PRO
   */
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      
      <div style="background-color: #d32f2f; color: white; padding: 12px 16px; font-size: 18px; font-weight: bold;">
        🚫 No hay stock disponible
      </div>

      <div style="padding: 16px; color: #333;">
        
        <p style="margin: 0 0 10px 0;">
          Los siguientes productos se quedaron sin stock tras la última venta:
        </p>

        <div style="margin: 15px 0;">
          <ul style="margin-top: 10px; padding-left: 18px;">
            ${buildMessageItemsHtml(items)}
          </ul>
        </div>

        <p style="margin: 16px 0 0 0; font-weight: bold;">
          Por favor, reponga stock cuanto antes.
        </p>
      </div>
    </div>
  `;

  const mailOptions = {
    from: RESEND_API_KEY ? RESEND_FROM : ALERT_FROM,
    to: ALERT_RECIPIENT,
    subject,
    text: bodyText,
    html: bodyHtml
  };

  if (!ALERT_RECIPIENT) {
    console.warn('Stock alert email recipient is not configured. Skipping notification.');
    return false;
  }

  try {
    if (RESEND_API_KEY) {
      await sendViaResend(mailOptions);
      return true;
    }

    const transporter = createTransporter();
    if (!transporter) {
      console.warn('Stock alert email is not configured properly. Skipping notification.');
      return false;
    }

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending stock alert email:', error);
    return false;
  }
}

module.exports = {
  STOCK_ALERT_THRESHOLD,
  notifyLowStock
};