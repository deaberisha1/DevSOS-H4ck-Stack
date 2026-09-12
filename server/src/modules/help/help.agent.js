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

module.exports = { runAssistant, searchKnowledgeBase };
