/* =============================================================================
   SKOPE — the chat endpoint
   Lives at  /functions/api/chat.js  in your Cloudflare Pages project, which
   makes it answer at  https://skope-vail.pages.dev/api/chat

   Its only job is to hold the API key and pass messages through. It does NOT
   plan anything: when Claude wants a day, it says so, the phone runs YOUR
   planner on YOUR graph, and sends the answer back. The graph never leaves
   the phone and the key never leaves this file.
   ========================================================================== */

const MODEL = 'claude-sonnet-5';

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'No API key set. Add ANTHROPIC_API_KEY in the Cloudflare dashboard.' }, 500);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Bad request' }, 400); }

  const { messages, system, tools } = body;
  if (!Array.isArray(messages)) return json({ error: 'messages must be a list' }, 400);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system,
      tools,
      messages,
    }),
  });

  const data = await res.json();
  return json(data, res.status);
}

// the browser and the function are the same origin, so no CORS dance is needed
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json' },
  });
}
