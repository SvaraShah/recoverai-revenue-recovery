import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { seedIfEmpty } from "./startup/seed";

const PORT = process.env.PORT || 3001;

async function start() {
  await seedIfEmpty();
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 RecoverAI server running on port ${PORT}`);
    console.log(`📊 API available on port ${PORT}/api`);
    console.log(`💚 Health check on port ${PORT}/health`);
  });
}

start().catch((err) => {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
});
