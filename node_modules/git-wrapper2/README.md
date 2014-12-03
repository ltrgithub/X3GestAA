git-wrapper2
===========

A wrapper around the git executable. Built on top of the original [git-wrapper](https://github.com/pvorb/node-git-wrapper), **git-wrapper2** provides additional convenience functions for commit git tasks, like `commit`ing changes and `push`ing them to a remote repository. Additionally git-wrapper2 emits events for many tasks so that you can observe changes throughout your application.

## Installation

    npm install git-wrapper2

## API

### var git = new Git(options);

Constructor. See [git(1)](http://git-scm.com/docs/git) for available options.

  * `options` Object. Examples: `{ paginate: true }` enables pagination.
    `{ 'git-dir': '../.git' }` specifies a different `.git` directory.

### git.exec(command [[, options], args], callback);

Executes a git command. See [the Git Reference](http://git-scm.com/docs/) for
available commands.

  * `command`   String.         Examples: `'init'`, `'log'`, `'commit'`, etc.
  * `options`   Object.         The options for a git command. E.g.
                                `{ f: true }` to force a command (equivalent
                                to adding `-f` on the command line).
  * `args`      Array[String].  The arguments for a git command. E.g. some
                                files for `git add`.
  * `callback`  Function.       `callback(err, msg)`.

### git.isRepo(callback);

Checks to see if the directory is a git repository. Callback returns a `boolean` indicating whether it is or not.

  * `callback` Function.        `callback(isRepo)`.

### git.clone(repo, dir, callback);

Clones a repository to the destination `dir`.

  * `repo`     String.          Remote repository.
  * `dir`      String.          Local directory to clone into.
  * `cal.back` Function.        `callback(err, msg)`.

### git.pull([remote], [branch], callback)

Performs a `git pull` command against the repository. If `remote` or `branch` are not provided they will default to `origin` and `master` respectively.

  * `remote`   String.          Name of the remote target.
  * `branch`   String.          Branch name to pull.
  * `callback` Function.        `callback(err, msg)`.

### git.add(which, callback)

Perform a `git add` command, staging files for a commit.

  * `which`    String.          Which files to stage, seperated by spaces.
  * `callback` Function.        `callback(err, msg)`.

### git.commit(msg, callback)

Commits staged changes with the given `msg` as the commit message.

  * `msg`      String.          Body of the commit message.
  * `callback` Function.        `callback(err, msg)`.

### git.push([remote], [branch], callback)

Pushes changes in the local repository to a remote. If `remote` or `branch` are not provided, the defaults will be `origin` and `master` respectively.

  * `remote`   String.          Name of the remote target.
  * `callback` Function.        `callback(err, msg)`.

### git.save(msg, callback)

Convenience function for performing `git.add`, `git.commit`, and `git.push` in one function call. Using this will automatically stage all unstaged changes, commit, and then push.

  * `msg`      String.          Body of the commit message.
  * `callback` Function.        `callback(err, msg)`.

### git.log(options, callback)

Performs a `git log` command, returning the results. `options` are an array of command line options you might want to provide, such as `['-n', 2]` to limit the results to only the last 2 commits.

  * `options`   Array.          Command line options for the `git log` command.
  * `calllback` Function.       `callback(err, msg)`.

## Events

Several events are emitted when actions are performed against a git repository.

### clone

Emitted when the repository is cloned.

### commit

Emitted when a `commit` occurs.

### saved

Emitted when a full `save` operation is performed and completed.

## Bugs and Issues

If you encounter any bugs or issues, feel free to email me at matthew at matthewphillips.info.
