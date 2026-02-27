import { CanActivate, ExecutionContext } from '@nestjs/common';
import { HostsService } from '../hosts/hosts.service';
export declare class HostTokenGuard implements CanActivate {
    private hosts;
    constructor(hosts: HostsService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
