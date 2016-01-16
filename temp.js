var mongoose = require('mongoose');
var PullRequest = require('./models/PullRequest').PullRequest;
var moment = require("moment");
var Promise = require('bluebird');
var stats = require("stats-lite");
var Table = require("cli-table2");

Promise.promisifyAll(mongoose);

mongoose.connect("mongodb://localhost/contribcat", { keepAlive: 120 });
var db = mongoose.connection;

db.once('open', function() {
	var pullRequestDuration = {};
	var hrstart = process.hrtime();
	PullRequest.find().lean().execAsync().then((prs) => {
		var hrend = process.hrtime(hrstart);

		console.info("Execution time (hr): %ds %dms", hrend[0], hrend[1]/1000000);


		prs.forEach((pr) => {
			var createdDate = moment(pr.created_at);
			if (!pullRequestDuration[pr.base.repo.full_name]) {
				pullRequestDuration[pr.base.repo.full_name] = [];
			}
			if (pr.merged_at) {
				var mergedDate = moment(pr.merged_at);
				var diff = mergedDate.diff(createdDate);
				pullRequestDuration[pr.base.repo.full_name].push(moment.duration(diff).asDays());
			}
		});
		var table = new Table({
			head: ['Repository', "PR Count", "Max Merge Time", "Mean Merge Time", "Median Merge Time", "Variance", "Standard Deviation", "85th Percentile"]
		});

		var total = [];
		Object.keys(pullRequestDuration).forEach((key) => {
			var tableEntry = [
				key,
				pullRequestDuration[key].length,
				Math.max(...pullRequestDuration[key]).toFixed(2),
				stats.mean(pullRequestDuration[key]).toFixed(2),
				stats.median(pullRequestDuration[key]).toFixed(2),
				stats.variance(pullRequestDuration[key]).toFixed(2),
				stats.stdev(pullRequestDuration[key]).toFixed(2),
				stats.percentile(pullRequestDuration[key], 0.85).toFixed(2)
			];

			table.push(tableEntry);
			total = total.concat(pullRequestDuration[key]);
		});

		table.sort(function (a, b) {
			if (a[1] > b[1]) {
				return 1;
			}
			if (a[1] < b[1]) {
				return -1;
			}
			return 0;
		}).reverse();

		table.push([]);
		table.push([
			"Total",
			total.length,
			Math.max(...total).toFixed(2),
			stats.mean(total).toFixed(2),
			stats.median(total).toFixed(2),
			stats.variance(total).toFixed(2),
			stats.stdev(total).toFixed(2),
			stats.percentile(total, 0.85).toFixed(2)
		]);

		console.log(table.toString());

	}).finally(() => {
		mongoose.disconnect();
	});

});
