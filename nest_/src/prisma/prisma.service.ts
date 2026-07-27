import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.syncAllSequences();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Automatically resets all PostgreSQL auto-increment sequences (id_seq)
   * to match the current MAX(id) in each table, preventing 'Unique constraint failed on id' errors.
   */
  async syncAllSequences() {
    try {
      const sql = `
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT table_name, column_name, pg_get_serial_sequence('"' || table_name || '"', column_name) AS seq_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND column_default LIKE 'nextval%'
            ) LOOP
                IF r.seq_name IS NOT NULL THEN
                    EXECUTE 'SELECT setval(' || quote_literal(r.seq_name) || ', COALESCE((SELECT MAX("' || r.column_name || '") FROM "' || r.table_name || '"), 1));';
                END IF;
            END LOOP;
        END $$;
      `;
      await this.$executeRawUnsafe(sql);
      this.logger.log('PostgreSQL auto-increment sequences synchronized successfully.');
    } catch (error) {
      this.logger.warn(`Failed to auto-sync database sequences: ${error?.message || error}`);
    }
  }
}



