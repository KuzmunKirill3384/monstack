import { HostsService } from './hosts.service';
export declare class ProcessSignalService {
    private hosts;
    constructor(hosts: HostsService);
    sendSignal(hostId: string, pid: number, signal: string): Promise<void>;
}
