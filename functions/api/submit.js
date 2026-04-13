export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': 'https://beasttechengineering.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return new Response(JSON.stringify({ error: 'Missing type or data' }), { status: 400, headers });
    }

    // Build email content based on submission type
    let subject, htmlBody;

    if (type === 'assessment') {
      subject = `New Assessment Submission — ${data.name || 'Unknown'}`;
      htmlBody = buildAssessmentEmail(data);
    } else if (type === 'pdh_interest') {
      subject = `PDH Interest — ${data.email}`;
      htmlBody = buildPdhEmail(data);
    } else {
      return new Response(JSON.stringify({ error: 'Unknown submission type' }), { status: 400, headers });
    }

    // Send via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BeastTech Forms <forms@beasttechengineering.com>',
        to: ['ben@beasttechengineering.com'],
        subject: subject,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const err = await resendResponse.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('Submit error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://beasttechengineering.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function buildAssessmentEmail(data) {
  const fields = [
    ['Name', data.name],
    ['Email', data.email],
    ['Company', data.company],
    ['Industry', data.industry],
    ['Company Size', data.company_size],
    ['Region', data.region],
    ['Bottleneck Category', data.bottleneck_category],
    ['Bottleneck Detail', data.bottleneck_detail],
    ['Technology Wish', data.technology_wish],
    ['Engagement Preference', data.engage_pref],
    ['Additional Notes', data.additional],
    ['Submitted', data.submitted_at],
  ];

  const rows = fields
    .filter(([, val]) => val)
    .map(([label, val]) => `
      <tr>
        <td style="padding:8px 12px;font-weight:600;color:#333;vertical-align:top;white-space:nowrap;border-bottom:1px solid #eee;">${label}</td>
        <td style="padding:8px 12px;color:#555;border-bottom:1px solid #eee;">${escapeHtml(val)}</td>
      </tr>
    `).join('');

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#111;margin-bottom:4px;">New Assessment Submission</h2>
      <p style="color:#666;margin-top:0;">Someone filled out the capability assessment on beasttechengineering.com</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        ${rows}
      </table>
      <p style="color:#999;font-size:13px;margin-top:24px;">Reply directly to <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a> to respond.</p>
    </div>
  `;
}

function buildPdhEmail(data) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#111;margin-bottom:4px;">New PDH Interest Signup</h2>
      <p style="color:#666;">Someone wants to be notified when PDH courses launch.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#333;border-bottom:1px solid #eee;">Email</td>
          <td style="padding:8px 12px;color:#555;border-bottom:1px solid #eee;">${escapeHtml(data.email)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#333;border-bottom:1px solid #eee;">Submitted</td>
          <td style="padding:8px 12px;color:#555;border-bottom:1px solid #eee;">${data.submitted_at || new Date().toISOString()}</td>
        </tr>
      </table>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
