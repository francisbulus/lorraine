export interface ExecutionResult {
  success: boolean;
  output: string;
  error: string | null;
  duration: number;
}

const TIMEOUT_MS = 5000;

const BLOCKED_PATTERNS = [
  /\bprocess\b/,
  /\brequire\b/,
  /\bimport\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  /\bglobalThis\b/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\beval\b/,
  /\bFunction\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
];

export function checkSandboxSafety(code: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      const match = code.match(pattern);
      return `Blocked: "${match?.[0]}" is not available in the sandbox`;
    }
  }
  return null;
}

export async function executeCode(code: string): Promise<ExecutionResult> {
  const safetyError = checkSandboxSafety(code);
  if (safetyError) {
    return {
      success: false,
      output: '',
      error: safetyError,
      duration: 0,
    };
  }

  const start = performance.now();

  try {
    const logs: string[] = [];
    const sandbox = {
      console: {
        log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
        error: (...args: unknown[]) => logs.push(`[error] ${args.map(String).join(' ')}`),
        warn: (...args: unknown[]) => logs.push(`[warn] ${args.map(String).join(' ')}`),
      },
      Math,
      JSON,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Map,
      Set,
      Date,
      RegExp,
      Promise,
      setTimeout: undefined,
      setInterval: undefined,
    };

    const keys = Object.keys(sandbox);
    const values = Object.values(sandbox);

    // Wrap in async IIFE so top-level await and return values work.
    const wrappedCode = `
      "use strict";
      return (async () => {
        ${code}
      })();
    `;

    // eslint-disable-next-line no-new-func
    const fn = new (Function.bind.apply(Function, [null, ...keys, wrappedCode] as [null, ...string[]]))();
    const resultPromise = fn(...values);

    const result = await Promise.race([
      resultPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timed out')), TIMEOUT_MS)
      ),
    ]);

    // If the code returned a value and didn't log anything, show the return value.
    if (result !== undefined && logs.length === 0) {
      logs.push(String(result));
    }

    const duration = performance.now() - start;

    return {
      success: true,
      output: logs.join('\n'),
      error: null,
      duration,
    };
  } catch (err) {
    const duration = performance.now() - start;
    return {
      success: false,
      output: '',
      error: err instanceof Error ? err.message : String(err),
      duration,
    };
  }
}
