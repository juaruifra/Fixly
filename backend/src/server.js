import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => app.listen(PORT, () => {
    console.log(`Fixly API running on http://localhost:${PORT}`);
    console.log(`Swagger available at http://localhost:${PORT}/api/docs`);
  }))
  .catch((err) => { console.error("Database connection failed:", err); process.exit(1); });
