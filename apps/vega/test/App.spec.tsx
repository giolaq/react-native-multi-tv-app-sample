/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 * 
 * Skipped: requires Fire TV native modules (@amazon-devices/react-native-gesture-handler)
 * that are not available in standard CI environments
 */

import 'react-native';

// Test suite skipped - imports gesture handler which requires Fire TV native modules
describe.skip('Template App Snapshot tests', () => {
  it('Initial App screen', () => {
    const screen = render(<App />);
    expect(screen).toMatchSnapshot();
  });

  it('App screen after link press', () => {
    const screen = render(<App />);
    const button = screen.getByTestId('sampleLink');
    fireEvent.press(button);
    expect(screen).toMatchSnapshot();
  });
});
