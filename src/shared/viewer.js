import AWS, { KinesisVideoSignalingChannels } from 'aws-sdk';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';

// import { accessKeyId, secretAccessKey, region } from '../config';
const accessKeyId = process.env.REACT_APP_ACCESS_KEY_ID;
const secretAccessKey = process.env.REACT_APP_SECRET_ACCESS_KEY;
const region = process.env.REACT_APP_REGION;

const viewer = {};

export default async (viewerVideoRef, localVideoRef, ChannelName) => {
  // creates the video client...
  const videoClient = new AWS.KinesisVideo({
    region,
    accessKeyId,
    secretAccessKey,
  });

  // Get signaling channel ARN
  const describeSignalingChannelResponse = await videoClient
    .describeSignalingChannel({
      ChannelName,
    })
    .promise();

  const ChannelARN = describeSignalingChannelResponse.ChannelInfo.ChannelARN;
  const channelARN = ChannelARN;
  console.log('channel arn: ', ChannelARN);

  // makes the call to aws to get the endpoints - returns a promise...
  const getEndpoints = await videoClient
    .getSignalingChannelEndpoint({
      ChannelARN,
      SingleMasterChannelEndpointConfiguration: {
        Protocols: ['WSS', 'HTTPS'],
        Role: 'VIEWER',
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

  console.log('endpointsByProtocol: ', endpointsByProtocol);

  // create viewer signalingClient...
  const signalingClient = new SignalingClient({
    channelARN,
    channelEndpoint: endpointsByProtocol.WSS,
    clientId: `c${Date.now()}`, // should be random
    role: 'VIEWER',
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  viewer.signalingClient = signalingClient;
  console.log('signalingClient: ', signalingClient);

  // if use STUN/TURN
  const signalingChannels = new KinesisVideoSignalingChannels({
    region,
    accessKeyId,
    secretAccessKey,
    endpoint: endpointsByProtocol.HTTPS,
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

  console.log('ice servers: ', iceServers);

  const peerConnection = new RTCPeerConnection({ iceServers });

  signalingClient.on('open', async () => {
    console.log('[VIEWER] Connected to signaling service');

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, localStream));
      localVideoRef.srcObject = localStream;
      localVideoRef.muted = true;
      await localVideoRef.play();
    } catch (e) {
      console.error('[VIEWER] Could not find webcam');
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
    await peerConnection.setRemoteDescription(answer);
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
    if (viewerVideoRef.srcObject) {
      return;
    }
    viewerVideoRef.srcObject = event.streams[0];
    viewerVideoRef.play();
  });

  console.log('[VIEWER] Starting viewer connection');
  signalingClient.open();
};
