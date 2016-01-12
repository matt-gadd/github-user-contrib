var mongoose = require("mongoose");
var Promise = require("bluebird");
var Schema = mongoose.Schema;

var Comment = mongoose.model("Comment", new Schema({
	"url": {"type": String, unique : true, required : true},
	"pull_request_url": String,
	"html_url": String,
	"id": Number,
	"user": {
		"login": String,
		"id": Number,
		"avatar_url": String,
		"gravatar_id": String,
		"url": String,
		"html_url": String,
		"followers_url": String,
		"following_url": String,
		"gists_url": String,
		"starred_url": String,
		"subscriptions_url": String,
		"organizations_url": String,
		"repos_url": String,
		"events_url": String,
		"received_events_url": String,
		"site_admin": Boolean
	},
	"position": Number,
	"line": Number,
	"path": String,
	"commit_id": String,
	"created_at": String,
	"updated_at": String,
	"body": String
}));

Promise.promisifyAll(Comment);
Promise.promisifyAll(Comment.prototype);

module.exports = Comment;

