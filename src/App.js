import React from 'react';
import qs from 'qs';

import WebRtcMaster from './components/WebRtcMaster/WebRtcMaster';

const getChannelName = () => {
  const name =
    localStorage.getItem('signaling-channel-name') ||
    Math.random().toString(36).substring(2).toUpperCase();
  localStorage.setItem('signaling-channel-name', name);
  return name;
};

const App = () => {
  const querystring = qs.parse(window.location.search.slice(1));
  const sc = querystring.sc ? querystring.sc : getChannelName();
  const mode = querystring.sc ? 'VIEWER' : 'MASTER';
  return (
    <div className="App">
      <header className="App-header">
        <h1>Canference - {process.env.REACT_APP_ACCESS_KEY_ID}</h1>
        <WebRtcMaster sc={sc} mode={mode} />
      </header>
    </div>
  );
};

export default App;
