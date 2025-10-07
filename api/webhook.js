// webhook.js
const fetch = require('node-fetch');
const crypto = require('crypto');

function sha256Lower(str) {
  return crypto.createHash('sha256').update(String(str).trim().toLowerCase()).digest('hex');
}

function normalizePhone(phone) {
  if (!phone) return '';
  // Keep digits only (FB recommends removing non-digits)
  return String(phone).replace(/\D/g, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    let paymobData = req.body;

    if (typeof paymobData === 'string') {
      try {
        paymobData = JSON.parse(paymobData);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return res.status(400).json({ message: 'Invalid JSON format.' });
      }
    }

    // DEBUG: show full payload in Vercel logs so we know the exact shape
    console.log('📦 Paymob payload:', JSON.stringify(paymobData, null, 2));

    const transaction = paymobData?.obj;

    if (!transaction || !transaction.success) {
      console.log('❌ Transaction not present or not successful, skipping.');
      return res.status(200).json({ message: 'Transaction not successful.' });
    }

    // Safely read billing fields (may be undefined in some callbacks/test requests)
    const billing = transaction.billing_data || {};
    const rawEmail = billing.email || '';
    const rawPhone = billing.phone_number || billing.mobile || '';

    // Hash user identifiers as FB recommends (sha256, lowercase trimmed)
    const hashedEmail = rawEmail ? sha256Lower(rawEmail) : null;
    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;
    const hashedPhone = normalizedPhone ? sha256Lower(normalizedPhone) : null;

    // Amount & currency
    const amountCents = transaction.amount_cents || 0;
    const value = (amountCents / 100).toString();
    const currency = transaction.currency || 'EGP';

    const PIXEL_ID = '1506403623938656';
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN || 'EAAYJ1TdZC...'; // better put in env var
    const YOUR_LANDING_PAGE = 'https://www.sportivaacademy.online/sales';

    const user_data = {};
    if (hashedEmail) user_data.em = [hashedEmail];
    if (hashedPhone) user_data.ph = [hashedPhone];

    const eventData = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: YOUR_LANDING_PAGE,
          action_source: 'website',
          user_data,
          custom_data: {
            currency,
            value,
          },
        },
      ],
    };

    const FB_API_URL = https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN};

    const response = await fetch(FB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    const responseBody = await response.json();
    console.log('✅ Facebook response:', responseBody);

    return res.status(200).json({ status: 'success', facebook_response: responseBody });
  } catch (error) {
    console.error('🔥 Webhook error:', error);
    return res.status(200).json({ status: 'error', message: error.message });
  }
};
