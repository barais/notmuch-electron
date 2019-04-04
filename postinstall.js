// Allow angular using electron module (native node modules)
// Patch electron spellchecker
const fs = require('fs');
const f_angular = 'node_modules/@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/browser.js';
const f_spellchecker = 'node_modules/electron-spellchecker/src/spell-check-handler.js';

fs.readFile(f_angular, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }f_spellchecker
  var result = data.replace(/target: "electron-renderer",/g, '');
  var result = result.replace(/target: "web",/g, '');
  var result = result.replace(/return \{/g, 'return {target: "electron-renderer",');

  fs.writeFile(f_angular, result, 'utf8', function (err) {
    if (err) return console.log(err);
  });
});


fs.readFile(f_spellchecker, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  var result = data.replace(/Observable'/g , 'Rx\'');

  fs.writeFile(f_spellchecker, result, 'utf8', function (err) {
    if (err) return console.log(err);
  });
});
