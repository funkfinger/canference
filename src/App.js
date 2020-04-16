import React from 'react';
import qs from 'qs';

import WebRtcMaster from './components/WebRtcMaster/WebRtcMaster';

const App = () => {
  const querystring = qs.parse(window.location.search.slice(1));
  let mode = <WebRtcMaster />;
  if (querystring.sc) {
    mode = <WebRtcMaster sc={querystring.sc} />;
  }
  return (
    <div className="App">
      <header className="App-header">
        <h1>Canference</h1>
        {mode}
      </header>
    </div>
  );
};

export default App;
