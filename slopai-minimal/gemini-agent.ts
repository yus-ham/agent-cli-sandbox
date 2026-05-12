import { SlopConsumer, WebSocketClientTransport } from "@slop-ai/consumer";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 2. Setup SLOP Consumer
const consumer = new SlopConsumer(
  new WebSocketClientTransport("ws://127.0.0.1:9339/slop")
);

async function runAgent() {
  await consumer.connect();
  const { id } = await consumer.subscribe("/", -1);
  console.log("Agent listening to minimal-slop...");

  consumer.on("patch", async () => {
    const tree = consumer.getTree(id);
    const prompt = `
      Current system state: ${JSON.stringify(tree)}
      Your goal is to optimize trading performance.
      Analyze this state and decide if you should call 'buy' or 'sell' affordances.
      Return your decision in JSON format: { "action": "buy" | "sell" | "none", "params": { "amount": number } }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const decision = JSON.parse(responseText.replace(/```json|```/g, ""));
      
      if (decision.action !== "none") {
        console.log("Gemini decided:", decision);
        await consumer.invoke("/trading", decision.action, decision.params);
      }
    } catch (e) {
      console.error("Agent error:", e);
    }
  });
}

runAgent().catch(console.error);
