import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HostsService } from './hosts.service';

const ALLOWED_SIGNALS = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'] as const;

@Injectable()
export class ProcessSignalService {
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
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Secret': secret,
      },
      body: JSON.stringify({ pid, signal: normalized }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(
        `Agent returned ${res.status}: ${text || res.statusText}`,
      );
    }
  }
}
