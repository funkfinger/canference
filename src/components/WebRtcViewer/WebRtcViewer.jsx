import React, { useEffect } from 'react';

import Video from '../Video/Video';

import viewer from '../../shared/viewer';

const WebRtcViewer = (props) => {
  const videoRefRemote = React.createRef();
  const videoRefLocal = React.createRef();

  useEffect(() => {
    const getEndpoints = async () => {
      viewer(videoRefRemote.current, videoRefLocal.current, props.sc);
    };
    getEndpoints();
  }, [props.sc, videoRefLocal, videoRefRemote]);

  return (
    <div className="wtc-video-viewer">
      <h2>Viewer</h2>
      <p>remote view:</p>
      <Video vidRef={videoRefRemote} />
      <p>local view:</p>
      <Video vidRef={videoRefLocal} />
      <h4>props.sc: {props.sc}</h4>
      <p>{document.location.href}</p>
    </div>
  );
};

export default WebRtcViewer;
