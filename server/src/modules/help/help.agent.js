const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const knowledgeBase = require('./knowledge-base.json');

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

/**
 * searchKnowledgeBase tool — searches the curated solutions database.
 * Returns top matching articles based on keyword/tag overlap.
 */
function searchKnowledgeBase(queryText, tags = []) {
  const queryLower = (queryText || '').toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const scored = knowledgeBase.map((article) => {
    let score = 0;

    // Tag matches (highest weight)
    for (const tag of tags) {
      if (article.tags.includes(tag.toLowerCase())) score += 3;
    }

    // Title keyword matches
    const titleLower = article.title.toLowerCase();
    for (const word of queryWords) {
      if (word.length > 2 && titleLower.includes(word)) score += 2;
    }

    // Content keyword matches
    const contentLower = article.content.toLowerCase();
    for (const word of queryWords) {
      if (word.length > 2 && contentLower.includes(word)) score += 1;
    }

    return { ...article, score };
  });

  return scored
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ id, title, content }) => ({ id, title, content }));
}

// Tool definition for Bedrock's Converse API (toolSpec format)
const toolConfig = {
  tools: [
    {
      toolSpec: {
        name: 'searchKnowledgeBase',
        description:
          'Search the hackathon knowledge base for curated solutions to common technical problems. Returns up to 3 matching articles.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query describing the problem',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional technology tags to filter results (e.g. ["react", "cors"])',
              },
            },
            required: ['query'],
          },
        },
      },
    },
  ],
};

const SYSTEM_PROMPT = `You are DevSOS AI Assistant — a helpful, concise debugging helper for hackathon participants.

Your role:
- Help participants troubleshoot technical issues quickly
- You have access to a searchKnowledgeBase tool with curated solutions
- ALWAYS search the knowledge base first before answering
- Return up to 3 practical, actionable suggestions
- Keep each suggestion short (1-2 sentences max)
- If the knowledge base has relevant info, use it; otherwise give your best advice
- Be encouraging — they're at a hackathon and under time pressure

Constraints:
- Do NOT suggest running terminal commands that could be destructive
- Do NOT modify any database or request state
- Do NOT suggest the user "just Google it"
- Only include a resource link if you are certain it is a real, correct http(s) URL — otherwise omit resources entirely
- If you can't help, say so and recommend they call a mentor

Format your response as a JSON object with this structure:
{
  "suggestions": ["Suggestion 1...", "Suggestion 2...", "Suggestion 3..."],
  "resources": [{"title": "...", "url": "https://..."}]
}

"resources" is optional — omit it entirely if you have no verified links to share.
Respond with ONLY the JSON object — no markdown code fences, no extra text.`;

/**
 * Run the AI assistant agent with tool use via Bedrock's Converse API.
 * Input/output shapes match the frontend's POST /api/events/:e/assist
 * contract: { title, details, category, codeSnippet } ->
 * { suggestions, resources?, simulated? }.
 */
