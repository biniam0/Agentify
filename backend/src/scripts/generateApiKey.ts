/**
 * Generate Service API Key
 * 
 * Usage:
 *   npm run generate-api-key "BarrierX Platform" "logs:read,logs:read:batch" 365
 * 
 * Args:
 *   1. Service name (required)
 *   2. Scopes (comma-separated, default: "logs:read")
 *   3. Expires in days (default: 365)
 */

import crypto from 'crypto';
import prisma from '../config/database';

async function generateApiKey() {
  const serviceName = process.argv[2];
  const scopesArg = process.argv[3] || 'logs:read';
  const expiresInDays = parseInt(process.argv[4] || '365');

  if (!serviceName) {
    console.error('❌ Error: Service name is required');
    console.log('\nUsage:');
    console.log('  npm run generate-api-key "Service Name" "scope1,scope2" days');
    console.log('\nExample:');
    console.log('  npm run generate-api-key "BarrierX Platform" "logs:read,logs:read:batch" 365');
    process.exit(1);
  }

  const scopes = scopesArg.split(',').map(s => s.trim());

  console.log('\n🔐 Generating API Key...\n');

  // Generate cryptographically secure API key
  const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyPrefix = apiKey.substring(0, 12);

  // Find or create service
  let service = await prisma.service.findUnique({
    where: { name: serviceName }
  });

  if (!service) {
    console.log(`📝 Creating new service: ${serviceName}`);
    service = await prisma.service.create({
      data: {
        name: serviceName,
        description: `External service: ${serviceName}`,
        isActive: true,
      }
    });
  } else {
    console.log(`✓ Using existing service: ${serviceName}`);
  }

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Create API key
  const createdKey = await prisma.serviceApiKey.create({
    data: {
      serviceId: service.id,
      name: `${serviceName} - ${new Date().toISOString().split('T')[0]}`,
      keyHash,
      keyPrefix,
      scopes,
      isActive: true,
      expiresAt,
      createdBy: 'admin',
    }
  });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          ✅ API Key Generated Successfully!                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Service:     ${serviceName}`);
  console.log(`Key ID:      ${createdKey.id}`);
  console.log(`Key Prefix:  ${keyPrefix}...`);
  console.log(`Scopes:      ${scopes.join(', ')}`);
  console.log(`Created:     ${createdKey.createdAt.toISOString()}`);
  console.log(`Expires:     ${expiresAt.toISOString()}`);
  console.log(`Status:      Active`);
  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('🔑 API Key (save securely - will not be shown again):');
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log(`   ${apiKey}\n`);
  console.log('─────────────────────────────────────────────────────────────');
  console.log('\n⚠️  IMPORTANT: Store this key securely. It cannot be retrieved.\n');
  console.log('📝 Usage in API requests:');
  console.log('   Header: X-API-Key: ' + apiKey);
  console.log('\n');
}

generateApiKey()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Error generating API key:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

