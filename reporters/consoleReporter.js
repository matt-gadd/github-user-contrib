var Table = require("cli-table2");

module.exports = function (options) {
	return function (results) {
		var table = new Table({
			head: ['User', "Score", "Pull Requests"]
		});
		var users = results.users.map(function (user) {
			return {
				"name": user.name,
				"score": user.kudos,
				"prs": user.prs.length
			};
		});
		users.sort(function (a, b) {
			if (a.score > b.score) {
				return 1;
			}
			if (a.score < b.score) {
				return -1;
			}
			return 0;
		}).reverse();

		users.forEach(function (user, i) {
			if (i < 10) {
				table.push([
					user.name,
					user.score,
					user.prs
				]);
			}
		});
		console.log(table.toString());
		return users;
	};
}
