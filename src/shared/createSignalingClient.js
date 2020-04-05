import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';

import { channelARN, accessKeyId, secretAccessKey, region } from '../config';

export default (wss, role = 'MASTER') => ({
  signalingClient: new SignalingClient({
    channelARN,
    channelEndpoint: wss,
    role: role,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken: formValues.sessionToken,
    },
  }),
  peerConnectionByClientId: {},
  dataChannelByClientId: {},
  localStream: null,
  remoteStreams: [],
  peerConnectionStatsInterval: null,
});
