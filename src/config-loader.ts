export const loadConfig = () => {
  return {
    summoners: buildSummonerNames(),
    riotApiKey: process.env.RIOT_API_KEY ?? '',
    twitch: {
      broadcasterName: process.env.TWITCH_CHANNEL_NAME ?? '',
      clientId: process.env.TWITCH_CLIENT_ID ?? '',
      clientSecret: process.env.TWITCH_CLIENT_SECRET ?? '',
      accessToken: process.env.TWITCH_ACCESS_TOKEN ?? '',
      refreshToken: process.env.TWITCH_REFRESH_TOKEN ?? '',
    }
  }
}

export type AppConfigType = ReturnType<typeof loadConfig>;

const buildSummonerNames = () => {
  const names = process.env.SUMMONER_NAMES ?? '';
  console.log('names', names);
  const summonerNames = names.split(',') ?? [] as string[];
  return summonerNames.filter(Boolean).map((summoner) => {
    const [nameTag, region] = summoner.split(':');

    const [name, tag] = nameTag.split('#')[1];
    return {
      name,
      region,
      tag
    };
  });


}

type Summoner = {
  name: string;
  region: string;
  tag: string;
}
