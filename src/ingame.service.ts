import { ConfigService } from "@nestjs/config"
import { AppConfigType } from "./config-loader"
import * as tw from 'twisted'
import { RegionGroups, Regions, regionToRegionGroup } from "twisted/dist/constants";
import { AccountDto } from "twisted/dist/models-dto/account/account.dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class IngameService {
  lolService: tw.LolApi
  summonersToCheck = this.configService.getOrThrow<AppConfigType['summoners']>('summoners');
  summonerToDataMap = new Map<string, AccountDto>();
  riotService: tw.RiotApi;

  constructor(private readonly configService: ConfigService<AppConfigType>) {
    const riotApiKey = this.configService.getOrThrow<string>('riotApiKey');

    this.lolService = new tw.LolApi({
      key: riotApiKey,
    })

    this.riotService = new tw.RiotApi({
      key: riotApiKey,
    })

  }

  async getIngameStatus() {
    for (const summoner of this.summonersToCheck) {
      const summonerData = await this.getOrAddSummonerData(summoner.name, summoner.tag, summoner.region)
      const ingameData = await this.lolService.SpectatorV5.activeGame(summonerData.puuid, summoner.region.toUpperCase() as Regions)
      if (ingameData) {
        return {
          summonerName: summoner.name,
          region: summoner.region,
          ingameData
        }
      }
    }
    return null;
  }

  async getOrAddSummonerData(summonerName: string, tag: string, region: string) {
    const mapKey = this.buildMapKey(summonerName, tag, region)
    const summonerData = this.summonerToDataMap.get(mapKey)
    if (summonerData) {
      return summonerData
    }

    const regionGroup = regionToRegionGroup(region.toUpperCase() as Regions)
    const liveSummonerData = await this.riotService.Account.getByRiotId(summonerName, tag, regionGroup)
    this.summonerToDataMap.set(mapKey, liveSummonerData.response)
    return liveSummonerData.response;
  }

  buildMapKey(summonerName: string, tag: string, region: string) {
    return `${summonerName}:${tag}:${region}`
  }


}
