const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');
const ALLOW_FLAG = process.env.ALLOW_DESTRUCTIVE_PRISMA === '1';

const destructiveChecks = [
  {
    pattern: /\bDROP\s+TABLE\b/i,
    message: 'drops a table',
  },
  {
    pattern: /\bDROP\s+COLUMN\b/i,
    message: 'drops a column',
  },
  {
    pattern: /\bTRUNCATE\b/i,
    message: 'truncates data',
  },
  {
    pattern: /\bDELETE\s+FROM\b/i,
    message: 'deletes rows',
  },
  {
    pattern: /\bALTER\s+TABLE\b[\s\S]*\bRENAME\s+(?:COLUMN|TO)\b/i,
    message: 'renames table or column structure',
  },
  {
    pattern: /\bALTER\s+TABLE\b[\s\S]*\bALTER\s+COLUMN\b[\s\S]*\bTYPE\b/i,
    message: 'changes a column type',
  },
];

function getMigrationFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name, 'migration.sql'))
    .filter((file) => fs.existsSync(file));
}

function stripSqlComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

function main() {
  const migrationFiles = getMigrationFiles(MIGRATIONS_DIR);

  if (migrationFiles.length === 0) {
    console.log('No Prisma migration files found.');
    return;
  }

  const violations = [];

  for (const file of migrationFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const normalized = stripSqlComments(content);

    for (const check of destructiveChecks) {
      if (check.pattern.test(normalized)) {
        violations.push({
          file,
          message: check.message,
        });
      }
    }
  }

  if (violations.length === 0) {
    console.log('Prisma migration safety check passed: additive-only patterns detected.');
    return;
  }

  console.error('Prisma migration safety check failed.');
  console.error('The following migration files contain destructive or risky SQL patterns:');

  for (const violation of violations) {
    console.error(`- ${path.relative(process.cwd(), violation.file)}: ${violation.message}`);
  }

  if (ALLOW_FLAG) {
    console.warn('ALLOW_DESTRUCTIVE_PRISMA=1 detected, continuing despite violations.');
    return;
  }

  console.error('');
  console.error('This repo is configured to prefer additive-only Prisma migrations.');
  console.error('If you intentionally need a destructive migration, rerun with ALLOW_DESTRUCTIVE_PRISMA=1.');
  process.exit(1);
}

main();
