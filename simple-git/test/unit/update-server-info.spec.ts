import { promiseError } from '@kwsites/promise-result';
import { assertExecutedCommands } from '@simple-git/test-utils';
import { closeWithSuccess, newSimpleGit } from './__fixtures__';
import { SimpleGit } from '../../typings';

describe('updateServerInfo', () => {
   let git: SimpleGit;

   jest.setTimeout(100000000)

   beforeEach(() => git = newSimpleGit());

   it('update server info', async () => {
      const queue = git.updateServerInfo();

      closeWithSuccess();

      expect(await promiseError(queue)).toBeUndefined();
      assertExecutedCommands('update-server-info');
   });

});
