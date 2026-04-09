import fs from 'fs';
import path from 'path';
import { UniverseConfigSchema, UniverseEntry } from './types';

/**
 * Loads and validates the universe config from config/macro-engine/universe.json.
 * Validated at module load time — throws at startup if config is invalid.
 * Ingest scripts must import from this module; no hardcoded ticker arrays elsewhere.
 */
const configPath = path.join(process.cwd(), 'config', 'macro-engine', 'universe.json');
const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const config = UniverseConfigSchema.parse(raw);

export function getUniverse(): UniverseEntry[] {
  return config.universe;
}

export function getByType(type: 'etf' | 'equity'): UniverseEntry[] {
  return config.universe.filter(e => e.type === type);
}

export function getByCountry(iso2: string): UniverseEntry[] {
  return config.universe.filter(e => e.country === iso2.toUpperCase());
}

export function getCountries(): string[] {
  const countries = config.universe
    .map(e => e.country)
    .filter((c): c is string => c !== null);
  return [...new Set(countries)];
}
