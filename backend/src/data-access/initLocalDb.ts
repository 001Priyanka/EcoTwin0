import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { rawDynamoClient } from './dynamoClient.js';
import { seedZones } from './seedZones.js';

/**
 * Initializes local DynamoDB table for development and seeds baseline records.
 * Checks whether the target table exists. If absent, creates the table with
 * the schema matching AWS SAM template.yaml (partition key: zoneId, billing: PAY_PER_REQUEST).
 */
export async function initLocalDb(): Promise<void> {
  const tableName = process.env.ZONES_TABLE_NAME || 'ecotwin-zones-dev';
  console.log(`[Local DB Init] Checking status of DynamoDB table "${tableName}"...`);

  let tableExists = false;
  try {
    const describeRes = await rawDynamoClient.send(
      new DescribeTableCommand({ TableName: tableName })
    );
    if (describeRes.Table?.TableStatus) {
      tableExists = true;
      console.log(`[Local DB Init] Table "${tableName}" already exists (status: ${describeRes.Table.TableStatus}).`);
    }
  } catch (error) {
    if (
      error instanceof ResourceNotFoundException ||
      (error as { name?: string }).name === 'ResourceNotFoundException'
    ) {
      tableExists = false;
    } else {
      console.error(`[Local DB Init] Error checking table:`, error);
      throw error;
    }
  }

  if (!tableExists) {
    console.log(`[Local DB Init] Creating table "${tableName}"...`);
    await rawDynamoClient.send(
      new CreateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
          {
            AttributeName: 'zoneId',
            AttributeType: 'S',
          },
        ],
        KeySchema: [
          {
            AttributeName: 'zoneId',
            KeyType: 'HASH',
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
        SSESpecification: {
          Enabled: true,
        },
      })
    );
    console.log(`[Local DB Init] Table "${tableName}" created successfully.`);
  }

  // Seed baseline data
  console.log(`[Local DB Init] Seeding baseline zones into "${tableName}"...`);
  await seedZones({ tableName });
  console.log(`[Local DB Init] Complete! You can now view and edit items locally.`);
}

