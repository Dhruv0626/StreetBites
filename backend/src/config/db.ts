import mongoose from "mongoose";
import dns from "node:dns";

// Resolve Atlas SRV records reliably on Windows/Node.js
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`✅ MongoDB Connected`);
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
};
