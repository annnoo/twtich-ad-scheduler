import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { TwitchAdSchedulerService } from './twitch-ads.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private adsManager: TwitchAdSchedulerService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('pause-SUPER_SECRET_STRING')
  pauseAds(): string {
    this.adsManager.pauseInterval();
    return "Paused"
  }


  @Get('unpause-SUPER_SECRET_STRING')
  unpauseAds(): string {
    this.adsManager.unpauseInterval();
    return "Unpaused"
  }
}
