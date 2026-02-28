interface Env {
  RESEND_API_KEY: string;
}

interface WelcomeBody {
  email: string;
  displayName?: string;
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = (await request.json()) as WelcomeBody;

    if (!body.email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers,
      });
    }

    const firstName = body.displayName?.split(' ')[0] || 'there';

    await sendEmail(env.RESEND_API_KEY, {
      from: 'TakeHomeCalc <onboarding@resend.dev>',
      to: body.email,
      subject: `Welcome to TakeHomeCalc! 🎉`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0; background: #0f172a; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 32px 28px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">💰</div>
            <h1 style="color: #22d3ee; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Welcome, ${firstName}!</h1>
            <p style="color: #94a3b8; margin: 0; font-size: 15px;">You're all set on TakeHomeCalc</p>
          </div>

          <!-- Body -->
          <div style="padding: 28px 32px;">
            <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
              Thanks for joining! TakeHomeCalc helps you understand your take-home pay, plan your savings, and simulate your financial future — all in one place.
            </p>

            <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="color: #22d3ee; font-weight: 600; margin: 0 0 12px 0; font-size: 14px;">What you can do today:</p>
              <ul style="color: #e2e8f0; font-size: 14px; line-height: 2; margin: 0; padding-left: 18px;">
                <li>Calculate your real take-home pay</li>
                <li>Track your savings rate</li>
                <li>Run portfolio simulations</li>
                <li>Export detailed reports</li>
              </ul>
            </div>

            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              We're actively building new features — more tools and insights are on the way. Stay tuned!
            </p>

            <div style="text-align: center; margin-bottom: 8px;">
              <a href="https://takehomecalc.com" style="display: inline-block; background: #22d3ee; color: #0f172a; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px;">Open TakeHomeCalc</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 32px; border-top: 1px solid #1e293b; text-align: center;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">TakeHomeCalc — Smart financial planning, simplified.</p>
          </div>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error('Welcome API error:', err);
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
