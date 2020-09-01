import React, { useRef } from 'react';
import Video from '../Video/Video';

import master from '../../shared/master';

const WebRtcMaster = (props) => {
  const videoRefRemote = useRef();
  const videoRefLocal = useRef();

  const signalingChannelName = props.sc;

  const start = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log(videoRefLocal);
    videoRefLocal.current.srcObject = localStream;
    await master(
      videoRefRemote.current,
      videoRefLocal.current,
      props.sc,
      localStream,
      props.mode
    );
  };

  const link =
    props.mode === 'MASTER' ? (
      <a
        href={`${document.location.href}?sc=${signalingChannelName}`}
        target="new"
      >
        link is: {`${document.location.href}?sc=${signalingChannelName}`}
      </a>
    ) : (
      ''
    );

  return (
    <div className="wtc-video">
      <h2>{props.mode}</h2>
      <p>remote view:</p>
      <Video vidRef={videoRefRemote} />
      <p>local view:</p>
      <Video vidRef={videoRefLocal} />
      <h4>SignalingChannelName: {signalingChannelName}</h4>
      <p>{document.location.href}</p>
      <button onClick={start}>start</button>
      {link}
    </div>
  );
};

export default WebRtcMaster;
