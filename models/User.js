var mongoose = require("mongoose");
var Promise = require("bluebird");
var Schema = mongoose.Schema;

var User = mongoose.model("User", new Schema({
	"name": {"type": String, unique : true, required : true, lowercase: true},
	"gravatar": String,
	"details": {},
	"prs": [],
	"against": [],
	"for": []
}));

Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

module.exports = User;
