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
      <video
        className="master-video"
        ref={videoRefMaster}
        autoPlay
        playsInline
        controls
        muted
        height="480"
        width="640"
      ></video>
      <video
        className="viewer-video"
        ref={videoRefLocal}
        autoPlay
        playsInline
        controls
        height="480"
        width="640"
      ></video>
    </div>
  );
};

export default WebRtcMaster;
