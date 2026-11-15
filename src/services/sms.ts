/**
 * SMS Service
 * 
 * فعلاً کلیدها فرضی هستند.
 * وقتی کلید واقعی آماده شد، فقط مقادیر موجود در Env و wrangler را جایگزین کنید.
 * 
 * پشتیبانی از چند ارائه‌دهنده (قابل گسترش):
 * - kavenegar
 * - sms.ir
 * - farazsms
 * - mock (برای توسعه)
 */

export interface Env {
  SMS_PROVIDER?: string;       // kavenegar | smsir | faraz | mock
  SMS_API_KEY?: string;
  SMS_SENDER?: string;         // شماره خط ارسال‌کننده
  SMS_TEMPLATE_OTP?: string;   // کد قالب OTP (اگر ارائه‌دهنده از قالب پشتیبانی کند)
}

export interface SendSmsResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * ارسال کد OTP
 */
export async function sendOtpSms(
  env: Env,
  phone: string,
  code: string
): Promise<SendSmsResult> {
  const provider = (env.SMS_PROVIDER || 'mock').toLowerCase();

  // حالت توسعه / تست
  if (provider === 'mock' || !env.SMS_API_KEY) {
    console.log(`[SMS-MOCK] OTP for ${phone}: ${code}`);
    return { ok: true, messageId: 'mock-' + Date.now() };
  }

  try {
    switch (provider) {
      case 'kavenegar':
        return await sendWithKavenegar(env, phone, code);
      case 'smsir':
        return await sendWithSmsIr(env, phone, code);
      case 'faraz':
        return await sendWithFaraz(env, phone, code);
      default:
        console.log(`[SMS] Unknown provider: ${provider}. Falling back to mock.`);
        console.log(`[SMS-MOCK] OTP for ${phone}: ${code}`);
        return { ok: true, messageId: 'mock-fallback' };
    }
  } catch (err) {
    console.error('[SMS] Send failed:', err);
    return { ok: false, error: 'خطا در ارسال پیامک' };
  }
}

// ====================== Providers ======================

async function sendWithKavenegar(env: Env, phone: string, code: string): Promise<SendSmsResult> {
  // مستندات: https://kavenegar.com/rest.html
  const apiKey = env.SMS_API_KEY!;
  const template = env.SMS_TEMPLATE_OTP || 'otp';

  // استفاده از Verify Lookup (قالب)
  const url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;

  const body = new URLSearchParams({
    receptor: phone,
    token: code,
    template: template,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data: any = await res.json();

  if (data.return?.status === 200) {
    return { ok: true, messageId: String(data.entries?.[0]?.messageid || '') };
  }

  return {
    ok: false,
    error: data.return?.message || 'خطا در ارسال از کاوه‌نگار',
  };
}

async function sendWithSmsIr(env: Env, phone: string, code: string): Promise<SendSmsResult> {
  // مستندات: https://sms.ir
  // این بخش وقتی کلید واقعی آمد دقیق‌تر تنظیم می‌شود
  const apiKey = env.SMS_API_KEY!;

  const res = await fetch('https://api.sms.ir/v1/send/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      mobile: phone,
      templateId: Number(env.SMS_TEMPLATE_OTP) || 0,
      parameters: [{ name: 'code', value: code }],
    }),
  });

  const data: any = await res.json();

  if (data.status === 1) {
    return { ok: true, messageId: String(data.data?.messageId || '') };
  }

  return { ok: false, error: data.message || 'خطا در ارسال از sms.ir' };
}

async function sendWithFaraz(env: Env, phone: string, code: string): Promise<SendSmsResult> {
  // ساختار اولیه - بعد از دریافت کلید واقعی تکمیل می‌شود
  const apiKey = env.SMS_API_KEY!;
  const sender = env.SMS_SENDER || '';

  const res = await fetch('https://api2.ippanel.com/api/v1/sms/pattern/normal/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      code: env.SMS_TEMPLATE_OTP,
      sender,
      recipient: phone,
      values: { code },
    }),
  });

  const data: any = await res.json();

  if (data.status?.code === 200 || data.code === 200) {
    return { ok: true, messageId: String(data.data?.message_id || data.messageId || '') };
  }

  return { ok: false, error: 'خطا در ارسال از فراز SMS' };
}
