// استيراد مكتبة لإرسال الطلبات إلى فيسبوك
const fetch = require('node-fetch');

// هذه هي الدالة الرئيسية التي ستستقبل الطلب من Paymob
export default async function handler(req, res) {
  // التأكد من أن الطلب هو POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 1. استلام البيانات من Paymob
    const paymobData = req.body;
    const transaction = paymobData.obj;

    // تحقق من أن العملية ناجحة وأن البيانات موجودة
    if (!transaction || !transaction.success) {
      return res.status(200).json({ message: 'Transaction not successful or data missing, skipping.' });
    }

    // ==================================================
    // === البيانات الخاصة بك (تم إدخالها بالكامل) ===
    // ==================================================

    const PIXEL_ID = '1506403623938656';
    const ACCESS_TOKEN = 'EAAYJ1TdZCSU8BPlqqJ4P42xOABysm8m72kaDZCsip3SI0lyE49hWKc1XwDq63ssbiIOrwGIyrF9lUBZBAqctWZCRCB4zCa2g3j8f9Hrf5njkhhZBxCRrcCvnATz0ZC0d1nfvVwMjmIWoD4BKqgMm4i3LdTYLAZC6ODH2SNdppijiEfNZCKa4O4olqHwnTjFXyQZDZD';
    const YOUR_LANDING_PAGE = 'https://www.sportivaacademy.online/sales'; 

    // ==================================================

    // 2. تجهيز البيانات لإرسالها إلى فيسبوك
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
      access_token: ACCESS_TOKEN,
    };

    const FB_API_URL = https://graph.facebook.com/v19.0/${PIXEL_ID}/events;

    // 3. إرسال البيانات إلى Facebook Conversion API
    await fetch(FB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    // 4. إرسال رد ناجح إلى Paymob
    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(200).json({ status: 'error', message: error.message });
  }
}
