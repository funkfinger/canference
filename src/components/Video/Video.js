import React from 'react';

export default ({ vidRef }) => (
  <video muted controls playsInline autoPlay ref={vidRef}></video>
);
