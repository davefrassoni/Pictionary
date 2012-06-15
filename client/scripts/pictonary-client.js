$(document).ready(function() {
	var socket = io.connect('/');
	
	var status = $('#status'),
		people = $('#people'),
		chatinput = $('#chatinput'),
		chatnick = $('#chatnick');
	
	socket.on('connect', function () {
		status.text('status: online');
		chatinput.removeProp('disabled');
		chatnick.removeProp('disabled');
		chatinput.focus();
	});
	
	socket.on('users', function (users) {
		people.text('');
		for(var i in users)
		{
			people.append('<p>' + users[i].score + ' | <span style="color:' + users[i].color + '">' + users[i].nick + '</span></p>');
		}
	});
	
	// ================================================
	//                                 chat section
	// ================================================
	
	var chatcontent = $('#chatcontent'),
		changenickcolor = $('#changenickcolor'),
		myNick = 'guest';
	
	chatinput.keydown(function(e) {
		if (e.keyCode === 13) {
			sendMessage();
		}
	});
	
	function sendMessage()	{
		var msg = chatinput.val();
		if (!msg) {
			return;
		}
		if(msg == 'cls' | msg == 'clear') {
			chatcontent.text('');
			chatinput.val('');
			return;
		}
		if(myNick != chatnick.val()) {
			nickChange();
		}
		
		socket.emit('message', { text: msg });
		chatinput.val('');
	}
	
	chatnick.keydown(function(e)	{
		if (e.keyCode === 13) {
			nickChange();
		}
	});
	
	function nickChange() {
		var msg = chatnick.val();
		if (!msg || msg == myNick) {
			return;
		}
		
		socket.emit('nickChange', { nick: msg });
		myNick = msg;
	}
	
	socket.on('message', function(msg) {
		chatcontent.append('<p><span style="color:' + msg.color + '">' + msg.nick + '</span>: ' + msg.text + '</p>');
		chatScrollDown();
	});
	
	socket.on('userJoined', function (user) {
		chatcontent.append('<p>&raquo; <span style="color:' + user.color + '">' + user.nick + '</span> joined.</p>');
		chatScrollDown();
	});
	
	socket.on('userLeft', function (user) {
		chatcontent.append('<p>&raquo; <span style="color:' + user.color + '">' + user.nick + '</span> left.</p>');
		chatScrollDown();
	});
	
	socket.on('nickChange', function (user) {
		chatcontent.append('<p><span style="color:' + user.color + '">' + user.oldNick + '</span> changed his nick to <span style="color:' + user.color + '">' + user.newNick + '</span></p>');
		chatScrollDown();
	});

	function chatScrollDown() {
		chatcontent.scrollTop(chatcontent[0].scrollHeight);
	};
	
	changenickcolor.click(function() {
		socket.emit('changeNickColor');
	});
	
	// ================================================
	//                           canvas drawing section
	// ================================================
	
	var canvas = $('#canvas'),
		clearcanvas = $('#clearcanvas'),
		clearchat = $('#clearchat'),
		selectedcolor = $('.color'),
		context = canvas[0].getContext('2d'),
		lastpoint = null,
		painting = false,
		myturn = false;
	
	socket.on('draw', draw);
	
	function draw(line) {
		context.lineJoin = 'round';
		context.lineWidth = 2;
		context.strokeStyle = line.color;
		context.beginPath();
		
		if(line.from) {
			context.moveTo(line.from.x, line.from.y);
		}else{
			context.moveTo(line.to.x-1, line.to.y);
		}
		
		context.lineTo(line.to.x, line.to.y);
		context.closePath();
		context.stroke();
	}
	
	// Disable text selection on the canvas
	canvas.mousedown(function () {
		return false;
	});
	
	canvas.mousedown(function(e) {
		if(myturn) {
			painting = true;
			var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop},
				line = { from: null, to: newpoint, color: selectedcolor.val() };
			
			draw(line);
			lastpoint = newpoint;
			socket.emit('draw', line);
		}
	});
	
	canvas.mousemove(function(e) {
		if(myturn && painting) {
			var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop},
				line = { from: lastpoint, to: newpoint, color: selectedcolor.val() };
			
			draw(line);
			lastpoint = newpoint;
			socket.emit('draw', line);
		}
	});
	
	canvas.mouseout(function(e) {
		painting = false;
	});
	
	canvas.mouseup(function(e) {
		painting = false;
	});
	
	socket.on('drawCanvas', function(canvasToDraw) {
		if(canvasToDraw) {
			canvas.width(canvas.width());
			context.lineJoin = 'round';
			context.lineWidth = 2;
			
			for(var i=0; i < canvasToDraw.length; i++)
			{		
				var line = canvasToDraw[i];
				context.strokeStyle = line.color;
				context.beginPath();
				if(line.from){
					context.moveTo(line.from.x, line.from.y);
				}else{
					context.moveTo(line.to.x-1, line.to.y);
				}
				context.lineTo(line.to.x, line.to.y);
				context.closePath();
				context.stroke();
			}
		}
	});
	
	clearcanvas.click(function() {
		if(myturn) {
			socket.emit('clearCanvas');
		}
	});
	
	socket.on('clearCanvas', function() {
		context.clearRect ( 0 , 0 , canvas.width() , canvas.height() );
	});
	
	clearchat.click(function() {
		chatcontent.text('');
		chatinput.val('');
		chatinput.focus();
	});
	
	// ================================================
	//                           pictionary logic section
	// ================================================
	
	var readytodraw = $('#readytodraw'),
		myword = '',
		timeleft = 120,
		drawingTimer = null;
	
	readytodraw.click(function() {
		socket.emit('readyToDraw');
	});
	
	socket.on('youDraw', function(word) {
		myturn = true;
		canvas.css('background-color', '#fff');
		myword = word;
		status.text('Your word is: ' + myword[0] + ' (difficulty: ' + myword[1] + ')');
		readytodraw.prop('value', 'Pass (' + timeleft + ')');
		
		// turn on drawing timer
		drawingTimer = setInterval( timerTick, 1000 );
	});
	
	socket.on('firendDraw', function(msg) {
		chatcontent.append('<p>&raquo; <span style="color:' + msg.color + '">' + msg.nick + '</span> is drawing!</p>');
		chatScrollDown();
	});
	
	socket.on('youCanDraw', function(msg) {
		if(myturn) {
			myturn = false;
			canvas.css('background-color', '#ccc');
			status.text('status: online');
		}
		chatcontent.append('<p>Click <strong>Ready to draw!</strong> button to draw.</p>');
		chatScrollDown();
	});
	
	socket.on('wordGuessed', function(msg) {
		chatcontent.append('<p>&raquo; <span style="color:' + msg.color + '">' + msg.nick + '</span> guessed the word (<strong>' + msg.text + '</strong>) !!!</p>');
		chatScrollDown();
		if(myturn = true) {
			timeleft = 120;
			clearInterval(drawingTimer);
			drawingTimer = null;
			readytodraw.prop('value', 'Ready to draw!');
		}
	});
	
	socket.on('wordNotGuessed', function(msg) {
		chatcontent.append('<p>&raquo; The turn is over! The word was <strong>' + msg.text + '</strong>.</p>');
		chatScrollDown();
		if(myturn = true) {
			timeleft = 120;
			clearInterval(drawingTimer);
			drawingTimer = null;
			readytodraw.prop('value', 'Ready to draw!');
		}
	});
	
	function timerTick() {
		if(timeleft > 0) {
			timeleft--;
			readytodraw.prop('value', 'Pass (' + timeleft + ')');
		} else {
			timeleft = 120;
			clearInterval(drawingTimer);
			drawingTimer = null;
			readytodraw.prop('value', 'Ready to draw!');
		}
	}
});