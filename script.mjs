import 'dotenv/config';
import { OpenRouter } from "@openrouter/sdk";
import PromptSync from "prompt-sync";
import fetch from 'node-fetch';
const prompt = PromptSync();
let count = 3;
const search_terms = [];
// user prompt
const userQ = prompt("enter prompt: ");

// llm api
const openrouter = new OpenRouter({
  apiKey: process.env.API_KEY
});
// tool definition
const tools = [
    {
      "type": "function",
      "function": {
        "name": "search_web",
        "description": "Search for things in the web",
        "parameters": {
          "type": "object",
          "properties": {
            "search_terms": {
              "type": "array",
              "items": {"type": "string"},
              "description": "List of search terms to find what the user wants"
            }
          },
          "required": ['search_terms']
        }
      }
    }
  ]
  // Model responds with tool_calls, you execute the tool locally
const toolResult = await search_web( {search_terms} );

// function to normally prompt llm but if the llm needs then it will toolCall 
async function callLLM(search_terms) {
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

  const msg = result.choices[0].message;

  if(msg.toolCalls) { 
    const toolCall = response.choices[0].message.toolCalls[0];
    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments);
  // Look up the correct tool locally, and call it with the provided arguments
  // Other tools can be added without changing the agentic loop
    const toolResult = await TOOL_MAPPING[toolName](toolArgs);
    return {
      role: 'tool',
      toolCallId: toolCall.id,
      content: toolResult,
  };
}
  search_terms = msg;
  
  return msg, search_terms;
}

async function search_web(result) { 
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
// now return the converted to string version of the json
const myJSON = JSON.stringify(body)
  return myJSON;
}
async function main(myJSON) {
// do those count times
for (let iterationCount = 0; iterationCount < count; i++){
  const response = await callLLM(myJSON);

  if (msg.toolCalls) {
    messages.push(await getToolResponse(response));
  } else {
    break;
  }
}
console.log(messages[messages.length - 1].content);
}
