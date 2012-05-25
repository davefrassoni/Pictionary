$(document).ready(function() {
	var socket = io.connect('http://localhost:8080/');
	
	var status = $("#status");
	var people = $('#people');
	
	socket.on('connect', function ()
	{
		status.text('status: online');
		chatInput.removeAttr('disabled');
		chatNick.removeAttr('disabled');
		document.getElementById("chatInput").focus();
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
	
	var chatContent = $("#chatContent");
	var chatInput = $('#chatInput');
	var chatNick = $('#chatNick');
	
	chatInput.keydown(function(e)
	{
		if (e.keyCode === 13) {
			var msg = chatInput.val();
			if (!msg) {
				return;
			}
			if(msg == 'cls' | msg == 'clear') {
				chatContent.text('');
				chatInput.val('');
				return;
			}
			
			socket.emit('message', { text: chatInput.val() });
			chatInput.val('');
		}
	});
	
	chatNick.keydown(function(e)
	{
		if (e.keyCode === 13) {
			var msg = chatNick.val();
			if (!msg) {
				return;
			}
			
			socket.emit('nickChange', { nick: chatNick.val() });
		}
	});
	
	socket.on('message', function(msg)
	{
		chatContent.append('<p><span style="color:' + msg.color + '">' + msg.nick + '</span>: ' + msg.text + '</p>');
		
		chatScrollDown();
	});
	
	socket.on('userJoined', function (user)
	{
		chatContent.append('<p>&raquo; <span style="color:' + user.color + '">' + user.nick + '</span> joined.</p>');
		
		chatScrollDown();
	});
	
	socket.on('userLeft', function (user)
	{
		chatContent.append('<p>&raquo; <span style="color:' + user.color + '">' + user.nick + '</span> left.</p>');
		
		chatScrollDown();
	});
	
	socket.on('nickChange', function (user)
	{
		chatContent.append('<p><span style="color:' + user.color + '">' + user.oldNick + '</span> changed his nick to <span style="color:' + user.color + '">' + user.newNick + '</span></p>');
		
		chatScrollDown();
	});

	function chatScrollDown()
	{
		var objChatContent = document.getElementById("chatContent");
		objChatContent.scrollTop = objChatContent.scrollHeight;
	};
	
	// ================================================
	//                           canvas drawing section
	// ================================================
	
	var canvas = document.getElementById('canvas');
	var blackPencil =  document.getElementById('black');
	var redPencil =  document.getElementById('red');
	var greenPencil =  document.getElementById('green');
	var bluePencil =  document.getElementById('blue');
	var clearCanvas = document.getElementById('clearCanvas');
	var clearChat =  document.getElementById('clearChat');
	var context = canvas.getContext("2d");
	var lastpoint = null;
	var linecolor = "black";
	var painting = false;
	
	socket.on('draw', draw);
	
	function draw(line) {
		context.lineJoin = "round";
		context.lineWidth = 1;
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
		var line = { from: null, to: newpoint, color: linecolor };
		draw(line);
		lastpoint = newpoint;
		socket.emit('draw', line);
	});
	
	$("#canvas").mousemove(function(e){
		if(painting) {
			var newpoint = { x: e.pageX - this.offsetLeft, y: e.pageY - this.offsetTop};
			var line = { from: lastpoint, to: newpoint, color: linecolor };
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
	
	socket.on('clearCanvas', function() {
		canvas.width = canvas.width;
	});
	
	clearCanvas.onclick = function()
	{
		socket.emit('clearCanvas');
	};
	
	clearChat.onclick = function()
	{
		chatContent.text('');
		chatInput.val('');
	};
	
	blackPencil.onclick = function()
	{
		linecolor = "black";
		$('#black').css('border-style','inset');
		$('#red').css('border-style','outset');
		$('#green').css('border-style','outset');
		$('#blue').css('border-style','outset');
	};
	
	redPencil.onclick = function()
	{
		linecolor = "red";
		$('#black').css('border-style','outset');
		$('#red').css('border-style','inset');
		$('#green').css('border-style','outset');
		$('#blue').css('border-style','outset');
	};
	
	greenPencil.onclick = function()
	{
		linecolor = "green";
		$('#black').css('border-style','outset');
		$('#red').css('border-style','outset');
		$('#green').css('border-style','inset');
		$('#blue').css('border-style','outset');
	};
	
	bluePencil.onclick = function()
	{
		linecolor = "blue";
		$('#black').css('border-style','outset');
		$('#red').css('border-style','outset');
		$('#green').css('border-style','outset');
		$('#blue').css('border-style','inset');
	};
});