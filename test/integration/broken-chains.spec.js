/*
   The broken chains test assures the behaviour of both standard and Promise wrapped versions
   of the simple-git library.

   Failures (exit code other than zero and some content in the stderr output) cause the current
   queue to be truncated and no additional steps to be taken.

   In the case of a promise chain, the `catch` handler should be called on the first error
   and no other steps in the chain be executed.
 */
const {assertGitError, createTestContext, catchAsync, catchAsyncError, mockDebugModule: {$reset}} = require('../helpers');

describe('broken-chains', () => {

   let context;

   beforeEach(() => context = createTestContext());
   afterEach(() => $reset());

   it('promise chains from legacy promise api', () => testPromiseChains(context.gitP(context.root)));

   it('promise chains from main api', () => testPromiseChains(context.git(context.root)));

   /* When many tasks are called as a chain (ie: `git.init().addRemote(...).fetch()`) the
    * chain is treated as atomic and any error should prevent the rest of the chain from
    * executing.
    * Once the chain is purged, chaining a new task from it should allow that task to be
    * executed.
    */
   it('failed chains can spawn new chains after being purged', async () => {
      const git = context.git(context.root);
      const failedChain = git.raw('failed');
      const failedChild = failedChain.raw('blah');

      const results = await Promise.all([catchAsyncError(failedChain), catchAsyncError(failedChild)]);

      assertGitError(results[0], 'failed');
      assertGitError(results[1], 'failed');
      expect(results[0]).toBe(results[1]);

      expect(await catchAsyncError(failedChain.raw('version'))).toBeUndefined();
   });

   /* When many tasks are called as a chain (ie: `git.init().addRemote(...).fetch()`) the
    * chain is treated as atomic and any error should prevent the rest of the chain from
    * executing.
    */
   it('should reject subsequent steps of a chain if there is a rejection', async () => {
      const git = context.git(context.root);
      const first = git.raw('init');
      const second = first.raw('errors');
      const third = second.status();

      const results = await Promise.all([
         await catchAsync(first),
         await catchAsync(second),
         await catchAsync(third),
      ]);

      expect(results.map(r => r.threw)).toEqual([false, true, true]);
      expect(results[1].error).toBe(results[2].error);
   });

   /* When many tasks are called on the `git` instance directly, they are each the head of a separate chain
    * (ie: `[ git.init(), git.addRemote(...), git.fetch() ]`) while the individual chains are treated as
    * atomic, they are handled independently of each other and errors shouldn't impact the continued execution
    * of the other chains
    */
   it('should continue making subsequent steps of other chains when there is a rejection', async () => {
      const git = context.git(context.root);

      const first = git.raw('version');
      const second = git.raw('errors');
      const third = git.raw('version');

      const results = await Promise.all([
         catchAsync(first),
         catchAsync(second),
         catchAsync(third),
      ]);

      expect(results.map(r => r.threw)).toEqual([false, true, false]);
   });

   async function testPromiseChains (git) {
      const successes = [];
      const errors = [];
      const catcher = jest.fn(() => {
         expect(successes).toEqual(['A']);
         expect(errors).toEqual([]);
      });

      const chain = git.raw('version')
         .then(() => successes.push('A'))
         .then(() => git.raw('failed'))
         .then(() => errors.push('B'))
         .then(() => git.raw('failed'))
         .then(() => errors.push('C'))
         .catch(catcher);

      await chain;
      expect(catcher).toHaveBeenCalled();
   }

});