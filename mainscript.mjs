import 'dotenv/config';
import { OpenRouter } from "@openrouter/sdk";
import PromptSync from "prompt-sync";
const prompt = PromptSync();

const userQ = prompt("enter prompt: ");
const openrouter = new OpenRouter({
  apiKey: process.env.API_KEY
});

const stream = await openrouter.chat.send({
  model: "deepseek/deepseek-r1-0528:free",
  messages: [
    {
      "role": "user",
      "content": userQ
    }
  ],
  stream: true,
  provider: {
    "sort": "throughput"
  }
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}


