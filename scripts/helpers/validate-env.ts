export function requireEnv(keys: string[]) {
  const missing: string[] = [];
  for (const k of keys) {
    const v = process.env[k];
    if (!v || v.trim() === '') missing.push(k);
  }
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function getEnvOrArg(name: string, flag?: string): string | undefined {
  const fromEnv = process.env[name];
  if (fromEnv && fromEnv.trim() !== '') return fromEnv;
  if (flag) {
    const idx = process.argv.indexOf(flag);
    if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  }
  return undefined;
}
