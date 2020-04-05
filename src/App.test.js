import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders a header', () => {
  const { getByText } = render(<App />);
  expect(getByText(/canference/i)).toBeInTheDocument();
});
