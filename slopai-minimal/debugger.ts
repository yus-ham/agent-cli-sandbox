import { SlopConsumer, WebSocketClientTransport } from "@slop-ai/consumer";

async function debug() {
  const consumer = new SlopConsumer(
    new WebSocketClientTransport("ws://127.0.0.1:9339/slop")
  );

  console.log("Connecting...");
  await consumer.connect();
  const { id } = await consumer.subscribe("/", -1);
  
  const tree = consumer.getTree(id);
  console.log("Full State Tree:");
  console.log(JSON.stringify(tree, null, 2));

  // Inspect the trading node
  const tradingNode = tree?.children?.find(c => c.id === "trading");
  if (tradingNode?.affordances) {
    console.log("\nAffordances found:", JSON.stringify(tradingNode.affordances, null, 2));
  } else {
    console.log("\nNo affordances found on trading node.");
  }
}

debug().catch(console.error);
