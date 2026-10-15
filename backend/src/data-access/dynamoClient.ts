import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const customEndpoint = process.env.DYNAMODB_ENDPOINT || process.env.AWS_ENDPOINT_URL;

const clientConfig: DynamoDBClientConfig = {
  region,
  ...(customEndpoint
    ? {
        endpoint: customEndpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
        },
      }
    : {}),
};

export const rawDynamoClient = new DynamoDBClient(clientConfig);

export const dynamoDbClient = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export const getZonesTableName = (): string => {
  const table = process.env.ZONES_TABLE_NAME || process.env.DYNAMODB_ZONES_TABLE;
  if (!table) {
    throw new Error('DynamoDB Zones table name is not configured in environment variables.');
  }
  return table;
};
