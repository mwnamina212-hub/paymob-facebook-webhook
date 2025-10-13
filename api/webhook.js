const fetch = require('node-fetch');
const crypto = require('crypto'); // <-- الخطوة 1: استدعاء مكتبة التشفير

// دالة مساعدة لعمل التشفير المطلوب
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

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
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN; 
    const landingPageUrl = transaction.merchant_order_id || 'https://www.sportivaacademy.online/sales';

    // --- DATA CLEANING & HASHING --- // <-- الخطوة 2: تعديل هنا
    const email = transaction.billing_data?.email?.trim().toLowerCase();
    const phone = transaction.billing_data?.phone_number?.replace(/[^0-9]/g, '');
    const firstName = transaction.billing_data?.first_name?.trim().toLowerCase();
    const lastName = transaction.billing_data?.last_name?.trim().toLowerCase();

    // --- FACEBOOK EVENT PREPARATION ---
    const eventData = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: landingPageUrl,
          action_source: 'website',
          user_data: {
            // التعديل الأهم: استخدام الدالة hashData لتشفير كل حقل
            em: email ? [hashData(email)] : [],
            ph: phone ? [hashData(phone)] : [], // لاحظ أننا لم نعد نضيف "+" هنا
            fn: firstName ? [hashData(firstName)] : [],
            ln: lastName ? [hashData(lastName)] : [],
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
    
    // Check for errors from Facebook API
    if (response.status >= 400) {
        console.error('Error sending event to Facebook:', responseBody);
    } else {
        console.log('Successfully sent event to Facebook. Response:', responseBody);
    }

    res.status(200).json({ status: 'success', facebook_response: responseBody });

  } catch (error) {
    console.error('A critical error occurred in the webhook function:', error);
    // نرسل 200 دائمًا لبايموب حتى لو حدث خطأ داخلي لمنعهم من إعادة الإرسال
    res.status(200).json({ status: 'error', message: error.message });
  }
};
