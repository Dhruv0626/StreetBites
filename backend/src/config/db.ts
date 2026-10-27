import mongoose from "mongoose";
import dns from "dns";

// Fix Node.js Windows SRV lookup issue with MongoDB Atlas (ECONNREFUSED)
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore fallback if network environment restricts custom DNS
}

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("❌ MongoDB Connection Error: MONGODB_URI is not set in environment.");
      return;
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected`);

    // Clean up legacy indexes on 'carts' that conflict with new single-cart design
    try {
      const cartsCol = conn.connection.db?.collection("carts");
      if (cartsCol) { ``
        const indexes = await cartsCol.indexes();
        for (const idx of indexes as any[]) {
          const idxKey = idx?.key || {};
          if (
            idx?.name === "customer_id_1_stall_id_1_item_id_1" ||
            (idxKey.stall_id && idxKey.item_id)
          ) {
            console.log(`🧹 Dropping legacy index on carts: ${idx.name}`);
            await cartsCol.dropIndex(idx.name);
          }
        }
        // Reset stale/bloated test carts so all users start with default 0 items
        const purgeRes = await cartsCol.deleteMany({});
        if (purgeRes && purgeRes.deletedCount > 0) {
          console.log(`🧹 Cleared ${purgeRes.deletedCount} stale cart documents. Default cart is now 0.`);
        }
      }
    } catch {
      // Index may already be dropped or not exist
    }
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
};
