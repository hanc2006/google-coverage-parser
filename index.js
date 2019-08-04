// extend native
String.prototype.substitute = function (args) { return this.replace(/\{(.*?)\}/g, function (i, match) { return args[match]; }); };
Array.prototype.groupBy = function (prop) { return this.reduce(function (groups, item) { const val = item[prop]; groups[val] = groups[val] || []; groups[val].push(item); return groups }, {}) };

let download = require('./lib/download.js');
let pd = require('./lib/pretty.js').pd;
import hljs from 'highlight.js';
import css from 'highlight.js/lib/languages/javascript';
hljs.registerLanguage('css', css);

let wantZip = true; //zip all css otherwise generate single css download
let coverages = [];

// download all coverage results
Promise.all([
  import('./data/coverage_page1.js'),
  import('./data/coverage_page2.js'),
]).then((results) => {
  // google coverage tool export a json file that contain an object array of coverage results (css/js files)
  // merge and group the results for each covered pages
  results.forEach((page) => { coverages = coverages.concat(page.default); });

  // group coverages for url (file name) 
  // remove redundant data (full css text content is present in every coverage)
  coverages.groupBy('url');

  // start
  console.clear();
  console.log('start cleaning css');
  parse_coverge(coverages);
});

function parse_coverge(coverages) {

  let rules;
  let intervals;
  let zip;

  if (wantZip) {
    zip = new require('./lib/zip.js')();
  }

  coverages.forEach((source, i) => {

    // loop all coverage results (only css files)
    let i = 1;
    if (source.url.endsWith('.css')) { 

      // intersection between arrays ranges 
      rules = '';
      intervals = merge_intervals(source.ranges.map(range => [range.start, range.end]));
      intervals.forEach((range) => {
        rules += source.text.substring(range[0], range[1]);
      });
      // resolve file name from url
      let fileName = source.url.split('\\').pop().split('/').pop();

      // prettify css rules
      // create direct download or add css in zip
      if (wantZip) {
        zip.file(fileName, pd.css(rules));
      } else {
        download(pd.css(rules), fileName, 'text/html');
      }
      console.log('clean css is ready: ' + source.url);
      if(i === 1) { document.getElementById('result').insertAdjacentHTML("afterend", `<p>Removed unused rules with success from: ${fileName}</p>`)};
      ++i;
    }
  });

  if (wantZip) {
    // finally download zip content
    zip.generateAsync({ type: "blob" })
      .then((content) => {
        let name = 'coverages_{t}.zip'.substitute({ t: new Date().getTime() });
        download(content, name, 'application/x-zip-compressed');
      });
  }

  console.log('end!');
}

function merge_intervals(ranges) {
  /**
   * https://gist.github.com/mediaupstream/66293afd101cf4f1970e
   */
  if (!ranges.length) return;
  // sort ranges based on start time
  ranges = ranges.sort((a, b) => {
    return a[0] - b[0]
  })
  // push the first interval onto the stack
  var stack = [ranges[0]]

  // start from next interval, merge if necessary
  for (var i = 1; i < ranges.length; i++) {
    // get the top of the stack
    var top = stack[stack.length - 1]
    // if current interval is not overlapping with the stack top
    // push it to the stack
    if (top[1] < ranges[i][0]) {
      stack.push(ranges[i])
      continue;
    }
    // update end time of previous interval range
    // if the current interval end time is larger
    if (top[1] < ranges[i][1]) {
      stack[stack.length - 1][1] = ranges[i][1]
    }
  }
  return stack;
}