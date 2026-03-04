import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class SignalProcessDto {
  @ApiProperty({
    example: 'SIGTERM',
    enum: ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'],
  })
  @IsString()
  @IsIn(['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'])
  signal!: string;
}
