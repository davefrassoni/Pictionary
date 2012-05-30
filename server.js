var app = require('http').createServer(handler);
var io = require('socket.io').listen(app, { log: false });
var fs = require('fs');
var sanitizer = require('sanitizer');

app.listen(8080);
console.log('>>> Pictionary started at port 8080 >>>');

function handler (req, res) {
	fs.readFile(__dirname + '/client' + req.url,
	function (err, data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error loading requested file ' + req.url);
		}

		res.writeHead(200);
		res.end(data);
	});
}

var users = [], canvas = [];

// User connections
io.sockets.on('connection', function (socket) {
	var myNick = 'guest';
	var myColor = rndColor();
	
	users.push({ id: socket.id, nick: myNick, color: myColor });
	io.sockets.emit('userJoined', { nick: myNick, color: myColor });
	io.sockets.emit('users', users);
	socket.emit('drawCanvas', canvas);
	
	socket.on('message', function (msg) {
		var sanitizedMsg = sanitizer.sanitize(msg.text);
		if(sanitizedMsg != msg.text) {
			console.log('(!) Possible attack detected from ' + socket.id + ' (' + myNick + ') : ' + msg.text);
		}
		if(!sanitizedMsg || sanitizedMsg.length>256) {
			return;
		}
		
		io.sockets.emit('message', { text: sanitizedMsg, color: myColor, nick: myNick });
	});
	
	socket.on('nickChange', function (user) {
		var sanitizedNick = sanitizer.sanitize(user.nick);
		if(sanitizedNick != user.nick) {
			console.log('(!) Possible attack detected from ' + socket.id + ' (' + myNick + ') : ' + user.nick);
		}
		if(!sanitizedNick || myNick == sanitizedNick || sanitizedNick.length>32 ) {
			return;
		}
		
		io.sockets.emit('nickChange', { newNick:sanitizedNick, oldNick: myNick, color: myColor });
		myNick = sanitizedNick;
		
		for(var i = 0; i<users.length; i++) {
			if(users[i].id == socket.id) {
				users[i].nick = myNick;
				break;
			}
		}
		
		io.sockets.emit('users', users);
	});
	
	socket.on('disconnect', function () {
		io.sockets.emit('userLeft', { nick: myNick, color: myColor });
		for(var i = 0; i<users.length; i++) {
			if(users[i].id == socket.id) {
				users.splice(i,1);
				break;
			}
		}
		
		io.sockets.emit('users', users);
	});
	
	socket.on('draw', function (line) {
		canvas.push(line);
		socket.broadcast.emit('draw', line);
	});
	
	socket.on('clearCanvas', function () {
		canvas.splice(0, canvas.length);
		io.sockets.emit('clearCanvas');
	});
	
	function rndColor() {
		var color = '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
		return color;
	};
});