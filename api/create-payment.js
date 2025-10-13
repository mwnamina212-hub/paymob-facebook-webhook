// Final Corrected Code (Oct 12 Version) - The Growth Partner
const fetch = require('node-fetch');

// --- MAIN FUNCTION ---
module.exports = async (req, res) => {
  try {
    // --- 1. Extract Data from the Button Link ---
    const {
      price,
      page,
      email = 'not_provided@example.com',
      firstName = 'Guest',
      lastName = 'User',
      phone = '01000000000'
    } = req.query;

    if (!price || !page) {
      return res.status(400).json({ message: 'Error: Price and Page URL are required.' });
    }

    // --- 2. Authenticate with Paymob ---
    const authToken = await getAuthToken();
    if (!authToken) throw new Error('Could not authenticate with Paymob.');

    // --- 3. Register the Order with Paymob ---
    const orderId = await registerOrder(authToken, price, page);
    if (!orderId) throw new Error('Could not register order with Paymob.');

    // --- 4. Get the Payment Key from Paymob ---
    const paymentKey = await getPaymentKey(authToken, price, orderId, email, firstName, lastName, phone);
    if (!paymentKey) throw new Error('Could not get payment key from Paymob.');

    // --- 5. Construct the Final Iframe URL ---
    // THIS IS THE FINAL CORRECTED LINE. IT USES PAYMOB_IFRAME_ID.
    const paymentUrl = https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey};

    // --- 6. Redirect the User to Paymob ---
    res.writeHead(302, { Location: paymentUrl });
    res.end();

  } catch (error) {
    console.error('A critical error occurred in the create-payment function:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// --- HELPER FUNCTIONS ---

// Step 1: Authenticate
async function getAuthToken() {
  const response = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ "api_key": process.env.PAYMOB_API_KEY })
  });
  const data = await response.json();
  return data.token;
}

// Step 2: Register the order
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

// Step 3: Get the payment key
async function getPaymentKey(authToken, amount, orderId, email, firstName, lastName, phone) {
  const response = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: Number(amount) * 100,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        apartment: "NA",
        floor: "NA",
        street: "NA",
        building: "NA",
        shipping_method: "NA",
        postal_code: "NA",
        city: "NA",
        country: "NA",
        state: "NA"
      },
      currency: "EGP",
      // THIS IS THE FINAL CORRECTED LINE. IT USES PAYMOB_INTEGRATION_ID.
      integration_id: process.env.PAYMOB_INTEGRATION_ID
    })
  });
  const data = await response.json();
  return data.token;
}
