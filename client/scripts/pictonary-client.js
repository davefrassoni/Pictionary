$(document).ready(function() {
	var socket = io.connect('http://localhost:8080/');
	
	var status = $("#status");
	var people = $('#people');
	
	socket.on('connect', function ()
	{
		status.text('status: online');
		chatinput.removeAttr('disabled');
		chatnick.removeAttr('disabled');
		document.getElementById("chatinput").focus();
	});
	
	socket.on('users', function (users)
	{
		people.text('');
		for(var i in users)
		{
			people.append('<p><span style="color:' + users[i].color + '">' + users[i].nick + '</span></p>');
		}
	});
	
	// ================================================
	//                                 chat section
	// ================================================
	
	var chatcontent = $("#chatcontent");
	var chatinput = $('#chatinput');
	var chatnick = $('#chatnick');
	var myNick = "guest";
	
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
	
	function nickChange()	{
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
	
	socket.on('userJoined', function (user)	{
		chatcontent.append('<p>&raquo; <span style="color:' + user.color + '">' + user.nick + '</span> joined.</p>');
		
		chatScrollDown();
	});
	
	socket.on('userLeft', function (user)	{
		chatcontent.append('<p>&raquo; <span style="color:' + user.color + '">' + user.nick + '</span> left.</p>');
		
		chatScrollDown();
	});
	
	socket.on('nickChange', function (user) {
		chatcontent.append('<p><span style="color:' + user.color + '">' + user.oldNick + '</span> changed his nick to <span style="color:' + user.color + '">' + user.newNick + '</span></p>');
		
		chatScrollDown();
	});

	function chatScrollDown() {
		var objchatcontent = document.getElementById("chatcontent");
		objchatcontent.scrollTop = objchatcontent.scrollHeight;
	};
	
	// ================================================
	//                           canvas drawing section
	// ================================================
	
	var canvas = document.getElementById('canvas');
	var clearcanvas = document.getElementById('clearcanvas');
	var clearchat = document.getElementById('clearchat');
	var selectedColor = $('#color');
	var context = canvas.getContext("2d");
	var lastpoint = null;
	var painting = false;
	
	// Disable text selection on the canvas
	canvas.onmousedown = function () { return false; }
	
	socket.on('draw', draw);
	
	function draw(line) {
		context.lineJoin = "round";
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
	
	$("#canvas").mousedown(function(e) {
		painting = true;
		var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop};
		var line = { from: null, to: newpoint, color: selectedColor.val() };
		draw(line);
		lastpoint = newpoint;
		socket.emit('draw', line);
	});
	
	$("#canvas").mousemove(function(e){
		if(painting) {
			var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop};
			var line = { from: lastpoint, to: newpoint, color: selectedColor.val() };
			draw(line);
			lastpoint = newpoint;
			socket.emit('draw', line);
		}
	});
	
	$("#canvas").mouseout(function(e){
		painting = false;
	});
	
	$("#canvas").mouseup(function(e){
		painting = false;
	});
	
	socket.on('drawCanvas', function(canvasToDraw)
	{
		if(canvasToDraw) {
			canvas.width = canvas.width;
			context.lineJoin = "round";
			context.lineWidth = 1;
			
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
	
	$('#colors').farbtastic({ callback:'#color', width:150 });
	
	clearcanvas.onclick = function()
	{
		socket.emit('clearCanvas');
	};
	
	socket.on('clearCanvas', function() {
		canvas.width = canvas.width;
	});
	
	clearchat.onclick = function()
	{
		chatcontent.text('');
		chatinput.val('');
		document.getElementById("chatinput").focus();
	};
});