require('dotenv').config();
const fetch = require('node-fetch');

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

    const transaction = paymobData.obj;

    // ✅ تأكد إن الترانزاكشن ناجح
    if (!transaction || !transaction.success) {
      console.log('Transaction not successful, skipping event.');
      return res.status(200).json({ message: 'Transaction not successful.' });
    }

    const PIXEL_ID = '1506403623938656';
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
    const YOUR_LANDING_PAGE = 'https://www.sportivaacademy.online/sales';

    // ✅ تأكد من وجود بيانات العميل
    const email = transaction.billing_data?.email || '';
    const phone = transaction.billing_data?.phone_number || '';

    const eventData = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: YOUR_LANDING_PAGE,
          action_source: 'website',
          user_data: {
            em: email ? [email] : [],
            ph: phone ? [phone] : [],
          },
          custom_data: {
            currency: transaction.currency || 'EGP',
            value: (transaction.amount_cents / 100).toString(),
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
    console.log('✅ Successfully sent event to Facebook:', responseBody);

    res.status(200).json({ status: 'success', facebook_response: responseBody });

  } catch (error) {
    console.error('❌ Critical error:', error);
    res.status(200).json({ status: 'error', message: error.message });
  }
};
