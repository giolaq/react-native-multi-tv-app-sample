/**
 * @jest-environment node
 */
import { execFileSync } from 'child_process';
import path from 'path';
import { scripts } from '../package.json';

const appRoot = path.resolve(__dirname, '..');
const sharedUi = path.resolve(appRoot, '../../packages/shared-ui');

function typecheckedFiles() {
  const [command, ...args] = scripts.typecheck.split(' ');
  expect(command).toBe('tsc');
  const tsc = path.join(appRoot, 'node_modules/typescript/bin/tsc');
  return execFileSync(process.execPath, [tsc, ...args, '--listFilesOnly'], { cwd: appRoot, encoding: 'utf8' }).split(
    '\n',
  );
}

it('typechecks shared-ui against the Expo app copies of react and react-native', () => {
  const files = typecheckedFiles();

  expect(files).toContain(path.join(sharedUi, 'src/index.ts'));
  expect(files).toContain(path.join(appRoot, 'node_modules/react-native/types/index.d.ts'));
  expect(files).toContain(path.join(appRoot, 'node_modules/@types/react/index.d.ts'));
  expect(
    files.filter((file) => /[/\\](react-native|@types[/\\]react)[/\\]/.test(file) && file.startsWith(sharedUi)),
  ).toEqual([]);
}, 30000);
