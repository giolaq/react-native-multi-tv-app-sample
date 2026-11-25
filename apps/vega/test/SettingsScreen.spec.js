let React;
let act;
let create;
let SpatialNavigation;
let AccessibilityProvider;

const mockNavigation = {dispatch: jest.fn()};

jest.mock(
  '@react-navigation/native',
  () => ({
    DrawerActions: {openDrawer: () => ({type: 'OPEN_DRAWER'})},
    useNavigation: () => mockNavigation,
    useIsFocused: () => true,
  }),
  {virtual: true},
);
const mockToggleMenu = jest.fn();
jest.mock('../../../packages/shared-ui/src/components/MenuContext', () => ({
  useMenuContext: () => ({isOpen: false, toggleMenu: mockToggleMenu}),
}));
jest.mock('../../../packages/shared-ui/src/hooks/useScale', () => ({
  scaledPixels: (value) => value,
}));

beforeEach(() => {
  jest.resetModules();
  React = require('react');
  ({act, create} = require('react-test-renderer'));
  ({SpatialNavigation} = require('react-tv-space-navigation'));
  ({
    AccessibilityProvider,
  } = require('../../../packages/shared-ui/src/components/AccessibilityContext'));
  mockNavigation.dispatch.mockClear();
  mockToggleMenu.mockClear();
});

async function renderSettings() {
  const listeners = new Set();
  SpatialNavigation.configureRemoteControl({
    remoteControlSubscriber: (callback) => {
      listeners.add(callback);
      return callback;
    },
    remoteControlUnsubscriber: (callback) => listeners.delete(callback),
  });
  const SettingsScreen =
    require('../../../packages/shared-ui/src/screens/SettingsScreen').default;
  let tree;
  await act(async () => {
    tree = create(
      <AccessibilityProvider initialOverrides={{}}>
        <SettingsScreen />
      </AccessibilityProvider>,
    );
  });
  const press = async (direction) => {
    await act(async () => {
      [...listeners].forEach((callback) => callback(direction));
    });
  };
  return {tree, press};
}

const texts = (tree) =>
  tree.root
    .findAll(
      (node) =>
        typeof node.type === 'string' &&
        typeof node.props.children === 'string',
    )
    .map((node) => node.props.children);

const switchState = (tree, label) =>
  tree.root.find(
    (node) =>
      typeof node.type === 'string' && node.props.accessibilityLabel === label,
  ).props.accessibilityState.checked;

it('offers only options that change the app', async () => {
  const {tree} = await renderSettings();
  try {
    const shown = texts(tree).join('\n');
    for (const removed of [
      'Video Quality',
      'Auto',
      '1080p',
      'Playback',
      'Autoplay',
      'Notifications',
      'Clear Cache',
      'Sign Out',
    ]) {
      expect(shown).not.toContain(removed);
    }
    expect(shown).toContain('Accessibility');
    expect(shown).toContain('High contrast: Off');
    expect(shown).toContain('Version');
  } finally {
    await act(async () => tree.unmount());
  }
});

it('moves through the accessibility switches with the D-pad and toggles the focused one', async () => {
  const {tree, press} = await renderSettings();
  try {
    await press('enter');
    expect(switchState(tree, 'High contrast')).toBe(true);
    expect(texts(tree)).toContain('Use device settings');

    await press('down');
    await press('enter');
    expect(switchState(tree, 'Larger text')).toBe(true);

    await press('down');
    await press('enter');
    expect(switchState(tree, 'Reduce motion')).toBe(true);

    // The last focusable is "Use device settings"; nothing sits below it.
    await press('down');
    await press('down');
    await press('enter');
    expect(texts(tree)).not.toContain('Use device settings');
    expect(texts(tree)).toContain('Following your device settings.');
    expect(switchState(tree, 'High contrast')).toBe(false);

    // The focused button is gone after the reset; the D-pad still reaches a switch.
    await press('up');
    await press('enter');
    expect(switchState(tree, 'High contrast')).toBe(true);
  } finally {
    await act(async () => tree.unmount());
  }
});

it.each([
  ['left-to-right', false, 'left', 'right'],
  ['right-to-left', true, 'right', 'left'],
])(
  'opens the drawer when the viewer moves toward it from a switch (%s)',
  async (_layout, rtl, towardDrawer, awayFromDrawer) => {
    jest.replaceProperty(require('react-native').I18nManager, 'isRTL', rtl);
    const {tree, press} = await renderSettings();
    try {
      await press('down');
      await press(awayFromDrawer);
      expect(mockNavigation.dispatch).not.toHaveBeenCalled();
      await press(towardDrawer);
      expect(mockNavigation.dispatch).toHaveBeenCalledWith({
        type: 'OPEN_DRAWER',
      });
      expect(mockToggleMenu).toHaveBeenCalledWith(true);
    } finally {
      await act(async () => tree.unmount());
      jest.restoreAllMocks();
    }
  },
);
