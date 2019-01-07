/**
 * rewebrtc-server project
 *
 * Tho Q Luong <thoqbk@gmail.com>
 * Feb 12, 2017
 */

var express = require('express');
var app = express();
// var path = require("path");
// var fs = require("fs");
// var open = require("open");
// var httpsOptions = {
//   key: fs.readFileSync("./fake-keys/privatekey.pem"),
//   cert: fs.readFileSync("./fake-keys/certificate.pem")
// };
// let isLocal = process.env.PORT == null;
// var serverPort = process.env.PORT || 8080;
// var server = null;

var server = require('http').createServer(app);

var io = require('socket.io')(server);
const users = {};
let socketIdToNames = {};
//------------------------------------------------------------------------------
//  Serving static files

server.listen(process.env.PORT || 8080, function() {
	console.log('server is running at 8080');
});

//------------------------------------------------------------------------------
//  WebRTC Signaling
function socketIdsInRoom(roomId) {
	var socketIds = io.nsps['/'].adapter.rooms[roomId];
	if (socketIds) {
		var collection = [];
		for (var key in socketIds) {
			collection.push(key);
		}
		return collection;
	} else {
		return [];
	}
}
io.on('connection', function(socket) {
	console.log('connected', socket.id);

	socket.on('init', (data) => {
		users[data.user] = socket;
	});

	socket.on('disconnect', function() {
		console.log('in the disconnnect', socket.id);
		delete users[socketIdToNames[socket.id]];
		delete socketIdToNames[socket.id];
		let room = socket.room;
		if (socket.room) {
			io.to(room).emit('disconnect', socket.id);
			socket.leave(room);
		}
	});
	socket.on('endCall', function({ fromUser, toUser }) {
		console.log('end call,socket.id', socket.id);
		console.log('from and tooooooooooooo', fromUser, toUser);
		const roomId = [ fromUser, toUser ].sort().join('');
		socket.leave(roomId);
		users[toUser.toString()].leave(roomId);
		users[toUser.toString()].emit('endCall', { fromUser });
	});
	/**
   * Callback: list of {socketId, name: name of user}
   */
	socket.on('calling', function({ fromUser, toUser }) {
		console.log('to user0----', toUser);
		users[toUser.toString()].emit('calling', { fromUser });
	});

	socket.on('reject', function({ fromUser, toUser }) {
		console.log('to user0----', toUser);
		const anotherUserSocket = users[toUser.toString()];
		anotherUserSocket.emit('reject', { fromUser });
		anotherUserSocket.leave([ fromUser.toString(), toUser.toString() ].sort().join(''));
		// const room = anotherUserSocket.room;
		// if (room) anotherUserSocket.leave(room);
	});

	socket.on('join', function(joinData, callback) {
		//Join room
		let roomId = joinData.roomId;
		let name = joinData.name;
		socket.join(roomId);
		socket.room = roomId;
		socketIdToNames[socket.id] = name;
		var socketIds = socketIdsInRoom(roomId);
		let friends = socketIds
			.map((socketId) => {
				return {
					socketId: socketId,
					name: socketIdToNames[socketId]
				};
			})
			.filter((friend) => friend.socketId != socket.id);
		callback(friends);
		//broad
		friends.forEach((friend) => {
			io.sockets.connected[friend.socketId].emit('join', {
				socketId: socket.id,
				name
			});
		});
		console.log('Join: ', joinData, io.sockets.connected);
	});

	socket.on('exchange', function(data) {
		console.log('exchange', data);
		console.log('socket.id--', socket.id);
		data.from = socket.id.toString();
		console.log('lsjfdlsfdkfjslfjsodf', data.to);
		console.log('socket data', io.sockets.connected);
		var to = io.sockets.connected[data.to.toString()];
		console.log('to--->>', to);
		to.emit('exchange', data);
	});

	socket.on('count', function(roomId, callback) {
		var socketIds = socketIdsInRoom(roomId);
		callback(socketIds.length);
	});
});
