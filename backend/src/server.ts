import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./dynamodb";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "OffchainProducts";

app.use(cors());
app.use(express.json());

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Web3 Express EC2 Backend running" });
});

// Fetch all offchain products
app.get("/api/products", async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    res.json(data.Items || []);
  } catch (error) {
    console.error("DynamoDB Scan Error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Fetch a single product by Blockchain ID
app.get("/api/products/:blockchainId", async (req, res) => {
  try {
    const data = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { blockchainId: req.params.blockchainId },
      })
    );
    if (!data.Item) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(data.Item);
  } catch (error) {
    console.error("DynamoDB Get Error:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Store offchain metadata associated with a Stacks asset
app.post("/api/products", async (req, res) => {
  const { blockchainId, name, ipfsHash, highResImageUrl, owner } = req.body;

  if (!blockchainId) {
    return res.status(400).json({ error: "blockchainId is required" });
  }

  const item = {
    blockchainId,
    name,
    ipfsHash,
    highResImageUrl,
    owner,
    createdAt: new Date().toISOString(),
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
    res.status(201).json({ message: "Offchain data stored successfully", item });
  } catch (error) {
    console.error("DynamoDB Put Error:", error);
    res.status(500).json({ error: "Failed to save product metadata" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
