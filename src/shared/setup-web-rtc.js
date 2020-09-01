import { KinesisVideo, KinesisVideoSignalingChannels } from 'aws-sdk';

export const getKinesisVideo = (accessKeyId, secretAccessKey, region) => {
  return new KinesisVideo({
    region,
    accessKeyId,
    secretAccessKey,
  });
};

export const getChannelARN = async (kv, ChannelName) => {
  let sigChanResp = null;
  let createChanResp = null;
  let channelARN = null;
  try {
    // NOTE: this will throw a 404 error (from the amazon API) in the console if the signaling channel doesn't exist - this is unavoidable - may want to look at the implementation of this in the future...
    sigChanResp = await kv.describeSignalingChannel({ ChannelName }).promise();
  } catch (error) {
    // signaling channel doesn't exist, set it...
    createChanResp = await kv.createSignalingChannel({ ChannelName }).promise();
    console.log(
      'create signaling channel response: ',
      createChanResp.ChannelARN
    );
  } finally {
    channelARN = sigChanResp
      ? sigChanResp.ChannelInfo.ChannelARN
      : createChanResp.ChannelARN;
  }
  return channelARN;
};

export const getEndpoints = async (kv, ChannelARN, Role) => {
  const getEndpoints = await kv
    .getSignalingChannelEndpoint({
      ChannelARN,
      SingleMasterChannelEndpointConfiguration: {
        Protocols: ['WSS', 'HTTPS'],
        Role,
      },
    })
    .promise();

  // sort out the endpoints by protocol - WSS and HTTPS...
  // simplify???
  return getEndpoints.ResourceEndpointList.reduce((eps, ep) => {
    eps[ep.Protocol] = ep.ResourceEndpoint;
    return eps;
  }, {});
};

export const getIceServers = async (
  endpoint,
  ChannelARN,
  accessKeyId,
  secretAccessKey,
  region
) => {
  // get signaling channels...
  // client is just used for getting ICE servers, not for actual signaling
  const signalingChannels = new KinesisVideoSignalingChannels({
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
  });

  // get ice servers...
  const getIceServers = await signalingChannels
    .getIceServerConfig({ ChannelARN })
    .promise();

  // ice server list - first one is STUN, and then add TURN servers...
  const iceServers = [
    { urls: `stun:stun.kinesisvideo.${region}.amazonaws.com:443` },
  ];
  getIceServers.IceServerList.forEach((iceServer) =>
    iceServers.push({
      urls: iceServer.Uris,
      username: iceServer.Username,
      credential: iceServer.Password,
    })
  );
  return iceServers;
};
