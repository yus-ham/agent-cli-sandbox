import { createConsumer } from "@slop-ai/consumer";

async function main() {
  const consumer = await createConsumer({
    provider: { mode: "ws", url: "ws://127.0.0.1:9339/slop" }
  });

  await consumer.subscribe({ depth: -1 });

  consumer.on("patch", (patch) => {
    const currentState = consumer.getTree();
    console.log("State updated:", JSON.stringify(currentState, null, 2));
  });

  async function executeAction(target, params) {
    try {
      const result = await consumer.invoke({ target, params });
      console.log("Action result:", result);
    } catch (err) {
      console.error("Action failed:", err);
    }
  }

  console.log("Consumer ready. Waiting for patches...");
}

main().catch(console.error);
