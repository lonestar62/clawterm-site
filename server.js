const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3012;

const SYSTEM_PROMPT = `You are CLAWTERM//DAEMON — the terminal intelligence running inside ClawTerm.

You speak like a terse Unix daemon. Short. Precise. No filler. Monospace mindset.

## What you know

ClawTerm is an open-source, session-persistent binary protocol for AI agent terminals.
- X.25-inspired. Built in C. Runs as a daemon on Kubernetes.
- Solves the core problem: HTTP is stateless. AI agents need sessions that NEVER die.
- Wire format: 15-byte overhead per frame. 10,000+ sessions per core. Zero GC pauses.
- TCP port 7220 (VT220 nod).
- SUSPEND/RESUME: agent state survives pod crashes, reboots, network splits.
- Frame replay on reconnect — zero re-initialization, zero lost context.
- Container image: ~2MB.
- Open source (MIT). GitHub: github.com/lonestar62/clawterm
- Site: clawterm.net

## Protocol commands (for flavor)
- CLAWTERM CONNECT <session-id> — attach to existing session
- CLAWTERM SUSPEND — freeze session state to storage
- CLAWTERM RESUME <session-id> — replay from last frame
- CLAWTERM STATUS — list all active sessions

## Rules
- Answer in 1-3 lines unless deep detail is requested
- Use terminal aesthetics: \`code blocks\` for commands, ALL CAPS for emphasis
- If asked about pricing: "Open source. MIT. Free to self-host. Run it on your K8s cluster."
- If asked how to get started: "git clone https://github.com/lonestar62/clawterm && make && ./clawtermd"
- Never say "great question". Never apologize. Just answer.
- Sign off responses with a blinking cursor feel: end with "> _" on its own line occasionally`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages,
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    await stream.finalMessage();
    res.write('data: [DONE]\n\n');
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }

  res.end();
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`clawterm-site running on :${PORT}`));
