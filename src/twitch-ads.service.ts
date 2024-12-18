import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfigType } from "./config-loader";
import { RefreshingAuthProvider, StaticAuthProvider } from "@twurple/auth";
import { ApiClient, CommercialLength } from "@twurple/api";
import { IngameService } from "./ingame.service";
import * as fn from 'date-fns';
import { Interval } from "@nestjs/schedule";

@Injectable()
export class TwitchAdsService {
  twitchApi: ApiClient;
  twitchUserId: string;
  currentIngameStatus = false;



  constructor(private readonly configService: ConfigService<AppConfigType>, private logger: Logger) {
    const twitchConfig = this.configService.getOrThrow<AppConfigType['twitch']>('twitch')

    const refreshToken = twitchConfig.refreshToken;
    const accessToken = twitchConfig.accessToken;
    // Todo: Register Twitch app etc....
    const auth = new StaticAuthProvider(twitchConfig.clientId, accessToken);
    this.twitchApi = new ApiClient({ authProvider: auth });
    this.twitchApi.getTokenInfo().then(i => this.twitchUserId = i.userId);
  }

  async getAds() {
    const adSchedule = await this.twitchApi.channels.getAdSchedule(this.twitchUserId)
    return adSchedule;
  }

  async snoozeAd() {
    return await this.twitchApi.channels.snoozeNextAd(this.twitchUserId);
  }

  async runAd(length: CommercialLength = 30) {
    return await this.twitchApi.channels.startChannelCommercial(this.twitchUserId, length)
  }

}


const BUFFER_INGAME_TO_SCHEDULED_ADS_IN_MINUTES = 3;
@Injectable()
export class TwitchAdSchedulerService {

  isPaused = false;
  isIngame = false;

  constructor(private readonly twitchAdsService: TwitchAdsService, private readonly riot: IngameService, private logger: Logger) {
  }

  // Check all 15 seconds if we are ingame or not and schedule ads
  @Interval(1000 * 5)
  async runAdIfIngame() {
    this.logger.log("Checking ingame status")
    if (this.isPaused) {
      return;
    }
    const ingameData = await this.riot.getIngameStatus();
    const adSchedule = await this.twitchAdsService.getAds();
    this.logger.log("Ad schedule", JSON.stringify(adSchedule));
    this.logger.log("Ingame data", JSON.stringify(ingameData));
    let newIngameStatus = false;
    if (ingameData) {
      newIngameStatus = true;
      this.logger.log("Ingame status detected - checking if we should snooze Ads")
      const dateAfterAdWouldBeOk = fn.addMinutes(new Date(), BUFFER_INGAME_TO_SCHEDULED_ADS_IN_MINUTES);
      // if the next ad is scheduled before the buffer time, snooze it
      if (fn.isBefore(adSchedule.nextAdDate, dateAfterAdWouldBeOk)) {
        await this.twitchAdsService.snoozeAd();
      }
    }
    const state = this.calculateState(newIngameStatus);

    // If we switch from ingame to not ingame, run an ad to fill up the buffer for preroll
    if (state === States.IngameToNotIngame) {
      const preroll = adSchedule.prerollFreeTime
      const amountNeeded = calculateHowMuchPrerollNeeded(preroll);

      setTimeout(async () => {

        await this.twitchAdsService.runAd(amountNeeded);
      }, 1000 * 15);
      // Run ad to get rid of automatic ads 
    }
    this.isIngame = newIngameStatus;
  }

  calculateState(newIngameStatus: boolean): States {
    if (this.isIngame === true && newIngameStatus === false) {
      return States.IngameToNotIngame;
    } else if (this.isIngame === false && newIngameStatus === true) {
      return States.NotIngameToIngame;
    } else if (this.isIngame === true && newIngameStatus === true) {
      return States.IngameToIngame;
    } else if (this.isIngame === false && newIngameStatus === false) {
      return States.NotIngameToNotIngame;
    }
  }

  pauseInterval() {
    this.isPaused = true;
  }
  unpauseInterval() {
    this.isPaused = false;
  }
}

const calculateHowMuchPrerollNeeded = (currentPrerollFreeSeconds: number) => {
  const oneHour = 60 * 60;
  const tenMinutes = 10 * 60;

  const remainderToFill = oneHour - currentPrerollFreeSeconds;
  // Because we can only set it up by 10min intervals, we have to round up
  const adAmount = Math.ceil(remainderToFill / tenMinutes);
  return adAmount * 30 as CommercialLength;
}

const calculatePrerollFreeTime = (seconds: number) => {
  const oneHour = 60 * 60;
  const secodsPer30Seconds = 10 * 60; // 10 minutes

  // Twitch disables preroll ads for 10mins for each 30 seconds of ad
  const adAmount = seconds / 30;
  const prerollFreeTime = adAmount * secodsPer30Seconds;
  return Math.min(prerollFreeTime, oneHour);
}

enum States {
  IngameToNotIngame,
  NotIngameToIngame,
  IngameToIngame,
  NotIngameToNotIngame,
}


