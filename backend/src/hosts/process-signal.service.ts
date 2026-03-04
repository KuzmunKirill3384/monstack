import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HostsService } from './hosts.service';

const ALLOWED_SIGNALS = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'] as const;
const SIGNAL_TIMEOUT_MS = 5_000;

@Injectable()
export class ProcessSignalService {
  private readonly logger = new Logger(ProcessSignalService.name);

  constructor(private hosts: HostsService) {}

  async sendSignal(hostId: string, pid: number, signal: string): Promise<void> {
    const host = await this.hosts.findOne(hostId);
    if (!host) {
      throw new NotFoundException('Host not found');
    }
    const agentUrl = host.agentUrl ?? undefined;
    if (!agentUrl) {
      throw new BadRequestException('Agent URL not configured for this host');
    }
    const normalized = signal.toUpperCase();
    if (
      !ALLOWED_SIGNALS.includes(normalized as (typeof ALLOWED_SIGNALS)[number])
    ) {
      throw new BadRequestException(
        `Invalid signal. Allowed: ${ALLOWED_SIGNALS.join(', ')}`,
      );
    }
    const secret = process.env.AGENT_COMMAND_SECRET;
    if (!secret) {
      throw new BadRequestException('Agent command secret not configured');
    }
    const base = agentUrl.replace(/\/$/, '');
    const url = `${base}/signal`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SIGNAL_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Secret': secret,
        },
        body: JSON.stringify({ pid, signal: normalized }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new BadRequestException(
          `Agent returned ${res.status}: ${text || res.statusText}`,
        );
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.logger.warn(`Signal to ${url} timed out after ${SIGNAL_TIMEOUT_MS}ms`);
        throw new BadRequestException(
          `Agent did not respond within ${SIGNAL_TIMEOUT_MS}ms`,
        );
      }
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Signal to ${url} failed`, (err as Error).stack);
      throw new BadRequestException(
        `Failed to reach agent: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
