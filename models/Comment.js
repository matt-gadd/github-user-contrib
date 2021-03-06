var mongoose = require("mongoose");
var Promise = require("bluebird");
var Schema = mongoose.Schema;

var Comment = mongoose.model("Comment", new Schema({
	"url": {"type": String, unique : true, required : true},
	"pull_request_url": String,
	"html_url": String,
	"id": Number,
	"user": {
		"login": {type: String, lowercase: true},
		"avatar_url": String
	},
	"position": Number,
	"line": Number,
	"filtered": Boolean,
	"path": String,
	"commit_id": String,
	"created_at": Date,
	"updated_at": Date,
	"body": String
}));

Promise.promisifyAll(Comment);
Promise.promisifyAll(Comment.prototype);

module.exports = Comment;

