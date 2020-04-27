import React, { useEffect } from 'react';

import viewer from '../../shared/viewer';

const WebRtcViewer = (props) => {
  const videoRefViewer = React.createRef();
  const videoRefLocal = React.createRef();

  useEffect(() => {
    const getEndpoints = async () => {
      viewer(videoRefViewer.current, videoRefLocal.current, props.sc);
    };
    getEndpoints();
  }, [props.sc, videoRefLocal, videoRefViewer]);

  return (
    <div className="wtc-video-viewer">
      <h2>Viewer</h2>
      <p>remote view:</p>
      <video muted playsInline controls ref={videoRefViewer}></video>
      <p>local view:</p>
      <video muted playsInline controls ref={videoRefLocal}></video>
      <h4>props.sc: {props.sc}</h4>
      <p>{document.location.href}</p>
    </div>
  );
};

export default WebRtcViewer;
