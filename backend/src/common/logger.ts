import { LoggerService } from '@nestjs/common';

function format(level: string, message: string, context?: string) {
  return JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg: message,
    ...(context && { context }),
  });
}

export class JsonLogger implements LoggerService {
  log(message: string, context?: string) {
    process.stdout.write(format('info', message, context) + '\n');
  }

  error(message: string, trace?: string, context?: string) {
    process.stderr.write(format('error', message, context) + '\n');
    if (trace) process.stderr.write(format('error', trace, 'trace') + '\n');
  }

  warn(message: string, context?: string) {
    process.stdout.write(format('warn', message, context) + '\n');
  }

  debug(message: string, context?: string) {
    process.stdout.write(format('debug', message, context) + '\n');
  }

  verbose(message: string, context?: string) {
    process.stdout.write(format('verbose', message, context) + '\n');
  }
}
