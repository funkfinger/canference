export default async function fetchTURNServers({
  kvsChannelsClient,
  channelARN,
  region,
}) {
  const getIceServerConfigResponse = await kvsChannelsClient
    .getIceServerConfig({ ChannelARN: channelARN })
    .promise();

  const iceServers = [
    { urls: `stun:stun.kinesisvideo.${region}.amazonaws.com:443` },
  ];
  getIceServerConfigResponse.IceServerList.forEach((iceServer) =>
    iceServers.push({
      urls: iceServer.Uris,
      username: iceServer.Username,
      credential: iceServer.Password,
    })
  );

  return iceServers;
}
