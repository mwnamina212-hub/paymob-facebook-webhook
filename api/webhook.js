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

    if (!transaction || !transaction.success) {
      console.log('Webhook received, but transaction was not successful. Skipping.');
      return res.status(200).json({ message: 'Transaction not successful.' });
    }

    // --- CONFIGURATION ---
    const PIXEL_ID = '1506403623938656';
    // Securely get the access token from environment variables
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN; 
    
    // DYNAMICALLY get the landing page URL from Paymob's merchant_order_id
    // If it's not available, use a default fallback URL
    const landingPageUrl = transaction.merchant_order_id || 'https://www.sportivaacademy.online/sales';

    // --- DATA CLEANING ---
    const email = transaction.billing_data?.email || '';
    const phone = transaction.billing_data?.phone_number || '';
    const firstName = transaction.billing_data?.first_name || '';
    const lastName = transaction.billing_data?.last_name || '';

    // --- FACEBOOK EVENT PREPARATION ---
    const eventData = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: landingPageUrl, // Use the dynamic URL
          action_source: 'website',
          user_data: {
            em: email ? [email.trim().toLowerCase()] : [],
            ph: phone ? [`+${phone.replace(/[^0-9]/g, '')}`] : [],
            fn: firstName ? [firstName.trim().toLowerCase()] : [],
            ln: lastName ? [lastName.trim().toLowerCase()] : [],
          },
          custom_data: {
            currency: transaction.currency,
            value: (transaction.amount_cents / 100).toString(),
          },
        },
      ],
    };

    const FB_API_URL = https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN};

    // --- SEND TO FACEBOOK ---
    const response = await fetch(FB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    const responseBody = await response.json();
    console.log('Successfully sent event to Facebook. Response:', responseBody);

    res.status(200).json({ status: 'success', facebook_response: responseBody });

  } catch (error) {
    console.error('A critical error occurred in the webhook function:', error);
    res.status(200).json({ status: 'error', message: error.message });
  }
};
