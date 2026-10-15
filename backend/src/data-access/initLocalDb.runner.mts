/**
 * Entrypoint wrapper for `db:init`.
 *
 * Sets local DynamoDB env vars BEFORE dynamoClient is imported,
 * then dynamically imports initLocalDb so the client is constructed
 * with the local endpoint rather than real AWS credentials.
 *
 * Uses top-level await (requires ESM — compiled to .mjs via .mts extension).
 */

// These must be set before any module that constructs the DynamoDB client loads.
if (!process.env.DYNAMODB_ENDPOINT && !process.env.AWS_ENDPOINT_URL) {
  process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';
}
if (!process.env.ZONES_TABLE_NAME) {
  process.env.ZONES_TABLE_NAME = 'ecotwin-zones-dev';
}

// Dynamic import defers module evaluation until AFTER the env vars above are set.
const { initLocalDb } = await import('./initLocalDb.js');

await initLocalDb();
console.log('\n🎉 Local DynamoDB is ready!');
console.log('👉 Open http://localhost:8001 in your browser to view and edit records in dynamodb-admin.');
