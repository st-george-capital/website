import { WRDS_DATE_CANDIDATES, WRDS_DEFAULT_SCHEMA } from '@/lib/trade-radar/constants';

type PgClient = {
  connect: () => Promise<void>;
  end: () => Promise<void>;
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

const { Client } = require('pg') as { Client: new (config: Record<string, unknown>) => PgClient };

function sanitizeIdentifier(identifier: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return identifier;
}

export class WrdsClient {
  private readonly client: PgClient;
  private readonly columnCache = new Map<string, string[]>();

  constructor() {
    const host = process.env.WRDS_HOST;
    const user = process.env.WRDS_USER;
    const password = process.env.WRDS_PASSWORD;
    const database = process.env.WRDS_DATABASE;

    if (!host || !user || !password || !database) {
      throw new Error('Missing WRDS connection env vars. Set WRDS_HOST, WRDS_USER, WRDS_PASSWORD, and WRDS_DATABASE.');
    }

    this.client = new Client({
      host,
      user,
      password,
      database,
      port: Number(process.env.WRDS_PORT || 9737),
      ssl: process.env.WRDS_SSL === '0' ? false : { rejectUnauthorized: false },
    });
  }

  async connect() {
    await this.client.connect();
  }

  async close() {
    await this.client.end();
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.client.query<T>(sql, params);
  }

  async getColumns(table: string, schema = WRDS_DEFAULT_SCHEMA): Promise<string[]> {
    const key = `${schema}.${table}`;
    if (this.columnCache.has(key)) return this.columnCache.get(key)!;

    const result = await this.query<{ column_name: string }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `,
      [schema, table],
    );

    const columns = result.rows.map((row) => row.column_name);
    this.columnCache.set(key, columns);
    return columns;
  }

  pickColumn(columns: string[], candidates: string[]): string | null {
    const lowered = new Map(columns.map((column) => [column.toLowerCase(), column]));
    for (const candidate of candidates) {
      const match = lowered.get(candidate.toLowerCase());
      if (match) return match;
    }
    return null;
  }

  async fetchTradeRows(args: {
    table: string;
    schema?: string;
    startDate: Date;
    endDate: Date;
    limit?: number | null;
  }) {
    const schema = sanitizeIdentifier(args.schema ?? WRDS_DEFAULT_SCHEMA);
    const table = sanitizeIdentifier(args.table);
    const columns = await this.getColumns(table, schema);
    const dateColumn = this.pickColumn(columns, WRDS_DATE_CANDIDATES);
    if (!dateColumn) {
      throw new Error(`No shipment date column found for ${schema}.${table}. Override schema or extend candidate list.`);
    }

    const limitClause = args.limit ? ` LIMIT ${Math.max(1, Math.floor(args.limit))}` : '';
    const sql = `
      SELECT *
      FROM "${schema}"."${table}"
      WHERE "${sanitizeIdentifier(dateColumn)}" >= $1
        AND "${sanitizeIdentifier(dateColumn)}" < $2
      ORDER BY "${sanitizeIdentifier(dateColumn)}" DESC${limitClause}
    `;

    const result = await this.query<Record<string, unknown>>(sql, [args.startDate, args.endDate]);
    return { rows: result.rows, columns, dateColumn };
  }

  async fetchReferenceRows(table: string, schema = WRDS_DEFAULT_SCHEMA) {
    const safeSchema = sanitizeIdentifier(schema);
    const safeTable = sanitizeIdentifier(table);
    const result = await this.query<Record<string, unknown>>(`SELECT * FROM "${safeSchema}"."${safeTable}"`);
    return result.rows;
  }
}

export async function withWrdsClient<T>(fn: (client: WrdsClient) => Promise<T>) {
  const client = new WrdsClient();
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}
