This is a test directory so that you can experiment with git. 

You should read the [Using GitHub wiki page](https://github.com/Sage-ERP-X3/Syracuse/wiki/Using-Git-and-GitHub) and then do the following exercise

## Create an issue and a branch

First, create a test issue in the issue tracking system. 

Then create a branch:

```sh
$ git checkout master # go back to master branch
$ git pull # bring your local master up-to-date before branching
$ git checkout -b issueN-test-yourname origin/master # branch
```

## Commit locally

Create a file called yourname.txt in this directory

```sh
$ cd try-git
$ echo "hello yourname" > yourname.txt
$ git add yourname.txt # add your file to git's index
$ git commit -a -m "#N: your message" # commit locally
```

The commit is local. If you refresh the [directory page](https://github.com/Sage-ERP-X3/Syracuse/tree/master/try-git) on GitHub, you won't see your file.

## Switch branch

Go back to the master branch:

```sh
$ git checkout master # switch to master branch
```

Back to the master branch. Your file is not there any more.

Go back to your branch:

```
$ git checkout issueN-test-yourname # switch back to your branch
```

Your file is back!

## Committing to close the issue

Make another change to the file:

```sh
$ echo "bye" >> yourname.txt
```

Commit with a _close_ message:

```sh
$ git status # check were you are
$ git commit -a -m "close #N: implemented hello goodbye" # commit locally

```

## Pushing your change to master and GitHub

```sh
$ git pull # refresh from GitHub's master
$ git checkout master # switch to local master branch
$ git merge issueN-test-yourname # merge your branch into master
$ git push # push your changes to GitHub
```

Now, refresh the [directory page](https://github.com/Sage-ERP-X3/Syracuse/tree/master/try-git) on GitHub. Your file should be there!

Also, look at the issue in GitHub issue tracking system.

If everything's ok you can now clean up and delete your local branch:

```sh
$ git branch -d issueN-test-yourname
```