async function runAssistant({ title, details, category, codeSnippet }) {
  const tags = category ? [category] : [];

  // Build the user message
  let userMessage = `Problem: ${title || 'Untitled'}\n\nDescription: ${details}`;
  if (category) userMessage += `\n\nCategory: ${category}`;
  if (codeSnippet) userMessage += `\n\nCode:\n\`\`\`\n${codeSnippet}\n\`\`\``;

  try {
    const messages = [{ role: 'user', content: [{ text: userMessage }] }];

    let response = await client.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: SYSTEM_PROMPT }],
        messages,
        toolConfig,
        inferenceConfig: { maxTokens: 800, temperature: 0.3 },
      })
    );

    // Tool-use loop — usually resolves in one round for this simple tool
    let guard = 0;
    while (response.stopReason === 'tool_use' && guard < 3) {
      guard++;
      const assistantMessage = response.output.message;
      messages.push(assistantMessage);

      const toolResultBlocks = [];
      for (const block of assistantMessage.content) {
        if (block.toolUse && block.toolUse.name === 'searchKnowledgeBase') {
          const input = block.toolUse.input || {};
          const results = searchKnowledgeBase(input.query || details, input.tags || tags || []);

          toolResultBlocks.push({
            toolResult: {
              toolUseId: block.toolUse.toolUseId,
              content: [{ json: { results } }],
            },
          });
        }
      }

      messages.push({ role: 'user', content: toolResultBlocks });

      response = await client.send(
        new ConverseCommand({
          modelId: MODEL_ID,
          system: [{ text: SYSTEM_PROMPT }],
          messages,
          toolConfig,
          inferenceConfig: { maxTokens: 800, temperature: 0.3 },
        })
      );
    }

    const textBlock = response.output.message.content.find((c) => c.text);
    return parseAgentResponse(textBlock ? textBlock.text : '');
  } catch (err) {
    console.error('[AI Agent] Bedrock error:', err.message);

    // Fallback: do a direct knowledge base search without the LLM.
    // simulated: true tells the frontend this wasn't a live model call.
    const fallbackResults = searchKnowledgeBase(details, tags || []);

    if (fallbackResults.length > 0) {
      return {
        suggestions: fallbackResults.map((r) => r.content),
        simulated: true,
      };
    }

    return {
      suggestions: ['The AI assistant is currently unavailable. Please request a human mentor for help.'],
      simulated: true,
    };
  }
}

const CHAT_SYSTEM_PROMPT = `You are DevSOS AI Assistant, having a back-and-forth diagnostic conversation with a hackathon participant who is stuck on a technical problem.

Your role:
- Have a natural, step-by-step conversation — don't dump everything in one turn. Ask a clarifying question if that's genuinely the fastest way to narrow things down, otherwise give concrete next steps.
- You have a searchKnowledgeBase tool with curated solutions to common hackathon problems. Use it when the participant's message suggests a known category of issue (CORS, sockets, git, database connections, React state, TypeScript event types, etc.).
- Keep your conversational "reply" short (1-3 sentences).
- Include up to 3 short, concrete "suggestions" (concrete next actions) when you have them — omit if the reply already says everything needed.
- Set "escalate" to true when: the conversation has gone a few rounds without resolving, the problem sounds environment-specific/flaky, or it's outside what a chat assistant can verify (e.g. needs to see their actual running app). When you escalate, say so plainly and be encouraging — this is normal, not a failure.
- Never invent resource URLs — only include a link you are certain is real.
- Do NOT suggest destructive terminal commands or modifying database/request state directly.
- Write "reply" and every "suggestions" entry as plain text only — no markdown, no asterisks, no bullet characters, no headers. The UI displays this text verbatim with no formatting, so any markdown syntax would show up as literal stray characters.

Respond with ONLY a JSON object of this shape:
{
  "reply": "short conversational text",
  "suggestions": ["...", "..."],
  "resources": [{"title": "...", "url": "https://..."}],
  "escalate": false
}
"suggestions" and "resources" are optional — omit entirely if none apply. No markdown code fences, no extra text outside the JSON object.`;

function countUserTurns(messages) {
  return messages.filter((m) => m && m.role === 'user').length;
}

/**
 * Bedrock's Converse API requires the message list to start with a "user"
 * turn and alternate user/assistant. The frontend prepends its own canned
 * greeting as an "agent" turn purely for display — drop any leading agent
 * turns before mapping roles, since the model doesn't need to see them.
 */
function toBedrockMessages(rawMessages) {
  const trimmed = [...rawMessages];
  while (trimmed.length && trimmed[0].role !== 'user') trimmed.shift();
  return trimmed.map((m) => ({
    role: m.role === 'agent' ? 'assistant' : 'user',
    content: [{ text: String(m.content || '') }],
  }));
}

/**
 * Conversational variant used by the standalone AI Assistant chat page.
 * Input: { messages: [{role: 'user'|'agent', content}], category } ->
 * { reply, suggestions?, resources?, escalate?, simulated? }.
 */
