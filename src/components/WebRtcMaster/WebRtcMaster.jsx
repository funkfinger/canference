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
      <video ref={videoRefMaster}></video>
      <video ref={videoRefLocal}></video>
      <h4>SignalingChannelName: {signalingChannelName}</h4>
      <h4>props.sc: {props.sc}</h4>
    </div>
  );
};

export default WebRtcMaster;
