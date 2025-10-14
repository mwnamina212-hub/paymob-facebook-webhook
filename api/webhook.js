const fetch = require('node-fetch');
const crypto = require('crypto');

// دالة مساعدة لعمل التشفير
const hashData = (data) => {
  if (!data) return null;
  return crypto.createHash('sha256').update(data).digest('hex');
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    let paymobData = req.body;

    // <-- السطر المضاف
    console.log('RAW PAYMOB WEBHOOK BODY:', JSON.stringify(paymobData, null, 2));

    if (typeof paymobData === 'string') {
      try {
        paymobData = JSON.parse(paymobData);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return res.status(400).json({ message: 'Invalid JSON format.' });
      }
    }

    const transaction = paymobData.obj;

    if (!transaction || !transaction.success) {
      console.log('Webhook received, but transaction was not successful. Skipping.');
      return res.status(200).json({ message: 'Transaction not successful.' });
    }

    // --- CONFIGURATION ---
    const PIXEL_ID = '1506403623938656';
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
    const landingPageUrl = transaction.merchant_order_id || 'https://www.sportivaacademy.online/sales';

    // --- DATA CLEANING & HASHING (تم تصحيح المسار) ---
    const email = transaction.order?.shipping_data?.email?.trim().toLowerCase();
    const phone = transaction.order?.shipping_data?.phone_number?.replace(/[^0-9]/g, '');
    const firstName = transaction.order?.shipping_data?.first_name?.trim().toLowerCase();
    const lastName = transaction.order?.shipping_data?.last_name?.trim().toLowerCase();

    const hashedEmail = hashData(email);
    const hashedPhone = hashData(phone);
    const hashedFirstName = hashData(firstName);
    const hashedLastName = hashData(lastName);

    // --- FACEBOOK EVENT PREPARATION ---
    const userData = {};
    if (hashedEmail) userData.em = [hashedEmail];
    if (hashedPhone) userData.ph = [hashedPhone];
    if (hashedFirstName) userData.fn = [hashedFirstName];
    if (hashedLastName) userData.ln = [hashedLastName];

    if (Object.keys(userData).length === 0) {
      console.error('No valid user data found in shipping_data. Skipping event.');
      return res.status(200).json({ status: 'skipped', message: 'No user data to send.' });
    }

    const eventData = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: landingPageUrl,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          currency: transaction.currency,
          value: (transaction.amount_cents / 100).toString(),
        },
      }],
    };

    const FB_API_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    // --- SEND TO FACEBOOK ---
    const response = await fetch(FB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    const responseBody = await response.json();

    if (response.status >= 400) {
      console.error('Error sending event to Facebook:', responseBody);
    } else {
      console.log('Successfully sent event to Facebook. Response:', responseBody);
    }

    res.status(200).json({ status: 'success', facebook_response: responseBody });

  } catch (error) {
    console.error('A critical error occurred in the webhook function:', error);
    res.status(200).json({ status: 'error', message: error.message });
  }
};
