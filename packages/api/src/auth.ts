import type { PostConfirmationTriggerEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const FREE_PLAN_MONTHLY_CALLS = 20;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function postConfirmation(event: PostConfirmationTriggerEvent) {
  const now = new Date().toISOString();
  const tenantId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email || "";

  await ddb.send(
    new PutCommand({
      TableName: (Resource as unknown as { VoiceBookingTable: { name: string } }).VoiceBookingTable.name,
      Item: {
        pk: `TENANT#${tenantId}`,
        sk: "ACCOUNT",
        tenantId,
        email,
        plan: "free",
        monthlyCallLimit: FREE_PLAN_MONTHLY_CALLS,
        pendingCalls: 0,
        consumedCalls: 0,
        totalCallSeconds: 0,
        transcriptCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  ).catch((error: unknown) => {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") return;
    throw error;
  });

  return event;
}
