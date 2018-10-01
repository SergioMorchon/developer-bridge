import AppContext from '../models/AppContext';
import AppPackage from '../models/AppPackage';
import * as promiseFs from '../util/promiseFs';

let appContext: AppContext;
let readFileSpy: jest.MockInstance<typeof promiseFs.readFile>;
let appPackageSpy: jest.MockInstance<typeof AppPackage.fromArtifact>;
let appPackageLoadedSpy: jest.Mock;

const mockPreviousApp = {
  uuid: 'Old',
  buildId: 'app',
};

function loadAppPackage() {
  return appContext.loadAppPackage('app.fba');
}

describe.each([
  ['when no app was previously loaded', undefined, undefined],
  ['when an app was already loaded', mockPreviousApp, 'previously/loaded.fba'],
])('%s', (_, previousAppPackage, previousAppPath) => {
  beforeEach(() => {
    appContext = new AppContext();
    appContext.appPackage = previousAppPackage;
    appContext.appPackagePath = previousAppPath;

    appPackageLoadedSpy = jest.fn();
    appContext.onAppPackageLoad.attach(appPackageLoadedSpy);

    readFileSpy = jest.spyOn(promiseFs, 'readFile');
    appPackageSpy = jest.spyOn(AppPackage, 'fromArtifact');
  });

  describe('if the file path cannot be read', () => {
    const error = new Error('Failed to read file');

    beforeEach(() => readFileSpy.mockRejectedValueOnce(error));

    it('rejects', () => expect(loadAppPackage()).rejects.toBe(error));

    it('keeps the old application state', () => expect(appContext).toMatchObject({
      appPackage: previousAppPackage,
      appPackagePath: previousAppPath,
    }));
  });

  describe('if the app package cannot be parsed', () => {
    const error = new Error('Failed to parse package');

    beforeEach(() => {
      readFileSpy.mockResolvedValueOnce(Buffer.alloc(0));
      appPackageSpy.mockRejectedValueOnce(error);
    });

    it('rejects', () => expect(loadAppPackage()).rejects.toBe(error));

    it('keeps the old application state', () => expect(appContext).toMatchObject({
      appPackage: previousAppPackage,
      appPackagePath: previousAppPath,
    }));
  });

  describe('when the app package path is valid', () => {
    const mockApp = {
      uuid: 'fakeUUID',
      buildId: 'fakeBuildID',
    };

    beforeEach(() => {
      readFileSpy.mockResolvedValueOnce(Buffer.alloc(0));
      appPackageSpy.mockResolvedValueOnce(mockApp);
      return loadAppPackage();
    });

    it('stores the app package in the application state', () => {
      expect(appContext).toMatchObject({
        appPackage: mockApp,
        appPackagePath: 'app.fba',
      });
    });

    it('emits an event after an app package has been loaded', () => {
      expect(appPackageLoadedSpy).toBeCalled();
    });
  });
});
