import { Logger, Module, Scope } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { loadConfig } from './config-loader';
import { INQUIRER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TwitchAdSchedulerService, TwitchAdsService } from './twitch-ads.service';
import { IngameService } from './ingame.service';

// Generate Token via https://twitchtokengenerator.com/quick/tgch9MjSQd

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    load: [loadConfig]
  }), ScheduleModule.forRoot({}),


  ],
  controllers: [AppController],
  providers: [
    AppService,
    TwitchAdsService, TwitchAdSchedulerService, IngameService,

    {
      provide: Logger,
      scope: Scope.TRANSIENT,
      // Use injection to inject name of the calling class
      useFactory: (callingClass: object) => {
        return new Logger(callingClass.constructor.name);
      },
      // Inject the name of the calling class
      inject: [INQUIRER],

    }

  ],
})
export class AppModule { }
