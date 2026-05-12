

import type { Policy } from '../exec';

export type ParsedRmCommand = {
  name: 'rm';
  originalCommandArgs: string[];
  options: string[];
  operands: string[];
};

export function getCommand(commandArgs: string[], workspaceDir: string): ParsedRmCommand | null {
  const rmInvocation = extractRmInvocation(commandArgs);
  if (!rmInvocation) {
    return null;
  }

  const rmPlan = parseRmArguments(rmInvocation.argv);
  if (!rmPlan?.shouldIntercept) {
    return null;
  }

  const options: string[] = [];
  const operands: string[] = [];
  let treatAsTarget = false;

  let index = 1;
  while (index < rmInvocation.argv.length) {
    const token = rmInvocation.argv[index];
    if (token === undefined) {
      break;
    }
    if (!treatAsTarget && token === '--') {
      treatAsTarget = true;
      index += 1;
      continue;
    }
    if (!treatAsTarget && token.startsWith('-') && token.length > 1) {
      options.push(token);
      index += 1;
      continue;
    }
    operands.push(token);
    index += 1;
  }

  return {
    name: 'default',
    originalCommandArgs: commandArgs,
    options: options,
    operands: operands,
  };
}

export const policies: Record<string, Policy> = {
  default: {
    fail: true,
  },
};

export function extractRmInvocation(commandArgs: string[]): { index: number, argv: string[] } | null {
  if (commandArgs.length === 0) {
    return null;
  }

  const wrappers = new Set([
    'sudo',
    '/usr/bin/sudo',
    'env',
    '/usr/bin/env',
    'command',
    '/bin/command',
    'nohup',
    '/usr/bin/nohup',
  ]);

  let index = 0;
  while (index < commandArgs.length) {
    const token = commandArgs[index];
    if (!token) {
      break;
    }
    if (token.includes('=') && !token.startsWith('-')) {
      index += 1;
      continue;
    }
    if (wrappers.has(token)) {
      index += 1;
      continue;
    }
    break;
  }

  const commandToken = commandArgs[index];
  if (!commandToken) {
    return null;
  }

  const isRmCommand =
    commandToken === 'rm' ||
    commandToken.endsWith('/rm') ||
    commandToken === 'rm.exe' ||
    commandToken.endsWith('rm.exe');

  if (!isRmCommand) {
    return null;
  }

  return { index, argv: commandArgs.slice(index) };
}

export function parseRmArguments(argv: string[]): { targets: string[]; force: boolean; shouldIntercept: boolean } | null {
  if (argv.length <= 1) {
    return null;
  }
  const targets: string[] = [];
  let force = false;
  let treatAsTarget = false;

  let index = 1;
  while (index < argv.length) {
    const token = argv[index];
    if (token === undefined) {
      break;
    }
    if (!treatAsTarget && token === '--') {
      treatAsTarget = true;
      index += 1;
      continue;
    }
    if (!treatAsTarget && token.startsWith('-') && token.length > 1) {
      if (token.includes('f')) {
        force = true;
      }
      if (token.includes('i') || token === '--interactive') {
        return null;
      }
      if (token === '--help' || token === '--version') {
        return null;
      }
      index += 1;
      continue;
    }
    targets.push(token);
    index += 1;
  }

  const firstTarget = targets[0];
  if (firstTarget === undefined) {
    return null;
  }

  return { targets, force, shouldIntercept: true };
}

