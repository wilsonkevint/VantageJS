var config = require('./socketServer.json');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = config.webPort;
var ws = { hilows: null, current: null, forecast: null, alerts: null };
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.get('/', (req, res) => {
    var origin = req.headers['allow-origin'];
    var allowOrigin;
    var allowOrigins = config.allowOrigins.filter(function (o) {
        if (o.includes(origin))
            return true;
        else
            return false;
    });
    if (allowOrigins.length)
        allowOrigin = allowOrigins[0];
    res.header("Access-Control-Allow-Origin", allowOrigin);
    if (ws.current)
        res.send(JSON.stringify(ws.current));
    else
        res.send('no data');
});
app.post('/*', function (req, res) {
    if (req.url == '/current') {
        ws.current = req.body;
        io.emit('current', req.body);
    }
    if (req.url == '/hilows') {
        ws.hilows = req.body;
        io.emit('hilows', req.body);
    }
    if (req.url == '/alerts') {
        ws.alerts = req.body;
        io.emit('alerts', req.body);
    }
    res.writeHead(200);
    res.end("");
});
server.listen(port, function () {
    console.log('Server listening at port %d', port);
});
io.on('connection', function (socket) {
    if (ws.current) {
        socket.emit('current', JSON.stringify(ws.current));
    }
    if (ws.hilows) {
        socket.emit('hilows', JSON.stringify(ws.hilows));
    }
    if (ws.alerts) {
        socket.emit('alerts', JSON.stringify(ws.alerts));
    }
    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
    });
});
//# sourceMappingURL=expressServer.js.map