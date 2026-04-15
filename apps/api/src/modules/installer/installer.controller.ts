import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { InstallerService } from './installer.service';

@ApiTags('installer')
@Controller('installer')
export class InstallerController {
  constructor(private readonly service: InstallerService) {}

  @Get()
  @ApiOperation({ summary: 'List available agent installer artifacts (multi-platform)' })
  list() {
    return this.service.list();
  }

  @Get('script')
  @ApiOperation({ summary: 'Generate a tokenized install script for the requested platform' })
  async script(
    @Query('platform') platform: 'windows' | 'linux' | 'macos',
    @Query('token') token: string,
    @Query('server') server: string | undefined,
  ) {
    return { script: await this.service.installScript(platform, token, server) };
  }

  @Get('install.sh')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @ApiOperation({
    summary: 'Plain-text install script (curl-able). Use ?token=...&platform=linux',
  })
  async curlable(
    @Query('platform') platform: 'windows' | 'linux' | 'macos' = 'linux',
    @Query('token') token: string = '',
    @Query('server') server: string | undefined,
    @Res() res: Response,
  ) {
    if (!token) {
      res.status(400).send('token query parameter is required');
      return;
    }
    const script = await this.service.installScript(platform, token, server);
    res.send(script);
  }
}
