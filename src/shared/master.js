import AWS, { KinesisVideoSignalingChannels } from 'aws-sdk';
import {
  SignalingClient,
  RTCPeerConnection,
} from 'amazon-kinesis-video-streams-webrtc';

import { channelARN, accessKeyId, secretAccessKey, region } from '../config';
// to destructure config...
const ChannelARN = channelARN;

const master = {};

export default async (videoRef) => {
  // creates the video client...
  const videoClient = new AWS.KinesisVideo({
    region,
    accessKeyId,
    secretAccessKey,
  });

  // should probably create the signaling channel here..
  // using describeSignalingChannel and getting the channel ARN...

  // makes the call to aws to get the endpoints - returns a promise...
  const getEndpoints = await videoClient
    .getSignalingChannelEndpoint({
      ChannelARN,
      SingleMasterChannelEndpointConfiguration: {
        Protocols: ['WSS', 'HTTPS'],
        Role: 'MASTER',
      },
    })
    .promise();

  // sort out the endpoints by protocol - WSS and HTTPS...
  // simplify???
  const endpointsByProtocol = getEndpoints.ResourceEndpointList.reduce(
    (eps, ep) => {
      eps[ep.Protocol] = ep.ResourceEndpoint;
      return eps;
    },
    {}
  );

  // create master signalingClient...
  const signalingClient = new SignalingClient({
    channelARN,
    channelEndpoint: endpointsByProtocol.WSS,
    role: 'MASTER',
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  master.signalingClient = signalingClient;
  console.log('signalingClient: ', signalingClient);

  // get signaling channels...
  // client is just used for getting ICE servers, not for actual signaling
  const signalingChannels = new KinesisVideoSignalingChannels({
    region,
    accessKeyId,
    secretAccessKey,
    endpoint: endpointsByProtocol.HTTPS,
  });

  // get ice servers...
  const getIceServers = await signalingChannels
    .getIceServerConfig({
      ChannelARN,
    })
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

  console.log('[MASTER] ICE servers: ', iceServers);

  // get a stream from the webcam and display it in the local view
  try {
    master.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    videoRef.srcObject = master.localStream;
  } catch (e) {
    console.error('[MASTER] Could not find webcam');
  }
  videoRef.muted = true;
  await videoRef.play();

  // signalingClient on open event here...

  // signalingClient on sdpOffer event...
  signalingClient.on('sdpOffer', async (offer, remoteClientId) => {
    console.log('remoteClientId: ', remoteClientId);
    const peerConnection = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: 'all',
    });
    master.peerConnectionByClientId[remoteClientId] = peerConnection;

    // send ice candidates to the other peer...
    peerConnection.addEventListener('icecandidate', ({ candidate }) => {
      if (candidate) {
        console.log('doing peer connection: ', remoteClientId);
        signalingClient.sendSdpAnswer(
          peerConnection.localDescription,
          remoteClientId
        );
      }
    });
  });

  // const configuration = {
  //   iceServers,
  //   iceTransportPolicy: 'all',
  // };
};
