import { z, ZodFirstPartyTypeKind, type ZodTypeAny } from 'zod';

export interface JsonSchema {
  type?: string;
  description?: string;
  enum?: readonly string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: JsonSchema;
  minimum?: number;
  maximum?: number;
}

/**
 * Converts the zod subset used by consigliere tools into flat JSON Schema. Small local models follow
 * simple schemas far more reliably, so there are no $refs or anyOf branches.
 */
export function toJsonSchema(schema: ZodTypeAny): JsonSchema {
  const def = schema._def;
  const withDescription = (inner: JsonSchema): JsonSchema =>
    schema.description ? { ...inner, description: schema.description } : inner;

  switch (def.typeName) {
    case ZodFirstPartyTypeKind.ZodObject: {
      const shape = (schema as z.AnyZodObject).shape as Record<string, ZodTypeAny>;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = toJsonSchema(value);
        if (!value.isOptional()) required.push(key);
      }
      return withDescription({ type: 'object', properties, ...(required.length ? { required } : {}) });
    }
    case ZodFirstPartyTypeKind.ZodString:
      return withDescription({ type: 'string' });
    case ZodFirstPartyTypeKind.ZodNumber: {
      const out: JsonSchema = { type: def.checks?.some((c: { kind: string }) => c.kind === 'int') ? 'integer' : 'number' };
      for (const check of def.checks ?? []) {
        if (check.kind === 'min') out.minimum = check.value;
        if (check.kind === 'max') out.maximum = check.value;
      }
      return withDescription(out);
    }
    case ZodFirstPartyTypeKind.ZodBoolean:
      return withDescription({ type: 'boolean' });
    case ZodFirstPartyTypeKind.ZodEnum:
      return withDescription({ type: 'string', enum: def.values });
    case ZodFirstPartyTypeKind.ZodArray:
      return withDescription({ type: 'array', items: toJsonSchema(def.type) });
    case ZodFirstPartyTypeKind.ZodRecord:
      return withDescription({ type: 'object', additionalProperties: toJsonSchema(def.valueType) });
    case ZodFirstPartyTypeKind.ZodOptional:
    case ZodFirstPartyTypeKind.ZodNullable:
      return withDescription(toJsonSchema(def.innerType));
    case ZodFirstPartyTypeKind.ZodDefault: {
      const inner = toJsonSchema(def.innerType);
      const description = [schema.description ?? inner.description, `Default: ${JSON.stringify(def.defaultValue())}.`]
        .filter(Boolean)
        .join(' ');
      return { ...inner, description };
    }
    case ZodFirstPartyTypeKind.ZodEffects:
      return withDescription(toJsonSchema(def.schema));
    case ZodFirstPartyTypeKind.ZodAny:
      return withDescription({});
    default:
      throw new Error(`Unsupported schema type for consigliere tool: ${def.typeName}`);
  }
}

const emptyToUndefined = (v: unknown) => (v === null || v === '' ? undefined : v);

function parseJsonString(v: unknown) {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

/** Small models sometimes send null/"" for omitted optionals, numbers as strings, or objects as JSON strings. */
export const lenient = {
  optional: <T extends ZodTypeAny>(s: T) => z.preprocess(emptyToUndefined, s.optional()),
  number: (inner: z.ZodNumber = z.number()) =>
    z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), inner),
  tickers: () =>
    z.preprocess((v) => {
      if (typeof v !== 'string') return v;
      const parsed = parseJsonString(v);
      return Array.isArray(parsed) ? parsed : v.split(/[\s,]+/).filter(Boolean);
    }, z.array(z.string()).min(1)),
  record: <T extends ZodTypeAny>(value: T) => z.preprocess(parseJsonString, z.record(value)),
  array: <T extends ZodTypeAny>(item: T) => z.preprocess(parseJsonString, z.array(item)),
};

export function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((issue) => `${issue.path.join('.') || 'arguments'}: ${issue.message}`)
    .join('; ');
}
