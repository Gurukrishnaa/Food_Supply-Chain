import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PutCommand, GetCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
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
  const { blockchainId, ...rest } = req.body;

  if (!blockchainId) {
    return res.status(400).json({ error: "blockchainId is required" });
  }

  // Only persist defined fields to avoid writing `undefined` values into DynamoDB.
  const definedRest = Object.fromEntries(
    Object.entries(rest || {}).filter(([, value]) => value !== undefined)
  );

  const item = {
    blockchainId,
    ...definedRest,
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

// Update offchain metadata by Blockchain ID (simple merge + overwrite)
app.put("/api/products/:blockchainId", async (req, res) => {
  const blockchainId = req.params.blockchainId;

  try {
    const existing = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { blockchainId },
      })
    );

    if (!existing.Item) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updates = Object.fromEntries(
      Object.entries(req.body || {}).filter(([key, value]) => key !== "blockchainId" && value !== undefined)
    );

    const merged = {
      ...existing.Item,
      ...updates,
      blockchainId,
      createdAt: existing.Item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: merged,
      })
    );

    res.json({ message: "Offchain data updated successfully", item: merged });
  } catch (error) {
    console.error("DynamoDB Update (Put) Error:", error);
    res.status(500).json({ error: "Failed to update product metadata" });
  }
});

// Delete offchain metadata by Blockchain ID
app.delete("/api/products/:blockchainId", async (req, res) => {
  const blockchainId = req.params.blockchainId;

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { blockchainId },
      })
    );
    res.json({ message: "Offchain data deleted successfully", blockchainId });
  } catch (error) {
    console.error("DynamoDB Delete Error:", error);
    res.status(500).json({ error: "Failed to delete product metadata" });
  }
});

// Back-compat aliases: some frontend/service code refers to "items"
app.get("/api/items", (req, res) => res.redirect(307, "/api/products"));
app.get("/api/items/:blockchainId", (req, res) => res.redirect(307, `/api/products/${req.params.blockchainId}`));
app.post("/api/items", (req, res) => res.redirect(307, "/api/products"));
app.put("/api/items/:blockchainId", (req, res) => res.redirect(307, `/api/products/${req.params.blockchainId}`));
app.delete("/api/items/:blockchainId", (req, res) => res.redirect(307, `/api/products/${req.params.blockchainId}`));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
