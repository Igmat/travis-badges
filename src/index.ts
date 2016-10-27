import * as express from 'express';
const Travis = require('travis-ci');
var travis = new Travis({
  version: '2.0.0'
});
const badge = require('gh-badges');

var app = express();
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
//  /^\/(.+)/
app.get('/repos/(*)', (req, res) => {
  var repo = req.params[0];
  travis.repos(repo).get((err, repoResponse) => {
    let lastBuildId = repoResponse.branch.id;
    travis.builds(lastBuildId).get(async (err, buildResponse) => {
      let result = await Promise.all((buildResponse.jobs as Array<any>).map((job) => {
        let colorscheme: 'brightgreen' | 'green' | 'yellow' | 'yellowgreen' | 'orange' | 'red' | 'blue' | 'grey' | 'gray' | 'lightgrey' | 'lightgray';
        switch (job.state) {
          case 'passed':
            colorscheme = 'green';
            break;
          case 'started':
            colorscheme = 'yellow';
            break;
          case 'failed':
            colorscheme = 'red';
            break;
          default:
            colorscheme = 'gray';
            break;
        }
        return new Promise((resolve: (value: {svg: string, state: string}) => void) => {
          badge({ text: ['node v' + job.config.node_js, job.state], colorscheme, template: 'flat' },
            (svg, err) => {
              resolve({
                svg,
                state: job.state
              });
              // svg is a String of your badge.
            });
        });
      }));
      let jobResult = result[req.query && req.query.job || 0];
      res.status(200);
      res.header('Cache-Control', 'no-cache, private');
      res.header('Pragma', 'no-cache');
      res.header('Etag', lastBuildId.toString() + jobResult.state);
      res.header('Expires', new Date().toUTCString());
      res.contentType('image/svg+xml');
      res.send(jobResult.svg);
    });
  });
});

app.listen(app.get('port'), () => {
  console.log('Node app is running at localhost:' + app.get('port'));
});
