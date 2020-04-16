import AWS, { KinesisVideoSignalingChannels } from 'aws-sdk';
import {
  SignalingClient,
  RTCPeerConnection,
} from 'amazon-kinesis-video-streams-webrtc';

import { accessKeyId, secretAccessKey, region } from '../config';

const master = {};

export default async (masterVideoRef, viewerVideoRef, ChannelName) => {
  // creates the video client...
  const videoClient = new AWS.KinesisVideo({
    region,
    accessKeyId,
    secretAccessKey,
  });

  let sigChanResp = null;
  try {
    // NOTE: this will throw a 404 error in the console if the signaling channel doesn't exist - this is unavoidable - may want to look at the implementation of this in the future...
    sigChanResp = await videoClient
      .describeSignalingChannel({
        ChannelName,
      })
      .promise();
  } catch (error) {
    // signaling channel doesn't exist, set it...
    let t = await videoClient.createSignalingChannel({ ChannelName }).promise();
    console.log(t);
  } finally {
    sigChanResp = sigChanResp
      ? sigChanResp
      : await videoClient
          .describeSignalingChannel({
            ChannelName,
          })
          .promise();
  }

  console.log(sigChanResp);

  const channelARN = sigChanResp.ChannelInfo.ChannelARN;
  const ChannelARN = channelARN;

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

  console.log('ice servers: ', iceServers);

  // get a stream from the webcam and display it in the local view
  try {
    master.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    masterVideoRef.srcObject = master.localStream;
  } catch (e) {
    console.error("can't find webcam");
  }
  masterVideoRef.muted = true;
  await masterVideoRef.play();

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
