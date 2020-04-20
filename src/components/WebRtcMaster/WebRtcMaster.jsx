import React, { useEffect, useState } from 'react';

import master from '../../shared/master';

const getChannelName = () => {
  const name =
    localStorage.getItem('signaling-channel-name') ||
    Math.random().toString(36).substring(2).toUpperCase();
  localStorage.setItem('signaling-channel-name', name);
  return name;
};

const WebRtcMaster = (props) => {
  console.log('props: ', props);
  const videoRefMaster = React.createRef();
  const videoRefLocal = React.createRef();

  const [signalingChannelName] = useState(getChannelName());

  useEffect(() => {
    const getEndpoints = async () => {
      master(
        videoRefMaster.current,
        videoRefLocal.current,
        signalingChannelName
      );
    };
    getEndpoints();
  }, [videoRefMaster, videoRefLocal, signalingChannelName]);

  return (
    <div className="wtc-video">
      <h2>Master</h2>
      <p>remote view:</p>
      <video muted ref={videoRefMaster}></video>
      <p>local view:</p>
      <video muted ref={videoRefLocal}></video>
      <h4>SignalingChannelName: {signalingChannelName}</h4>
      <p>{document.location.href}</p>
      <a
        href={`${document.location.href}?sc=${signalingChannelName}`}
        target="new"
      >
        link is: {`${document.location.href}?sc=${signalingChannelName}`}
      </a>
    </div>
  );
};

export default WebRtcMaster;
