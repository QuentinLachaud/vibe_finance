interface Env {
  RESEND_API_KEY: string;
}

interface ContactBody {
  email?: string;
  message: string;
}

async function sendEmail(apiKey: string, payload: { from: string; to: string; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error ${res.status}: ${text}`);
  }
  return res.json();
}

function formatDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const day = days[date.getUTCDay()];
  const dateNum = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');

  const suffix = dateNum === 1 || dateNum === 21 || dateNum === 31 ? 'st'
    : dateNum === 2 || dateNum === 22 ? 'nd'
    : dateNum === 3 || dateNum === 23 ? 'rd' : 'th';

  return `${day} ${dateNum}${suffix} ${month} ${year} at ${hours}:${minutes} UTC`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = (await request.json()) as ContactBody;

    if (!body.message || body.message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers,
      });
    }

    const now = new Date();
    const friendlyDate = formatDate(now);
    const senderInfo = body.email ? body.email : 'Anonymous visitor';

    await sendEmail(env.RESEND_API_KEY, {
      from: 'TakeHomeCalc <onboarding@resend.dev>',
      to: 'quentin.lachaud@gmail.com',
      subject: `💬 New message from ${senderInfo} — TakeHomeCalc`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
          <h2 style="color: #22d3ee; margin: 0 0 24px 0; font-size: 20px;">New Contact Message</h2>
          
          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #94a3b8;">
              On <strong style="color: #f1f5f9;">${friendlyDate}</strong>, 
              <strong style="color: #22d3ee;">${senderInfo}</strong> sent you a message from 
              <strong style="color: #eab308;">TakeHomeCalc</strong>:
            </p>
            <div style="background: #0f172a; border-left: 3px solid #22d3ee; padding: 16px; border-radius: 4px; margin-top: 12px;">
              <p style="margin: 0; font-size: 15px; color: #f1f5f9; line-height: 1.6; white-space: pre-wrap;">${body.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
          </div>

          ${body.email ? `<p style="margin: 0; font-size: 13px; color: #64748b;">Reply directly to <a href="mailto:${body.email}" style="color: #22d3ee; text-decoration: none;">${body.email}</a></p>` : ''}
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error('Contact API error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
