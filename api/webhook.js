// Webhook function to send Purchase event to Facebook Conversion API
// This version is cleaned and optimized for Vercel's Node.js 18+ environment.

module.exports = async (req, res) => {
  // 1. Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    let paymobData = req.body;

    // 2. Safety Check: Parse body if it's a string (as suggested)
    if (typeof paymobData === 'string') {
      try {
        paymobData = JSON.parse(paymobData);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return res.status(400).json({ message: 'Invalid JSON format.' });
      }
    }

    const transaction = paymobData.obj;

    // 3. Check if transaction was successful
    if (!transaction || !transaction.success) {
      console.log('Webhook received, but transaction was not successful. Skipping.');
      return res.status(200).json({ message: 'Transaction not successful.' });
    }

    // 4. Your Facebook & Landing Page Details
    const PIXEL_ID = '1506403623938656';
    const ACCESS_TOKEN = 'EAAYJ1TdZCSU8BPlqqJ4P42xOABysm8m72kaDZCsip3SI0lyE49hWKc1XwDq63ssbiIOrwGIyrF9lUBZBAqctWZCRCB4zCa2g3j8f9Hrf5njkhhZBxCRrcCvnATz0ZC0d1nfvVwMjmIWoD4BKqgMm4i3LdTYLAZC6ODH2SNdppijiEfNZCKa4O4olqHwnTjFXyQZDZD';
    const YOUR_LANDING_PAGE = 'https://www.sportivaacademy.online/sales';

    // 5. Prepare the event payload for Facebook
    const eventData = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: YOUR_LANDING_PAGE,
          action_source: 'website',
          user_data: {
            em: [transaction.billing_data.email].filter(Boolean),
            ph: [transaction.billing_data.phone_number].filter(Boolean),
          },
          custom_data: {
            currency: transaction.currency,
            value: (transaction.amount_cents / 100).toString(),
          },
        },
      ],
    };

    const FB_API_URL = https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN};

    // 6. Send data using the built-in fetch in Vercel
    const response = await fetch(FB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    const responseBody = await response.json();
    console.log('Successfully sent event to Facebook. Response:', responseBody);

    // 7. Always respond to Paymob with a success status
    res.status(200).json({ status: 'success', facebook_response: responseBody });

  } catch (error) {
    console.error('A critical error occurred in the webhook function:', error);
    // Still respond with 200 so Paymob doesn't keep retrying and block your webhook
    res.status(200).json({ status: 'error', message: error.message });
  }
};
