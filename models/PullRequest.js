"use strict";
var mongoose = require("mongoose");
var Promise = require("bluebird");
var Schema = mongoose.Schema;

var schema = new Schema({
	"url": {"type": String, unique : true, required : true},
	"id": Number,
	"html_url": String,
	"diff_url": String,
	"patch_url": String,
	"issue_url": String,
	"number": Number,
	"state": String,
	"locked": Boolean,
	"title": String,
	"user": {
		"login": {type: String, lowercase: true},
		"id": Number,
		"avatar_url": String,
		"url": String,
		"html_url": String
	},
	"body": String,
	"created_at": Date,
	"updated_at": Date,
	"closed_at": Date,
	"merged_at": Date,
	"milestone": String,
	"commits_url": String,
	"review_comments_url": String,
	"review_comment_url": String,
	"comments_url": String,
	"statuses_url": String,
	"base": {
		"label": String,
		"ref": String,
		"sha": String,
		"user": {
			"login": {type: String, lowercase: true},
			"avatar_url": String
		},
		"repo": {
			"id": Number,
			"name": String,
			"full_name": {"type": String, lowercase: true}
		}
	},
	"merged": Boolean,
	"mergeable": Boolean,
	"mergeable_state": String,
	"merged_by": String,
	"comments": Number,
	"review_comments": Number,
	"commits": Number,
	"additions": Number,
	"deletions": Number,
	"changed_files": Number
});

var PullRequest = mongoose.model("PullRequest", schema);

Promise.promisifyAll(PullRequest);
Promise.promisifyAll(PullRequest.prototype);

module.exports.PullRequest = PullRequest;
module.exports.schema = schema;
