import * as express from 'express';
const webshot = require('webshot');
import * as request from 'request';
import * as temp from 'temp';
import * as fs from 'fs';

var app = express();
declare var url;
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
//  /^\/(.+)/
app.get('/repos/(*)', (req, res) => {
  var repo = req.params[0];
  var html = '<br/><table><tr><th>Builds</th></tr>';
  var options = {
    url: 'https://api.travis-ci.org/repos/' + repo,
    headers: {
      'Accept': 'application/vnd.travis-ci.2+json'
    }
  };
  request(options, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      res.status(400);
      url = req.url;
      res.send('Branch build id not found');
      return;
    }

    var buildId = JSON.parse(body).branch.id;
    if (!buildId) {
      res.status(400);
      url = req.url;
      res.send('Branch build id not found');
    }
    var options2 = {
      url: 'https://api.travis-ci.org/builds/' + buildId,
      headers: {
        'Accept': 'application/vnd.travis-ci.2+json'
      }
    };
    request(options2, (error2, response2, body2) => {
      if (error2 || response2.statusCode !== 200) {
        res.status(400);
        url = req.url;
        res.send('Error retrieving build');
        return;
      }
      //console.log(body2);
      var jobs = JSON.parse(body2).jobs;
      if (!jobs) {
        res.status(400);
        url = req.url;
        res.send('Jobs not found in build');
      }
      jobs.forEach(function (job) {
        var state = job.state;
        var number = job.number;
        html += '<td>' + number + ' ';
        if (state === 'passed') {
          html += '<span style="color:green;">passed</span>';
        } else if (state === 'failed') {
          html += '<span style="color:red;">failed</span>';
        } else {
          html += state;
        }
        html += '</td></tr>';
      });
      //console.log(html);
      html += '</table>';
      html += '<br/>Build ID: ' + buildId;
      screenShot(html, (original, cleanupScreenShot) => {
        writeFileToResponse(original, res, () => {
          cleanupScreenShot();
        });
      });
    });

  });
});

app.listen(app.get('port'), () => {
  console.log('Node app is running at localhost:' + app.get('port'));
});

function createTempPng() {
  return temp.path({ suffix: '.png' });
}

function writeFileToResponse(file: string, resp, callback) {
  resp.writeHead(200, { 'Content-Type': 'image/png' });
  fs.readFile(file, (err, data) => {
    resp.end(data);
    callback();
  });
}

function cleanupTempFile(file: string) {
  fs.unlink(file, (err) => {
    if (err) console.error(err);
  });
}

function screenShot(html, callback) {
  var original = createTempPng();
  var options = {
    shotSize: {
      width: 320,
      height: 'all'
    },
    siteType: 'html'
  };
  webshot(html, original, options, (err) => {
    callback(original, () => {
      cleanupTempFile(original);
    });
  });
}
