import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 RecoverAI server running on port ${PORT}`);
  console.log(`📊 API available on port ${PORT}/api`);
  console.log(`💚 Health check on port ${PORT}/health`);
});
