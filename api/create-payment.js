// Final Corrected Code (Oct 13 - Based on Partner's Insight)
const fetch = require('node-fetch');

// --- MAIN FUNCTION ---
module.exports = async (req, res) => {
  try {
    // --- 1. Extract ONLY Price and Page from the Button Link ---
    const { price, page } = req.query;

    // Basic validation
    if (!price || !page) {
      return res.status(400).json({ message: 'Error: Price and Page URL are required.' });
    }

    // --- 2. Define HARDCODED Test Billing Data (as per partner's correct analysis) ---
    const testBillingData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '01010101010'
    };

    // --- 3. Authenticate with Paymob ---
    const authToken = await getAuthToken();
    if (!authToken) throw new Error('Could not authenticate with Paymob.');

    // --- 4. Register the Order with Paymob ---
    const orderId = await registerOrder(authToken, price, page);
    if (!orderId) throw new Error('Could not register order with Paymob.');

    // --- 5. Get the Payment Key from Paymob (using the hardcoded test data) ---
    const paymentKey = await getPaymentKey(authToken, price, orderId, testBillingData);
    if (!paymentKey) throw new Error('Could not get payment key from Paymob.');

    // --- 6. Construct the Final Iframe URL ---
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

    // --- 7. Redirect the User to Paymob ---
    res.writeHead(302, { Location: paymentUrl });
    res.end();

  } catch (error) {
    console.error('A critical error occurred in the create-payment function:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};


// --- HELPER FUNCTIONS (Updated to accept billing object) ---

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
      merchant_order_id: landingPage
    })
  });
  const data = await response.json();
  return data.id;
}

// Updated to take a single billingData object
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
