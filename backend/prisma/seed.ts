import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT ?? 'salt';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const DEFAULT_HOST_ID = 'a0000000-0000-0000-0000-000000000001';
const DEFAULT_HOST_TOKEN = 'local-dev-token';

async function main() {
  const email = 'demo@test.com';
  const password = 'demo';
  const passwordHash = hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      role: 'admin',
    },
  });

  const hostTokenHash = crypto.createHash('sha256').update(DEFAULT_HOST_TOKEN).digest('hex');
  const agentUrl = process.env.DEFAULT_AGENT_URL ?? 'http://agent:9090';
  await prisma.host.upsert({
    where: { id: DEFAULT_HOST_ID },
    update: { tokenHash: hostTokenHash, name: 'local', agentUrl },
    create: {
      id: DEFAULT_HOST_ID,
      name: 'local',
      tokenHash: hostTokenHash,
      agentUrl,
    },
  });

  console.log('Seed done: user demo@test.com, host "local" (token: local-dev-token)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
