module.exports = function (options) {
	return function (results) {
		Object.keys(results.users).forEach(function (username) {
			var user = results.users[username];
			var forScore = user.for.length * options.weighting.for;
			var againstScore = user.against.length * options.weighting.against;
			user.score = againstScore + forScore;
		});
		return results;
	};
}
