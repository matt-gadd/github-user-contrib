var mongoose = require("mongoose");
var Promise = require("bluebird");
var Schema = mongoose.Schema;

var User = mongoose.model("User", new Schema({
	"name": {"type": String, unique : true, required : true, lowercase: true},
	"gravatar": String,
	"prs": [{type: mongoose.Schema.Types.ObjectId, ref: "PullRequest"}],
	"against": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}],
	"for": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}]
}));

Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

module.exports = User;
