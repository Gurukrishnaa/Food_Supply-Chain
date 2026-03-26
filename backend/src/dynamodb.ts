import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";

dotenv.config();

// Create DynamoDB client (it uses default AWS credentials from environment or ~/.aws/credentials)
// The region must be set, e.g. AWS_REGION=us-east-1 in .env
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  // If working locally with dynalite or dynamodb-local, you can pass endpoint:
  // endpoint: process.env.DYNAMODB_ENDPOINT
});

// Create DocumentClient for easier unmarshalling / marshalling of JS objects
export const docClient = DynamoDBDocumentClient.from(client);
