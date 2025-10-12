// This is the "Bridge" code that connects systeme.io to Paymob (Professional Version)

// Step 1: Authenticate with Paymob
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
      "auth_token": authToken,
      "delivery_needed": "false",
      "amount_cents": amount * 100,
      "currency": "EGP",
      "merchant_order_id": landingPage
    })
  });
  const data = await response.json();
  return data.id;
}

// Step 3: Get the final payment key (This step now requires the Integration ID for card payments)
async function getPaymentKey(authToken, orderId, amount, billingData, integrationId) {
  const response = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      "auth_token": authToken,
      "amount_cents": amount * 100,
      "expiration": 3600,
      "order_id": orderId,
      "billing_data": {
        "email": billingData.email,
        "first_name": billingData.firstName,
        "last_name": billingData.lastName,
        "phone_number": billingData.phone,
        "apartment": "NA", "floor": "NA", "street": "NA", "building": "NA", "postal_code": "NA", "city": "NA", "country": "NA", "state": "NA"
      },
      "currency": "EGP",
      "integration_id": integrationId // We will pass the card integration ID here
    })
  });
  const data = await response.json();
  return data.token;
}

// Main function
module.exports = async (req, res) => {
  try {
    const { price, page, email, firstName, lastName, phone } = req.query;

    if (!price || !page) {
      return res.status(400).send('Price and page URL are required.');
    }

    const authToken = await getAuthToken();
    const orderId = await registerOrder(authToken, price, page);
    
    // IMPORTANT: Even for the hosted payment page, we need to generate a payment key
    // using ONE of the integration IDs. We will use the card payment ID for this.
    // So we still need the card integration ID.
    const cardIntegrationId = process.env.PAYMOB_CARD_ID; // Let's add this to Vercel
    const paymentKey = await getPaymentKey(authToken, orderId, price, { email, firstName, lastName, phone }, cardIntegrationId);

    // --- THE MAGIC LINE (UPDATED) ---
    // This redirects to the hosted payment page which shows ALL payment methods
    const paymentUrl = https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey};
    res.redirect(302, paymentUrl);

  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).send('An error occurred.');
  }
};
