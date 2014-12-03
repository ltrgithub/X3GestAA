var EventEmitter = require('events').EventEmitter;

/*
 * Checks to see if this is a git repository
**/
var isRepo = exports.isRepo = function(callback){
	var answer = true;
	return this.exec('status', function(err, msg){
		if(err){
			answer = err.toString().indexOf('Not a git repository') === -1;
		}
		callback(answer);
	});
};

/*
 * Clone the repository.
**/
var clone = exports.clone = function(repo, dir){
  var args = [repo, dir];

	var child = this.spawn('clone', args);
  child.on('exit', function(){
    this.emit('clone', repo, dir);
  }.bind(this));

  return child;
};

/*
 * Pull latest from the repository
**/
var pull = exports.pull = function(remote, branch){
  if(typeof remote == 'function') {
    callback = remote;
    remote = 'origin';
    branch = 'master';
  } else if(typeof branch == 'function') {
    callback = branch;
    branch = 'master';
  }

  var args = [remote, branch];
	return this.spawn('pull', args);
};

/*
 * Add files for a commit.
**/
var add = exports.add = function(which){
	var cmd = 'add', args = [which];
	var child = this.spawn(cmd, args);
  return child;
};

/*
 * Remove files for a commit.
**/
var rm = exports.rm = function(which) {
  which = Array.isArray(which) ? which : [which];
  return this.spawn('rm', which);
};

/*
 * Commit the repo.
**/
var commit = exports.commit = function(msg, args){
  args = (args || []).concat(['-m', msg]);
	
  var child = this.spawn('commit', args);
  child.on('exit', function(){
    this.emit('commit', msg);
  }.bind(this));

  return child;
};

/*
 * Push to master
**/
var push = exports.push = function(remote, branch){
  if(typeof remote == 'undefined') {
    remote = 'origin';
    branch = 'master';
  } else if(typeof branch == 'undefined') {
    branch = 'master';
  }

  var args = [remote, branch];
	return this.spawn('push', args);
};

/*
 * Save - Does commit and push at once.
**/
exports.save = function(msg, commitargs){
  var ee = new EventEmitter(), self = this;

  var children = [
    this.add.bind(this, '-A'),
    this.commit.bind(this, msg, commitargs),
    this.push.bind(this)
  ];

  var listenAndEmit = function(child){
    var stdout = child.stdout;
    var stderr = child.stderr;

    stdout.setEncoding('utf8');
    stderr.setEncoding('utf8');

    stdout.on('data', function(data){
      ee.emit('data', data);
    });

    stderr.on('data', function(data){
      ee.emit('error', data);
    });
  };

  var next = function(){
    var child = children.shift()();
    listenAndEmit(child);

    child.on('exit', function(code){
      if(children.length) {
        return next();
      }
      self.emit('saved', msg);
      ee.emit('end', code);
    });
  };
  next();

  return ee;
};

/*
 * Call `git log`, optionally with arguments
**/
exports.log = function(options) {
  if(typeof options == 'function') {
    callback = options;
    options = [];
  }
  return this.spawn('log', options);
};

/*
 * Calls `git branch`
 */
exports.branch = function(name, args) {
  args = (args || []).concat([name]);
  return this.spawn('branch', args);
};

/*
 * Calls `git checkout`
 */
exports.checkout = function(branch, args) {
  args = (args || []).concat([branch]);
  return this.spawn('checkout', args);
};

/*
 * Calls `git show`
 */
exports.show = function(sha1, file, args) {
  args = (args || []).concat([sha1 + ':' + file]);
  return this.spawn('show', args);
};
