import React from 'react';
import ReactDOM from 'react-dom';
// eslint-disable-next-line no-unused-vars
import adapter from 'webrtc-adapter';

import './index.scss';
import App from './App';

console.log('adapter.browserDetails.browser: ', adapter.browserDetails.browser);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
