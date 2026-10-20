#!/usr/bin/env node
import { validateRuntimeConfig } from '../lib/auth/runtime_config.mjs';

try {
  validateRuntimeConfig(process.env);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Invalid runtime configuration';
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
