// Final Code (Oct 13 - Re-inserting default values as per partner's request)
const fetch = require('node-fetch');

// --- MAIN FUNCTION ---
module.exports = async (req, res) => {
  try {
    // --- THIS BLOCK HAS BEEN RE-INSERTED AS REQUESTED ---
    const {
      price,
      page,
      email = 'not_provided@example.com', // Default values
      firstName = 'Guest',
      lastName = 'User',
      phone = '01000000000'
    } = req.query;

    if (!price || !page) {
      return res.status(400).json({ message: 'Error: Price and Page URL are required.' });
    }

    const authToken = await getAuthToken();
    if (!authToken) throw new Error('Could not authenticate with Paymob.');

    const orderId = await registerOrder(authToken, price, page);
    if (!orderId) throw new Error('Could not register order with Paymob.');

    // The function will now use the values from the block above
    const paymentKey = await getPaymentKey(authToken, price, orderId, { email, firstName, lastName, phone });
    if (!paymentKey) throw new Error('Could not get payment key from Paymob.');

    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

    res.writeHead(302, { Location: paymentUrl });
    res.end();

  } catch (error) {
    console.error('A critical error occurred in the create-payment function:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// --- HELPER FUNCTIONS (Unchanged, but will receive the default values) ---

async function getAuthToken() {
  const response = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ "api_key": process.env.PAYMOB_API_KEY })
  });
  const data = await response.json();
  return data.token;
}

async function registerOrder(authToken, amount, landingPage) {
  const response = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: "false",
      amount_cents: Number(amount) * 100,
      currency: "EGP",
      merchant_id: process.env.PAYMOB_MERCHANT_ID,
      items: [],
      merchant_order_id: landingPage
    })
  });
  const data = await response.json();
  return data.id;
}

async function getPaymentKey(authToken, amount, orderId, billingData) {
  const response = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: Number(amount) * 100,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        email: billingData.email,
        first_name: billingData.firstName,
        last_name: billingData.lastName,
        phone_number: billingData.phone,
        apartment: "NA", floor: "NA", street: "NA", building: "NA",
        shipping_method: "NA", postal_code: "NA", city: "NA",
        country: "NA", state: "NA"
      },
      currency: "EGP",
      integration_id: process.env.PAYMOB_INTEGRATION_ID
    })
  });
  const data = await response.json();
  return data.token;
}
