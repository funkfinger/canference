import AWS, { KinesisVideoSignalingChannels } from 'aws-sdk';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';

import { channelARN, accessKeyId, secretAccessKey, region } from '../config';
// to destructure config...
const ChannelARN = channelARN;

const master = {};

export default async (videoRefMaster, videoRefRemote) => {
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

  signalingClient.on('sdpOffer', async (offer, remoteClientId) => {
    console.log('[MASTER] Received SDP offer from client: ' + remoteClientId);

    // master connects to viewer 1:N(up to 10)
    // RTCPeerConnection is required for each viewer clients
    const peerConnection = new RTCPeerConnection({ iceServers });
    master.peerConnectionByClientId[remoteClientId] = peerConnection;

    peerConnection.addEventListener('icecandidate', ({ candidate }) => {
      if (candidate) {
        console.log(
          '[MASTER] Sending ICE candidate to client: ' + remoteClientId
        );
        signalingClient.sendIceCandidate(candidate, remoteClientId);
      }
    });

    peerConnection.addEventListener('track', ({ track }) => {
      console.warn(
        '[MASTER] Received remote track from client: ' + remoteClientId
      );
      const $media = document.createElement(track.kind);
      $media.srcObject = new MediaStream([track]);
      $media.play();
      master.remoteViews.append($media);
    });

    master.localStream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, master.localStream));
    await peerConnection.setRemoteDescription(offer);

    console.log('[MASTER] Creating SDP answer for client: ' + remoteClientId);
    await peerConnection.setLocalDescription(
      await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
    );

    console.log('[MASTER] Sending SDP answer to client: ' + remoteClientId);
    signalingClient.sendSdpAnswer(
      peerConnection.localDescription,
      remoteClientId
    );
  });

  signalingClient.on('iceCandidate', async (candidate, remoteClientId) => {
    console.log(
      '[MASTER] Received ICE candidate from client: ' + remoteClientId
    );

    const peerConnection = master.peerConnectionByClientId[remoteClientId];
    peerConnection.addIceCandidate(candidate);
  });

  signalingClient.on('close', () => {
    console.log('[MASTER] Disconnected from signaling channel');
  });

  signalingClient.on('error', (err) => {
    console.error('[MASTER] Signaling client error', err);
  });

  console.log('[MASTER] Starting master connection');
  signalingClient.open();

  // get a stream from the webcam and display it in the local view
  try {
    master.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    videoRefMaster.srcObject = master.localStream;
    videoRefMaster.muted = true;
  } catch (e) {
    console.error('[MASTER] Could not find webcam');
  }
  // await videoRefMaster.play();
};
