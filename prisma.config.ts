import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig } from '@prisma/orm-postgres/config';
import pgvector from '@prisma/orm-extension-pgvector/control';

export default definePrismaConfig({
  orm: defineConfig({
    contract: './src/prisma/contract.prisma',
    extensions: [pgvector],
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
});
