var Table = require("cli-table2");

module.exports = function (options) {
	return function (results) {
		var table = new Table({
			head: ['User', "Score", "Pull Requests"]
		});
		var users = Object.keys(results.users).map(function (username) {
			var user = results.users[username];
			return {
				"name": username,
				"score": user.score,
				"prs": user.prs.length,
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

		users.forEach(function (user) {
			table.push([
				user.name,
				user.score,
				user.prs
			]);
		});
		console.log(table.toString());
		return users;
	};
}
