import React from 'react';
import qs from 'qs';

import WebRtcMaster from './components/WebRtcMaster/WebRtcMaster';
import WebRtcViewer from './components/WebRtcViewer/WebRtcViewer';

const App = () => {
  const querystring = qs.parse(window.location.search.slice(1));
  let mode = <WebRtcMaster />;
  if (querystring.sc) {
    mode = <WebRtcViewer sc={querystring.sc} />;
  }
  return (
    <div className="App">
      <header className="App-header">
        <h1>Canference - {process.env.REACT_APP_ACCESS_KEY_ID}</h1>
        {mode}
      </header>
    </div>
  );
};

export default App;
