/**
 * @jest-environment node
 */
import path from 'path';
import ts from 'typescript';

const appRoot = path.resolve(__dirname, '..');
const sharedUiEntry = path.resolve(appRoot, '../../packages/shared-ui/src/index.ts');

function resolveFromSharedUi(moduleName: string) {
  const { config } = ts.readConfigFile(path.join(appRoot, 'tsconfig.json'), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, appRoot);
  return ts.resolveModuleName(moduleName, sharedUiEntry, options, ts.sys).resolvedModule?.resolvedFileName;
}

it.each([
  ['react-native', 'node_modules/react-native/'],
  ['react', 'node_modules/@types/react/'],
])('typechecks shared-ui imports of %s against the Expo app copy', (moduleName, appCopy) => {
  expect(resolveFromSharedUi(moduleName)).toMatch(new RegExp(`^${path.join(appRoot, appCopy)}`));
});
