import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InstallerService } from './installer.service';

@ApiTags('installer')
@Controller('installer')
export class InstallerController {
  constructor(private readonly service: InstallerService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('script')
  script(@Query('platform') platform: 'windows' | 'linux' | 'macos') {
    return { script: this.service.installScript(platform) };
  }
}
