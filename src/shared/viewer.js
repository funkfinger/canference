import Peer from 'simple-peer';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';

import {
  getKinesisVideo,
  getChannelARN,
  getEndpoints,
  getIceServers,
} from './setup-web-rtc';

const accessKeyId = process.env.REACT_APP_ACCESS_KEY_ID;
const secretAccessKey = process.env.REACT_APP_SECRET_ACCESS_KEY;
const region = process.env.REACT_APP_REGION;

export default async (
  remoteVideoRef,
  localVideoRef,
  ChannelName,
  localStream
) => {
  // creates the video client...
  const vc = getKinesisVideo(accessKeyId, secretAccessKey, region);
  // get the channel arn...
  const channelARN = await getChannelARN(vc, ChannelName);
  const ChannelARN = channelARN; // for destructuring...

  // get endpoints...
  const endpoints = await getEndpoints(vc, channelARN, 'VIEWER');

  // get ice servers...
  const iceServers = await getIceServers(
    endpoints.HTTPS,
    ChannelARN,
    accessKeyId,
    secretAccessKey,
    region
  );

  // create viewer signalingClient...
  const signalingClient = new SignalingClient({
    channelARN,
    channelEndpoint: endpoints.WSS,
    clientId: `c${Date.now()}`, // should be random
    role: 'VIEWER',
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  console.log('signalingClient: ', signalingClient);

  const peer = new Peer({ initiator: true, config: { iceServers } });
  const peerConnection = new RTCPeerConnection({ iceServers });

  signalingClient.on('open', async () => {
    console.log('[VIEWER] Connected to signaling service');

    try {
      localStream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, localStream));
      localVideoRef.srcObject = localStream;
      localVideoRef.muted = true;
      //await localVideoRef.play();
    } catch (e) {
      console.error('[VIEWER] Could not find webcam', e);
      return;
    }

    console.log('[VIEWER] Creating SDP offer');
    await peerConnection.setLocalDescription(
      await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
    );

    console.log(
      '[VIEWER] Sending SDP offer: ',
      peerConnection.localDescription
    );
    signalingClient.sendSdpOffer(peerConnection.localDescription);
  });

  signalingClient.on('sdpAnswer', async (answer) => {
    console.log('[VIEWER] Received SDP answer');
    console.log(answer);
    console.log('got here: ', peerConnection.signalingState);
    if (peerConnection.signalingState !== 'stable') {
      await peerConnection.setRemoteDescription(answer);
    }
  });

  signalingClient.on('iceCandidate', (candidate) => {
    console.log('[VIEWER] Received ICE candidate', candidate);
    peerConnection.addIceCandidate(candidate);
  });

  signalingClient.on('close', () => {
    console.log('[VIEWER] Disconnected from signaling channel');
  });

  signalingClient.on('error', (error) => {
    console.error('[VIEWER] Signaling client error: ', error);
  });

  // Send any ICE candidates to the other peer
  peerConnection.addEventListener('icecandidate', ({ candidate }) => {
    if (candidate) {
      // ****** trickle ice...
      // console.log('[VIEWER] Sending ICE candidate - ', candidate);
      // signalingClient.sendIceCandidate(candidate);

      console.log('[VIEWER] Sending SDP offer');
      signalingClient.sendSdpOffer(peerConnection.localDescription);
    }
  });

  // As remote tracks are received, add them to the remote view
  peerConnection.addEventListener('track', (event) => {
    console.log('[VIEWER] Received remote track');
    if (remoteVideoRef.srcObject) {
      return;
    }
    remoteVideoRef.srcObject = event.streams[0];
    //viewerVideoRef.play();
  });

  peerConnection.onsignalingstatechange = (e) => {};

  console.log('[VIEWER] Starting viewer connection');
  signalingClient.open();
};
