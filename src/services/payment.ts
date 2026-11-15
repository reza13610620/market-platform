/**
 * Payment Gateway Foundation
 * 
 * فعلاً فقط ساختار و رابط آماده است.
 * کلیدها فرضی هستند تا کلید واقعی آماده شود.
 * 
 * درگاه‌های پشتیبانی‌شونده (قابل گسترش):
 * - zarinpal
 * - idpay
 * - nextpay
 * - mock
 */

export interface Env {
  PAYMENT_PROVIDER?: string;     // zarinpal | idpay | nextpay | mock
  PAYMENT_MERCHANT_ID?: string;
  PAYMENT_CALLBACK_URL?: string; // آدرس بازگشت بعد از پرداخت
  PAYMENT_SANDBOX?: string;      // "true" برای حالت تست
}

export interface CreatePaymentInput {
  amount: number;          // به تومان
  description: string;
  orderId?: string | number;
  userId: number;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentResult {
  ok: boolean;
  paymentUrl?: string;     // لینک هدایت کاربر به درگاه
  authority?: string;      // کد پیگیری درگاه
  error?: string;
}

export interface VerifyPaymentInput {
  authority: string;
  amount: number;
}

export interface VerifyPaymentResult {
  ok: boolean;
  refId?: string;          // شماره مرجع تراکنش موفق
  error?: string;
}

/**
 * ایجاد تراکنش و دریافت لینک پرداخت
 */
export async function createPayment(
  env: Env,
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  const provider = (env.PAYMENT_PROVIDER || 'mock').toLowerCase();

  if (provider === 'mock' || !env.PAYMENT_MERCHANT_ID) {
    // حالت توسعه
    const fakeAuthority = 'MOCK-' + Date.now();
    return {
      ok: true,
      paymentUrl: `https://example.com/mock-payment?authority=${fakeAuthority}&amount=${input.amount}`,
      authority: fakeAuthority,
    };
  }

  try {
    switch (provider) {
      case 'zarinpal':
        return await createZarinpalPayment(env, input);
      case 'idpay':
        return await createIdpayPayment(env, input);
      default:
        return { ok: false, error: 'درگاه پرداخت پشتیبانی نمی‌شود' };
    }
  } catch (err) {
    console.error('[Payment] Create failed:', err);
    return { ok: false, error: 'خطا در ایجاد تراکنش پرداخت' };
  }
}

/**
 * تأیید پرداخت بعد از بازگشت کاربر از درگاه
 */
export async function verifyPayment(
  env: Env,
  input: VerifyPaymentInput
): Promise<VerifyPaymentResult> {
  const provider = (env.PAYMENT_PROVIDER || 'mock').toLowerCase();

  if (provider === 'mock' || !env.PAYMENT_MERCHANT_ID) {
    return { ok: true, refId: 'MOCK-REF-' + Date.now() };
  }

  try {
    switch (provider) {
      case 'zarinpal':
        return await verifyZarinpalPayment(env, input);
      case 'idpay':
        return await verifyIdpayPayment(env, input);
      default:
        return { ok: false, error: 'درگاه پرداخت پشتیبانی نمی‌شود' };
    }
  } catch (err) {
    console.error('[Payment] Verify failed:', err);
    return { ok: false, error: 'خطا در تأیید پرداخت' };
  }
}

// ====================== Zarinpal ======================

async function createZarinpalPayment(env: Env, input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const isSandbox = env.PAYMENT_SANDBOX === 'true';
  const baseUrl = isSandbox
    ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
    : 'https://api.zarinpal.com/pg/v4/payment/request.json';

  const callback = input.callbackUrl || env.PAYMENT_CALLBACK_URL || '';

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: env.PAYMENT_MERCHANT_ID,
      amount: input.amount * 10, // تبدیل تومان به ریال
      description: input.description,
      callback_url: callback,
      metadata: {
        order_id: String(input.orderId || ''),
        user_id: String(input.userId),
      },
    }),
  });

  const data: any = await res.json();

  if (data.data?.code === 100) {
    const authority = data.data.authority;
    const paymentBase = isSandbox
      ? 'https://sandbox.zarinpal.com/pg/StartPay/'
      : 'https://www.zarinpal.com/pg/StartPay/';

    return {
      ok: true,
      authority,
      paymentUrl: paymentBase + authority,
    };
  }

  return {
    ok: false,
    error: data.errors?.message || 'خطا در ایجاد تراکنش زرین‌پال',
  };
}

async function verifyZarinpalPayment(env: Env, input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const isSandbox = env.PAYMENT_SANDBOX === 'true';
  const baseUrl = isSandbox
    ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
    : 'https://api.zarinpal.com/pg/v4/payment/verify.json';

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: env.PAYMENT_MERCHANT_ID,
      amount: input.amount * 10,
      authority: input.authority,
    }),
  });

  const data: any = await res.json();

  if (data.data?.code === 100 || data.data?.code === 101) {
    return { ok: true, refId: String(data.data.ref_id) };
  }

  return { ok: false, error: data.errors?.message || 'تأیید پرداخت ناموفق بود' };
}

// ====================== IDPay ======================

async function createIdpayPayment(env: Env, input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const isSandbox = env.PAYMENT_SANDBOX === 'true';

  const res = await fetch('https://api.idpay.ir/v1.1/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': env.PAYMENT_MERCHANT_ID!,
      'X-SANDBOX': isSandbox ? '1' : '0',
    },
    body: JSON.stringify({
      order_id: String(input.orderId || input.userId + '-' + Date.now()),
      amount: input.amount * 10,
      desc: input.description,
      callback: input.callbackUrl || env.PAYMENT_CALLBACK_URL,
    }),
  });

  const data: any = await res.json();

  if (data.id && data.link) {
    return {
      ok: true,
      authority: data.id,
      paymentUrl: data.link,
    };
  }

  return { ok: false, error: data.error_message || 'خطا در ایجاد تراکنش آیدی‌پی' };
}

async function verifyIdpayPayment(env: Env, input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const isSandbox = env.PAYMENT_SANDBOX === 'true';

  const res = await fetch('https://api.idpay.ir/v1.1/payment/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': env.PAYMENT_MERCHANT_ID!,
      'X-SANDBOX': isSandbox ? '1' : '0',
    },
    body: JSON.stringify({
      id: input.authority,
      order_id: '', // در صورت نیاز بعداً تکمیل می‌شود
    }),
  });

  const data: any = await res.json();

  if (data.status === 100 || data.status === 101) {
    return { ok: true, refId: String(data.payment?.track_id || data.track_id) };
  }

  return { ok: false, error: data.error_message || 'تأیید پرداخت ناموفق بود' };
}