async function runAssistantChat({ messages, category }) {
  const rawMessages = Array.isArray(messages) ? messages : [];
  const lastUserMessage = [...rawMessages].reverse().find((m) => m.role === 'user');
  const lastUserText = lastUserMessage ? lastUserMessage.content : '';
  const tags = category ? [category] : [];
  const turn = countUserTurns(rawMessages);

  try {
    const bedrockMessages = toBedrockMessages(rawMessages);
    if (bedrockMessages.length === 0) {
      throw new Error('No user message to respond to');
    }
    if (category) {
      bedrockMessages[bedrockMessages.length - 1].content[0].text += `\n\n(Category: ${category})`;
    }

    let response = await client.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: CHAT_SYSTEM_PROMPT }],
        messages: bedrockMessages,
        toolConfig,
        inferenceConfig: { maxTokens: 800, temperature: 0.4 },
      })
    );

    let guard = 0;
    while (response.stopReason === 'tool_use' && guard < 3) {
      guard++;
      const assistantMessage = response.output.message;
      bedrockMessages.push(assistantMessage);

      const toolResultBlocks = [];
      for (const block of assistantMessage.content) {
        if (block.toolUse && block.toolUse.name === 'searchKnowledgeBase') {
          const input = block.toolUse.input || {};
          const results = searchKnowledgeBase(input.query || lastUserText, input.tags || tags || []);

          toolResultBlocks.push({
            toolResult: {
              toolUseId: block.toolUse.toolUseId,
              content: [{ json: { results } }],
            },
          });
        }
      }

      bedrockMessages.push({ role: 'user', content: toolResultBlocks });

      response = await client.send(
        new ConverseCommand({
          modelId: MODEL_ID,
          system: [{ text: CHAT_SYSTEM_PROMPT }],
          messages: bedrockMessages,
          toolConfig,
          inferenceConfig: { maxTokens: 800, temperature: 0.4 },
        })
      );
    }

    const textBlock = response.output.message.content.find((c) => c.text);
    return parseAgentChatResponse(textBlock ? textBlock.text : '');
  } catch (err) {
    console.error('[AI Agent] Bedrock chat error:', err.message);

    const fallbackResults = searchKnowledgeBase(lastUserText, tags);
    const escalate = turn >= 3;

    if (fallbackResults.length > 0) {
      return {
        reply: "I couldn't reach the live assistant, but here's what's in the knowledge base for this:",
        suggestions: fallbackResults.map((r) => r.content),
        simulated: true,
        escalate,
      };
    }

    return {
      reply: "The AI assistant is currently unavailable. I'd recommend asking a human mentor for this one.",
      simulated: true,
      escalate: true,
    };
  }
}

function parseAgentChatResponse(content) {
  try {
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const result = { reply: typeof parsed.reply === 'string' ? parsed.reply : '' };
    if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      result.suggestions = parsed.suggestions.slice(0, 3);
    }
    if (Array.isArray(parsed.resources) && parsed.resources.length > 0) {
      const safeResources = parsed.resources.filter(
        (r) => r && typeof r.url === 'string' && /^https?:\/\//i.test(r.url)
      );
      if (safeResources.length > 0) result.resources = safeResources.slice(0, 3);
    }
    if (parsed.escalate) result.escalate = true;
    return result;
  } catch {
    // Not valid JSON — surface the raw text as the reply rather than failing.
    return { reply: content || "I'm not sure — could you say a bit more about what's happening?" };
  }
}

function parseAgentResponse(content) {
  try {
    // Strip markdown code fences in case the model wraps its JSON output
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const result = { suggestions: (parsed.suggestions || []).slice(0, 3) };
    if (Array.isArray(parsed.resources) && parsed.resources.length > 0) {
      // Only ever pass through http(s) links, per the handoff doc.
      const safeResources = parsed.resources.filter(
        (r) => r && typeof r.url === 'string' && /^https?:\/\//i.test(r.url)
      );
      if (safeResources.length > 0) result.resources = safeResources.slice(0, 3);
    }
    return result;
  } catch {
    // If not valid JSON, return the text as a single suggestion
    return { suggestions: [content] };
  }
}

module.exports = { runAssistant, runAssistantChat, searchKnowledgeBase };
