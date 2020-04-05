import React, { useEffect } from 'react';

import master from '../../shared/master';

const WebRtcMaster = () => {
  const videoRefMaster = React.createRef();
  const videoRefLocal = React.createRef();

  useEffect(() => {
    const getEndpoints = async () => {
      master(videoRefMaster.current, videoRefLocal.current);
    };
    getEndpoints();
  }, [videoRefMaster, videoRefLocal]);

  return (
    <div className="wtc-video">
      <video ref={videoRefMaster}></video>
      <video ref={videoRefLocal}></video>
    </div>
  );
};

export default WebRtcMaster;
