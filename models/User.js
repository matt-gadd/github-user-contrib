var mongoose = require("mongoose");
var Promise = require("bluebird");
var Schema = mongoose.Schema;

var User = mongoose.model("User", new Schema({
	"name": {"type": String, unique : true, required : true, lowercase: true},
	"gravatar": String,
	"details": {},
	"filtered": Boolean,
	"partial": Boolean,
	"scores": {
		"againstFilteredCount": Number,
		"againstScore": Number,
		"againstTotalCount": Number,
		"againstUnfilteredCount": Number,
		"averageCommentsPerPr": Number,
		"averageCommentsPerPrForSort": Number,
		"emojis": Number,
		"forFilteredCount": Number,
		"forScore": Number,
		"forTotalCount": Number,
		"forUnfilteredCount": Number,
		"kudos": Number,
		"originalKudos": Number,
		"prCount": Number,
		"prScore": Number,
		"sentiment": Number,
		"percentile": Number
	},
	"strongestRepos": [{
		"name": String,
		"scores": {
			"kudos": Number,
			"prScore": Number,
			"forScore": Number,
			"againstScore": Number,
			"averageCommentsPerPr": Number,
			"sentiment": Number,
			"emojis": Number
		},
		"prs": [{type: mongoose.Schema.Types.ObjectId, ref: "PullRequest"}],
		"against": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}],
		"for": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}]
	}],
	"weakestRepos": [{
		"name": String,
		"scores": {
			"kudos": Number,
			"prScore": Number,
			"forScore": Number,
			"againstScore": Number,
			"averageCommentsPerPr": Number,
			"sentiment": Number,
			"emojis": Number
		},
		"prs": [{type: mongoose.Schema.Types.ObjectId, ref: "PullRequest"}],
		"against": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}],
		"for": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}]
	}],
	"repos": [{
		"name": String,
		"scores": {
			"kudos": Number,
			"prScore": Number,
			"forScore": Number,
			"againstScore": Number,
			"averageCommentsPerPr": Number,
			"sentiment": Number,
			"emojis": Number
		},
		"prs": [{type: mongoose.Schema.Types.ObjectId, ref: "PullRequest"}],
		"against": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}],
		"for": [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}]
	}]
}));

Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

module.exports = User;
