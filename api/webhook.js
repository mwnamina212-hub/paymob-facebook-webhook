const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

function hashData(data) {
  if (!data) return '';
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
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

    const transaction = paymobData.obj;

    if (!transaction || !transaction.success) {
      console.log('Transaction not successful, skipping event.');
      return res.status(200).json({ message: 'Transaction not successful.' });
    }

    const PIXEL_ID = process.env.FB_PIXEL_ID;
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
    const YOUR_LANDING_PAGE = 'https://www.sportivaacademy.online/sales';

    const userData = {
      em: transaction.billing_data?.email ? hashData(transaction.billing_data.email) : '',
      ph: transaction.billing_data?.phone_number ? hashData(transaction.billing_data.phone_number.replace(/[^0-9]/g, '')) : '',
      fn: transaction.billing_data?.first_name ? hashData(transaction.billing_data.first_name) : '',
      ln: transaction.billing_data?.last_name ? hashData(transaction.billing_data.last_name) : '',
    };

    const eventData = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: YOUR_LANDING_PAGE,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            currency: transaction.currency || 'EGP',
            value: (transaction.amount_cents / 100).toString(),
          },
        },
      ],
    };

    const FB_API_URL = https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN};

    const response = await axios.post(FB_API_URL, eventData);
    console.log('✅ Successfully sent event to Facebook:', response.data);

    res.status(200).json({ status: 'success', facebook_response: response.data });

  } catch (error) {
    console.error('❌ Critical error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
