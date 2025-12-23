import 'dotenv/config';
import { OpenRouter } from "@openrouter/sdk";
import PromptSync from "prompt-sync";
const prompt = PromptSync();

const userQ = prompt("enter prompt: ");
const openrouter = new OpenRouter({
  apiKey: process.env.API_KEY
});
async function callLLM(messages) {
  const result = await openrouter.chat.send({
    model: "deepseek/deepseek-r1-0528:free",
    messages: [
    {
      "role": "user",
      "content": userQ
    }
  ],
    tools,
    stream: false,
  });

  messages.push(result.choices[0].message);
  return result;
}

async function getToolResponse(response) {
  const toolCall = response.choices[0].message.toolCalls[0];
  const toolName = toolCall.function.name;
  const toolArgs = JSON.parse(toolCall.function.arguments);

  // Look up the correct tool locally, and call it with the provided arguments
  // Other tools can be added without changing the agentic loop
  // const toolResult = await TOOL_MAPPING[toolName](toolArgs);
  const params = new URLSearchParams({
  q: result,
  count: '3'
});
const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
  method: 'get',
  headers: {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'x-subscription-token': 'BSAlkWmZfgjr1p51rKPCwwNnUR_f6Pv',
  },
});
const body = await response.json();

  return {
    role: 'tool',
    toolCallId: toolCall.id,
    content: toolResult,
  };
}

const maxIterations = count;
let iterationCount = 0;

while (iterationCount < maxIterations) {
  iterationCount++;
  const response = await callLLM(messages);

  if (response.choices[0].message.toolCalls) {
    messages.push(await getToolResponse(response));
  } else {
    break;
  }
}

if (iterationCount >= maxIterations) {
  console.warn("Warning: Maximum iterations reached");
}

console.log(messages[messages.length - 1].content);
