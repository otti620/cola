import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Chat Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ 
          text: "Hi! The Gemini API Key is not yet configured. Please add the GEMINI_API_KEY environment variable in the application's Settings to enable full AI chatbot responses." 
        });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `You are the Careem Invest AI Assistant. 
        Your goal is to help users understand the Careem driver sponsoring platform.
        Key Information:
        - Careem Invest is a crowdfunding platform for regional mobility.
        - Users "sponsor" drivers or routes (investment plans).
        - Sponsorship Tiers:
          * Temps (Silver): Low entry, flexible daily checks.
          * T1 (Gold): Higher returns, premium route access.
          * T2 (Platinum): High-yield elite routes.
        - Funds: Long-term lockup plans (30, 60, 90 days) with higher daily interest.
        - Withdrawals: disbursed directly to bank accounts.
        - Minimum Deposit: ₦2,000 NGN.
        - Minimum Withdrawal: ₦1,000 NGN.
        - Referral Program: Earn ₦1,000 NGN per active referral.
        
        Guidelines:
        - Be professional, helpful, and concise.
        - Use a friendly tone.
        - Do not provide actual financial advice, frame it as sponsoring mobility assets.
        - If asked about "my balance" or "my account", remind them you are an AI assistant and they should check their 'Mine' or 'Home' tabs for real-time data.`,
      });

      const { message, history } = req.body;
      
      const chat = model.startChat({
        history: history || [],
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      res.json({ text: response.text() });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to communicate with AI assistant." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
