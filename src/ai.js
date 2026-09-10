'use strict';

const OLLAMA_BASE = 'http://127.0.0.1:11434';

/**
 * Polish a PR draft through a local Ollama instance. The base URL is a
 * hardcoded loopback literal — only chat data flows, never a user URL.
 * @param {{ title: string, body: string }} pr
 * @param {string} model
 * @returns {Promise<{ title: string, body: string }>}
 */
async function polishWithOllama(pr, model = 'llama3.2') {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `Improve this pull-request description for clarity. Keep the exact markdown structure, keep every factual claim identical, do not invent changes. Reply with the improved markdown only.\n\n${pr.body}`,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama request failed: ${res.status} — is "ollama serve" running?`);
  const data = await res.json();
  const text = String(data.response || '').trim();
  if (!text) return pr;
  return { ...pr, body: text };
}

module.exports = { OLLAMA_BASE, polishWithOllama };
