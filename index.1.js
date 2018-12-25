var loki = require('lokijs');
var db = new loki('loki.json');
db.addCollection('A');
db.addCollection('B');
db.deleteDatabase()

var a = db.listCollections()
console.log(a)
