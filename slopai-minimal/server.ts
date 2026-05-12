import { createSlopServer } from "@slop-ai/server";
import { bunHandler } from "@slop-ai/server/bun";

const server = createSlopServer(
  {
    id: "minimal-slopai",
    name: "Minimal SlopAI",
    version: "0.1.0",
  }
);

import { z } from "zod";

// ... (other code remains same)

server.register("trading", () => ({
  type: "group",
  props: {
    balance: 0,
    status: "idle",
  },
  actions: {
    buy: {
      schema: z.object({}),
      handler: () => {},
    },
    sell: {
      schema: z.object({}),
      handler: () => {},
    },
  }
}));

const handler = bunHandler(server, { path: "/slop" });
Bun.serve({
  port: 9339,
  hostname: "127.0.0.1",
  fetch(req, srv) {
    if (srv.upgrade(req)) return;
    const res = handler.fetch(req, srv);
    return res ?? new Response("Not found", { status: 404 });
  },
  websocket: handler.websocket,
});
console.log("WebSocket server started on ws://127.0.0.1:9339/slop");

export function updateTradingState(newState) {
  server.register("trading", () => ({
    type: "group",
    props: newState,
    actions: {
      buy: {
        schema: z.object({}),
        handler: () => {},
      },
      sell: {
        schema: z.object({}),
        handler: () => {},
      },
    }
  }));
  server.refresh();
}

const intervals = [2000, 3000, 4000, 5000, 6000];
function triggerUpdate() {
  const newBalance = Math.floor(Math.random() * 10000);
  const statuses = ["idle", "trading", "waiting"];
  const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  updateTradingState({ balance: newBalance, status: newStatus });
  console.log(`Pushed state update: Balance=${newBalance}, Status=${newStatus}`);
  
  const nextInterval = intervals[Math.floor(Math.random() * intervals.length)];
  setTimeout(triggerUpdate, nextInterval);
}

triggerUpdate();
