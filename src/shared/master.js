import Peer from 'simple-peer';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';

import {
  getKinesisVideo,
  getChannelARN,
  getEndpoints,
  getIceServers,
} from './setup-web-rtc';

// import { accessKeyId, secretAccessKey, region } from '../config';
const accessKeyId = process.env.REACT_APP_ACCESS_KEY_ID;
const secretAccessKey = process.env.REACT_APP_SECRET_ACCESS_KEY;
const region = process.env.REACT_APP_REGION;

const master = {
  peerConnectionByClientId: {},
};

export default async (remoteVideoRef, localVideoRef, ChannelName) => {
  // creates the video client...
  const vc = getKinesisVideo(accessKeyId, secretAccessKey, region);
  // get the channel arn...
  const channelARN = await getChannelARN(vc, ChannelName);
  const ChannelARN = channelARN; // for destructuring...

  // get endpoints...
  const endpoints = await getEndpoints(vc, channelARN, 'MASTER');

  // get ice servers...
  const iceServers = await getIceServers(
    endpoints.HTTPS,
    ChannelARN,
    accessKeyId,
    secretAccessKey,
    region
  );

  // create master signalingClient...
  const signalingClient = new SignalingClient({
    channelARN,
    channelEndpoint: endpoints.WSS,
    role: 'MASTER',
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  console.log('signalingClient: ', signalingClient);

  const peer = new Peer({ initiator: true, config: { iceServers } });
  console.log('peer.channelName: ', peer.channelName);

  // signalingClient on open event here...
  signalingClient.on('open', async () => {
    console.log('[MASTER] Connected to signaling service');
  });

  // signalingClient on sdpOffer event...
  signalingClient.on('sdpOffer', async (offer, remoteClientId) => {
    console.log('sdp offer - remoteClientId: ', remoteClientId);
    const peerConnection = new RTCPeerConnection({
      iceServers,
      iceTransportPolicy: 'all',
    });
    master.peerConnectionByClientId[remoteClientId] = peerConnection;
    console.log('peerConnection: ', peerConnection);
    await peerConnection.setRemoteDescription(offer);

    // get a stream from the webcam and display it in the local view
    try {
      master.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideoRef.srcObject = master.localStream;
    } catch (e) {
      console.error("can't find webcam");
    }
    localVideoRef.muted = true;
    await localVideoRef.play();

    // send ice candidates to the other peer...
    peerConnection.addEventListener('icecandidate', ({ candidate }) => {
      if (candidate) {
        console.log('doing peer connection: ', remoteClientId);
        // ******* trickle ice...
        // signalingClient.sendIceCandidate(candidate, remoteClientId);
        signalingClient.sendSdpAnswer(
          peerConnection.localDescription,
          remoteClientId
        );
      }
    });

    peerConnection.addEventListener('track', (event) => {
      console.warn(
        '[MASTER] Received remote track from client: ' + remoteClientId
      );
      console.log(event);
      if (remoteVideoRef.srcObject) {
        return;
      }
      // const $media = document.createElement(track.kind);
      // $media.srcObject = new MediaStream([track]);
      // $media.play();
      // remoteVideoRef.append($media);
      remoteVideoRef.srcObject = event.streams[0];
    });

    const tracks = master.localStream.getTracks();
    console.log('tracks: ', tracks);
    tracks.forEach((track) =>
      peerConnection.addTrack(track, master.localStream)
    );
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

  signalingClient.on('error', () => {
    console.error('[MASTER] Signaling client error');
  });

  console.log('[MASTER] Starting master connection');
  signalingClient.open();
};
