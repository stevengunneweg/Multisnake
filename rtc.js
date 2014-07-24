/*
WebRTC Data implementation for Chrome and Firefox
by Steven Gunneweg

Client creates a RTCManager instance.
Client calls 'connect()' method to connect to all other connected peers.
	'connect()' creates a connection with socket server and sends a connection request to all other connected clients.
Client implements:
	connectedToPeer = function() {}	//called after a datachannel is succesfully connected.
	receiveFromPeer = function() {} //called after datachannel receives a message.
	disconnectedFromPeer = function() {} //Called after peerconnection is closed.
*/

function RTCManager() {
	// Automatically call disconnect to other peer when closing the page
	window.onbeforeunload = function() {
		dataSendToPeer("s_disconnect");
	}
	//Public variables

	//Private variables
	var connectedToIO = false,
		socket,
		socketids = {},

		PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection,
		IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate,
		SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription,
		peerConnections = {},
		dataChannels = {},
		timeouts = {},

		timeoutTime = 1 * 1000, //1 second timeout
		paused = false,

		pc_config = {
			"iceServers":
			[
				{ 'url': 'stun:stun01.sipphone.com' },
				{ 'url': 'stun:stun.ekiga.net' },
				{ 'url': 'stun:stun.fwdnet.net' },
				{ 'url': 'stun:stun.ideasip.com' },
				{ 'url': 'stun:stun.iptel.org' },
				{ 'url': 'stun:stun.rixtelecom.se' },
				{ 'url': 'stun:stun.schlund.de' },
				{ 'url': 'stun:stun.l.google.com:19302' },
				{ 'url': 'stun:stun1.l.google.com:19302' },
				{ 'url': 'stun:stun2.l.google.com:19302' },
				{ 'url': 'stun:stun3.l.google.com:19302' },
				{ 'url': 'stun:stun4.l.google.com:19302' },
				{ 'url': 'stun:stunserver.org' },
				{ 'url': 'stun:stun.softjoys.com' },
				{ 'url': 'stun:stun.voiparound.com' },
				{ 'url': 'stun:stun.voipbuster.com' },
				{ 'url': 'stun:stun.voipstunt.com' },
				{ 'url': 'stun:stun.voxgratia.org' },
				{ 'url': 'stun:stun.xten.com' },
				{
					'url': 'turn:numb.viagenie.ca',
					'credential': 'muazkh',
					'username': 'webrtc@live.com'
				},
				{
					'url': 'turn:192.158.29.39:3478?transport=udp',
					'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
					'username': '28224511:1379330808'
				},
				{
					'url': 'turn:192.158.29.39:3478?transport=tcp',
					'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
					'username': '28224511:1379330808'
				}
			]
		};

	//Public methods
	connectedToPeer = null;
	receiveFromPeer = null;
	diconnectedFromPeer = null;
	this.connect = function() {
		init();
	}
	this.disconnect = function() {
		peerDisconnect();
	}
	this.sendToPeer = function(data) {
		dataSendToPeer(data);
	}
	this.sendToSpecificPeer = function(peer, data) {
		dataSendToSpecificPeer(peer, data);
	}
	this.pause = function(id) {
		paused = true;
		for (var peer_id in peerConnections) {
			clearTimeout(timeouts[peer_id]);
		}
		dataSendToPeer("s_pause");
	}
	//Private methods
	var init = function() {
		if (!connectedToIO) {
			socketConnect(function() {
				connectedToIO = true;
				socketSendRequest();
			});
		}
	}
	var disconnect = function() {
		peerDisconnect(id);
	}
	var pause = function(id) {
		clearTimeout(timeouts[id]);
		console.log('peer ' + id + ' paused');
	}

	//	WebSocket	//////////////////////////////////////////////////
	var socketConnect = function(succes) {
		try {
			//socket = io.connect('http://10.110.0.132:8001');
			socket = io.connect('http://10.110.0.132:8080');
			socket.on('server_data', socketRecieve);
			socket.on('server_request', socketGottenRequest);
			socket.on('disconnect', function () {
				socket.disconnect();
				socket = null;
				console.log('disconnected from socket');
			});
			succes();
		} catch(exception) {
			console.log('could not connect to socket server');
		}
	}

	var socketSend = function(target, id, data) {
		try {
			socket.emit('client_data', JSON.stringify({target: target, connectionId: id, connectionData: data}));
		} catch(exception) {
			console.log('could not send client_data to socket server');
		}
	}
	var socketRecieve = function(remote_data) {
		result = JSON.parse(remote_data);
		sender = result.target;
		id = result.connectionId;
		remote_data = result.connectionData;

		if (remote_data.type === 'offer') {
			socketGottenOffer(sender, id, remote_data);
		} else if (remote_data.type === 'answer' && peerConnections[id]) {
			socketGottenAnswer(sender, id, remote_data);
		} else if (remote_data.type === 'candidate' && peerConnections[id]) {
			socketGottenIce(sender, id, remote_data);
		}
	}

	var socketSendRequest = function() {
		try {
			socket.emit('client_request');
			console.log("Request sent");
		} catch(exception) {
			console.log('could not send request to socket server');
		}
	}
	var socketGottenRequest = function(sender) {
		console.log("Request received");
		var id = Math.round(Math.random() * 5000000000) + 1; //Create random uid
		initPeerConnection(id, function() {
			peerCreateOffer(id, function(offer) {
				socketSendOffer(sender, id, offer);
			});
			socketids[id] = sender;
			// console.log('request from ' + sender);
		});
	}
	var socketSendOffer = function(target, id, offer) {
		socketSend(target, id, offer);
		console.log("Sending offer...");
		// console.log('offer to ' + target);
	}
	var socketGottenOffer = function(sender, id, offer) {
		if (peerConnections[id] == null) {
			console.log("Offer received");
			initPeerConnection(id, function() {
				socketids[id] = sender;
				peerCreateAnswerToOffer(id, offer, function(answer) {
					socketSendAnswer(sender, id, answer);
				});
			});
		}
		// console.log('offer from ' + sender);
	}
	var socketSendAnswer = function(target, id, answer) {
		console.log("Sending answer...");
		socketSend(target, id, answer);
		// console.log('answer to ' + target);
	}
	var socketGottenAnswer = function(sender, id, answer) {
		console.log("Answer received");
		peerReceiveAnswer(id, answer);
		// console.log('answer from ' + sender);
	}
	var socketSendIce = function(target, id, ice_data) {
		socketSend(target, id, {
			type: "candidate",
			sdpMLineIndex: ice_data.sdpMLineIndex,
			sdpMid: ice_data.sdpMid,
			candidate: ice_data.candidate
		});
		// console.log('ice to ' + target);
	}
	var socketGottenIce = function(sender, id, ice_data) {
		// console.log('Received ICE candidate...');
		var candidate = new IceCandidate({sdpMLineIndex: ice_data.sdpMLineIndex, sdpMid: ice_data.sdpMid, candidate: ice_data.candidate});
		// console.log(candidate);
		peerConnections[id].addIceCandidate(candidate);

		// console.log('ice from ' + sender);
	}

	//	WebRTCPeerConnection	//////////////////////////////////////////////////
	var initPeerConnection = function(id, succes) {
		try {
			peerConnections[id] = new PeerConnection(pc_config);
			timeouts[id] = setTimeout(function() { peerDisconnectPeerConnection(id); }, timeoutTime);
			
			initDataChannel(id);
			
			peerConnections[id].onicecandidate = function(evt) {
				if (evt.candidate) {
					// console.log('Sending ICE candidate...');
					socketSendIce(socketids[id], id, evt.candidate);
				} else {
					// console.log("End of candidates.");
				}
			};
			succes();
		} catch (e) {
			console.log("Failed to create PeerConnection, exception: ", e.message);
		}
	}

	var peerSetLocalAndSendMessage = function(id, sessionDescription) {
		peerConnections[id].setLocalDescription(sessionDescription);
		// console.log("Sending: SDP");
		// console.log(sessionDescription);
		socketSend(id, sessionDescription);
	}

	var peerCreateOffer = function(id, succes) {
		peerConnections[id].createOffer(
			function(offer) { //Succes
				peerConnections[id].setLocalDescription(new SessionDescription(offer));
				succes(offer);
			},
			function() { //Fail
				console.error("offer not created");
			},
			{}
		);
	}
	var peerCreateAnswerToOffer = function(id, offer, succes) {
		peerConnections[id].setRemoteDescription(new SessionDescription(offer));
		peerConnections[id].createAnswer(
			function(answer) { //Succes
				peerConnections[id].setLocalDescription(answer);
				succes(answer);
			},
			function(e) { //Fail
				console.log("couldn't create anser");
			},
			{}
		);
	}
	var peerReceiveAnswer = function(id, answer) {
		// console.log('Received answer');
		peerConnections[id].setRemoteDescription(new SessionDescription(answer));
	}

	var peerDisconnect = function(id) {
		dataSendToPeer("s_disconnect");
		for (var id in peerConnections) {
			peerDisconnectPeerConnection(id);
		}
	}
	var peerDisconnectPeerConnection = function(id) {
		console.log('disconnecting ' + id);
		if (dataChannels[id])
			dataChannels[id].close();
		delete dataChannels[id];

		if (peerConnections[id])
			peerConnections[id].close();
		delete peerConnections[id];

		console.log("disconnected from " + id);
		if (diconnectedFromPeer)
			diconnectedFromPeer(id);
	}

	//	WebRTCDataChannel	//////////////////////////////////////////////////
	var initDataChannel = function(id) {
		var dataChannel = peerConnections[id].createDataChannel("datachannel_" + id, { reliable: false });

		dataChannel.onopen = dataOnOpen;
		dataChannel.onmessage = dataOnMessage;
		dataChannel.onclose = dataOnClose;
		dataChannel.onerror = dataOnError;

		dataChannels[id] = dataChannel;

		peerConnections[id].ondatachannel = function(e) {
			dataChannels[id] = e.channel;
			e.channel.onopen = dataOnOpen;
			e.channel.onmessage = dataOnMessage;
			e.channel.onclose = dataOnClose;
			e.channel.onerror = dataOnError;
		};
	}
	var dataOnOpen = function() {
		dataSendToPeer("s_succes");
	}
	var dataOnMessage = function(event) {
		dataReceiveMessage(event.data);
	}
	var dataOnClose = function() {
		console.log("The Data Channel is Closed");
	}
	var dataOnError = function(error) {
		console.log("Data Channel Error:", error);
	}
	var dataSendToPeer = function(message, succes, error) {
		for (var id in dataChannels) {
			if (dataChannels[id]) {
				if (dataChannels[id].readyState == "open") {
					try {
						dataChannels[id].send(JSON.stringify({connectionId: id, message: message}));
						if (succes)
							succes();
					} catch(exception) {
						console.error('length = ', JSON.stringify({connectionId: id, message: message}).length);
						console.log('failed to send message to peer; exception: ', exception);
						// peerDisconnectPeerConnection(id); //done to not spam console
					}
				} else {
					if (error)
						error();
				}
			} else {
				peerDisconnectPeerConnection(id);
			}
		}
	}
	var dataSendToSpecificPeer = function(peer, message, succes, error) {
		if (dataChannels[peer]) {
			if (dataChannels[peer].readyState == "open") {
				try {
					dataChannels[peer].send(JSON.stringify({connectionId: peer, message: message}));
				} catch(exception) {
					//TODO handle error correctly
					console.error('lenght = ', JSON.stringify({connectionId: peer, message: message}).lenght);
					console.log('failed to send message to ', peer, '; exception: ', exception);
					peerDisconnectPeerConnection(id); //done to not spam console
				}
				if (succes != null)
					succes();
			} else {
				if (error != null)
					error();
			}
		} else {
			peerDisconnectPeerConnection(peer);
		}
	}

	var dataReceiveMessage = function(message) {
		var result = JSON.parse(message);
		var id = result.connectionId;
		var message = result.message;
		switch(message) {
			case "s_disconnect":
				peerDisconnectPeerConnection(id);
				return;
				break;
			case "s_succes":
				clearTimeout(timeouts[id]);
				if (connectedToPeer)
					connectedToPeer(id);
				return;
				break;
			case "s_pause":
				pause(id);
				return;
				break;
		}
		if (receiveFromPeer)
			receiveFromPeer(id, message);

		clearTimeout(timeouts[id]);
		timeouts[id] = setTimeout(function() { peerDisconnectPeerConnection(id); }, timeoutTime);
	}
}
