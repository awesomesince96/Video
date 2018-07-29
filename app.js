"use strict";

import React, { Component } from "react";
import {
  AppRegistry,
  Platform,
  StyleSheet,
  Text,
  AsyncStorage,
  View,
  TouchableHighlight,
  TextInput,
  ListView,
  ScrollView
} from "react-native";
import io from "socket.io-client";
let socket = io.connect(
  "http://192.168.43.247:8080",
  { transports: ["websocket"] }
);
import {
  RTCPeerConnection,
  RTCMediaStream,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStreamTrack,
  getUserMedia
} from "react-native-webrtc";

const configuration = { iceServers: [{ url: "stun:stun.l.google.com:19302" }] };
let pc = null;
let pcPeers = {};
let localStream;
let container;

export default class RTC extends Component {
  constructor(props) {
    super(props);
    this.ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => true });
    this.state = {
      info: "Initializing",
      status: "init",
      loginUser: "",
      toUser: "",
      login: true,
      roomID: "",
      isAccepted: false,
      isFront: true,
      startCall: true,
      selfViewSrc: null,
      remoteList: {},
      rejectCall: false,
      callingUser: false,
      endCall: true
    };
    this.press = this.press.bind(this);
    this.switchVideoType = this.switchVideoType.bind(this);
  }

  componentDidMount() {
    console.log("component did mount");
    container = this;
    // socket.connect();
    socket.on("calling", function({ fromUser }) {
      console.warn("formUser", fromUser);

      container.setState({
        callingUser: true,
        toUser: fromUser.toString(),
        startCall: false
      });
    });
    socket.on("reject", function({ fromUser }) {
      console.warn("formUser", fromUser);
      console.warn("socktetr---------->", socket.id);

      leave(socket.id);
      // container.setState({ endCall: true });
    });
    socket.on("endCall", function({ fromUser }) {
      console.log("formUser-------------------->>>>", fromUser);
      console.log("socktetr---------->", socket.id);
      leave(socket.id);
      // socket.close();
    });
  }
  login = async () => {
    console.warn("login user", this.state.loginUser);
    await AsyncStorage.setItem("user", this.state.loginUser);
    socket.emit("init", { user: this.state.loginUser });
    this.setState({ login: false });
  };
  endCall = () => {
    socket.emit("endCall", {
      fromUser: this.state.loginUser,
      toUser: this.state.toUser
    });
    leave(socket.id);
  };
  render() {
    return (
      <View style={styles.container}>
        <ScrollView style={{ flex: 1 }}>
          {this.state.login && (
            <View
              style={{ flexDirection: "row", justifyContent: "space-evenly" }}
            >
              <TextInput
                placeholder="Login"
                ref="roomID"
                autoCorrect={false}
                style={{
                  width: 100,
                  height: 40,
                  marginVertical: 10,

                  borderColor: "blue",
                  borderWidth: 1
                }}
                onChangeText={text => this.setState({ loginUser: text })}
                value={this.state.LoginUser}
              />

              <TouchableHighlight
                style={{
                  width: 100,
                  height: 40,
                  marginVertical: 10,
                  alignSelf: "center",
                  borderColor: "gray",
                  borderWidth: 1
                }}
                onPress={this.login}
              >
                <Text>Login</Text>
              </TouchableHighlight>
            </View>
          )}
          <Text style={styles.welcome}>{this.state.info}</Text>
          {/* <View style={{ flexDirection: "row" }}>
            <Text>
              {this.state.isFront ? "Use front camera" : "Use back camera"}
            </Text>
            <TouchableHighlight
              style={{ borderWidth: 1, borderColor: "black" }}
              onPress={this.switchVideoType}
            >
              <Text>Switch camera</Text>
            </TouchableHighlight> */}
          {/* </View> */}
          {this.state.status == "ready" ? (
            <View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-evenly"
                }}
              >
                <TextInput
                  placeholder="FROM"
                  ref="roomID"
                  autoCorrect={false}
                  style={{
                    width: 100,
                    height: 40,
                    borderColor: "gray",
                    borderWidth: 1
                  }}
                  onChangeText={text => this.setState({ loginUser: text })}
                  value={this.state.loginUser}
                />
                <TextInput
                  placeholder="TO"
                  ref="roomID"
                  autoCorrect={false}
                  style={{
                    width: 100,
                    height: 40,
                    borderColor: "gray",
                    borderWidth: 1
                  }}
                  onChangeText={text => this.setState({ toUser: text })}
                  value={this.state.toUser}
                />
              </View>
              {this.state.startCall && (
                <TouchableHighlight
                  style={{
                    width: 100,
                    height: 40,
                    marginVertical: 10,
                    alignSelf: "center",
                    borderColor: "gray",
                    borderWidth: 1
                  }}
                  onPress={this.press}
                >
                  <Text style={{ alignSelf: "center" }}>start call</Text>
                </TouchableHighlight>
              )}
            </View>
          ) : null}

          <RTCView streamURL={this.state.selfViewSrc} style={styles.selfView} />
          {this.state.remoteList &&
            mapHash(this.state.remoteList, function(remote, index) {
              return (
                <RTCView
                  key={index}
                  streamURL={remote}
                  style={styles.remoteView}
                />
              );
            })}
          <View
            style={{
              flexDirection: "column",
              justifyContent: "flex-end"
            }}
          >
            {this.state.isAccepted && (
              <TouchableHighlight
                style={{
                  width: 100,
                  height: 40,
                  marginTop: 200,
                  alignSelf: "center",
                  borderColor: "gray",
                  borderWidth: 1
                }}
                onPress={() => {
                  // socket.disconnect();
                  // this.setState({ remoteList: {}});
                  this.endCall();
                }}
              >
                <Text style={{ alignSelf: "center" }}>End call</Text>
              </TouchableHighlight>
            )}
          </View>
          {this.state.callingUser && (
            <View
              style={{ flexDirection: "row", justifyContent: "space-evenly" }}
            >
              <TouchableHighlight
                style={{
                  width: 100,
                  height: 40,
                  borderRadius: 20,
                  marginVertical: 10,
                  backgroundColor: "green",
                  alignSelf: "center",
                  borderColor: "green",
                  borderWidth: 1
                }}
                onPress={() => {
                  this.setState({ isAccepted: true, callingUser: false });
                  this.press();
                }}
              >
                <Text style={{ alignSelf: "center" }}>Accept</Text>
              </TouchableHighlight>
              <TouchableHighlight
                style={{
                  width: 100,
                  height: 40,
                  borderRadius: 20,
                  marginVertical: 10,
                  backgroundColor: "red",
                  alignSelf: "center",
                  borderColor: "red",
                  borderWidth: 1
                }}
                onPress={this.reject}
              >
                <Text style={{ alignSelf: "center" }}>Reject</Text>
              </TouchableHighlight>
            </View>
          )}
          {this.state.rejectCall && (
            <Text style={{ alignSelf: "center" }}>
              user has rejected the call
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }
  cleanState = () => {
    this.setState({
      info: "Please Enter to user",
      status: "ready",
      toUser: "",
      roomID: "",
      remoteList: {},
      rejectCall: false,
      callingUser: false
    });
  };
  press(event) {
    this.setState({
      status: "connect",
      info: "Connecting",
      roomID: [this.state.loginUser.toString(), this.state.toUser.toString()]
        .sort()
        .join("")
    });
    console.warn("room", this.state.roomID);
    join(this.state.roomID);

    !this.state.callingUser &&
      socket.emit("calling", {
        fromUser: this.state.loginUser,
        toUser: this.state.toUser
      });
  }
  reject = () => {
    socket.emit("reject", {
      fromUser: this.state.loginUser,
      toUser: this.state.toUser
    });
    this.cleanState();
  };
  switchVideoType() {
    const isFront = !this.state.isFront;
    this.setState({ isFront: isFront });
    getLocalStream(isFront, function(stream) {
      if (localStream) {
        for (let id in pcPeers) {
          let pc = pcPeers[id];
          pc && pc.removeStream(localStream);
        }
        localStream.release();
      }
      localStream = stream;
      container.setState({ selfViewSrc: stream.toURL() });

      for (let id in pcPeers) {
        let pc = pcPeers[id];
        pc && pc.addStream(localStream);
      }
    });
  }
}

function getLocalStream(isFront, callback) {
  console.log("##getLocalStream called");
  let videoSourceId;

  // on android, you don't have to specify sourceId manually, just use facingMode
  // uncomment it if you want to specify
  if (Platform.OS === "ios") {
    MediaStreamTrack.getSources(sourceInfos => {
      console.log("sourceInfos: ", sourceInfos);

      for (const i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == "video" &&
          sourceInfo.facing == (isFront ? "front" : "back")
        ) {
          videoSourceId = sourceInfo.id;
        }
      }
    });
  }
  getUserMedia(
    {
      audio: true,
      video: {
        mandatory: {
          minWidth: 640, // Provide your own width, height and frame rate here
          minHeight: 360,
          minFrameRate: 30
        },
        facingMode: isFront ? "user" : "environment",
        optional: videoSourceId ? [{ sourceId: videoSourceId }] : []
      }
    },
    function(stream) {
      console.log("getUserMedia success", stream);
      callback(stream);
    },
    logError
  );
}

function join(roomID) {
  console.warn("##join called", roomID);
  socket.emit(
    "join",
    { roomId: roomID, name: Math.floor(Math.random() * 10000000).toString() },
    function(socketIds) {
      console.log("join", socketIds);
      for (let i in socketIds) {
        let socketId = socketIds[i].socketId;
        createPC(socketId, true);
      }
    }
  );
}

function createPC(socketId, isOffer) {
  console.log("##createPC called", socketId);
  pc = new RTCPeerConnection(configuration);
  pcPeers[socketId] = pc;

  pc.onicecandidate = function(event) {
    console.log("onicecandidate", event.candidate);
    if (event.candidate) {
      socket.emit("exchange", {
        to: socketId,
        candidate: event.candidate
      });
    }
  };

  function createOffer() {
    console.log("##createOffer called");
    pc.createOffer(function(desc) {
      console.log("createOffer", desc);
      pc.setLocalDescription(
        desc,
        function() {
          console.log("setLocalDescription", pc.localDescription);
          socket.emit("exchange", {
            to: socketId,
            sdp: pc.localDescription
          });
        },
        logError
      );
    }, logError);
  }

  pc.onnegotiationneeded = function() {
    console.log("##onnegotiationneeded called");
    console.log("onnegotiationneeded");
    if (isOffer) {
      createOffer();
    }
  };

  pc.oniceconnectionstatechange = function(event) {
    console.log("##oniceconnectionstatechange called");
    console.log("oniceconnectionstatechange", event.target.iceConnectionState);
    if (event.target.iceConnectionState === "completed") {
      setTimeout(() => {
        getStats();
      }, 1000);
    }
    if (event.target.iceConnectionState === "connected") {
      // createDataChannel();
    }
  };
  pc.onsignalingstatechange = function(event) {
    console.log("##onsignalingstatechange called");
    console.log("onsignalingstatechange", event.target.signalingState);
  };

  pc.onaddstream = function(event) {
    console.log("##onaddstream called");
    console.log("onaddstream", event.stream);
    container.setState({ info: "Connected", isAccepted: true });

    let remoteList = container.state.remoteList;
    remoteList[socketId] = event.stream.toURL();
    container.setState({ remoteList: remoteList });
  };

  pc.onremovestream = function(event) {
    console.log("##onremovestreamdstream called");
    console.log("onremovestream", event.stream);
  };

  pc.addStream(localStream);

  // function createDataChannel() {
  //   console.log("##createDataChannel called");
  //   if (pc.textDataChannel) {
  //     return;
  //   }
  //   const dataChannel = pc.createDataChannel("text");

  //   dataChannel.onerror = function(error) {
  //     console.log("dataChannel.onerror", error);
  //   };

  //   dataChannel.onmessage = function(event) {
  //     console.log("dataChannel.onmessage:", event.data);
  //     container.receiveTextData({ user: socketId, message: event.data });
  //   };

  //   dataChannel.onopen = function() {
  //     console.log("dataChannel.onopen");
  //     container.setState({ textRoomConnected: true });
  //   };

  //   dataChannel.onclose = function() {
  //     console.log("dataChannel.onclose");
  //   };

  //   pc.textDataChannel = dataChannel;
  // }
  return pc;
}

function exchange(data) {
  console.log("##exchange (data) called---------------->>>>>>>>>>>.", data);
  const fromId = data.from;
  console.log("data from 999999999999999999999", data.from);
  let pc;
  if (fromId in pcPeers) {
    pc = pcPeers[fromId];
  } else {
    pc = createPC(fromId, false);
  }

  if (data.sdp) {
    console.log("exchange sdp", data);
    pc.setRemoteDescription(
      new RTCSessionDescription(data.sdp),
      function() {
        if (pc.remoteDescription.type == "offer")
          pc.createAnswer(function(desc) {
            console.log("createAnswer", desc);
            pc.setLocalDescription(
              desc,
              function() {
                console.log("setLocalDescription", pc.localDescription);
                socket.emit("exchange", {
                  to: fromId,
                  sdp: pc.localDescription
                });
              },
              logError
            );
          }, logError);
      },
      logError
    );
  } else {
    console.log("exchange candidate", data);
    pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
}

function leave(socketId) {
  console.warn("## leave called");
  console.log("leave", socketId);
  const pc = pcPeers[socketId];
  // const viewIndex = pc.viewIndex;
  // pc.close();
  delete pcPeers[socketId];

  const remoteList = container.state.remoteList;
  delete remoteList[socketId];
  container.setState({ remoteList: {} });
  container.setState({
    status: "ready",
    info: "Please enter from and to User",
    fromUser: "",
    toUser: "",
    login: true,
    startCall: true,
    loginUser: "",
    isAccepted: false,
    callingUser: false
  });

  // thicleanState();
}

socket.on("exchange", function(data) {
  console.log("## socket.on exchange called", data);
  exchange(data);
});
socket.on("leave", function(socketId) {
  console.log("## sockect.on leave called");
  leave(socketId);
});

socket.on("connect", function(data) {
  console.log("## sockect.on connect called");
  console.log("connect");
  getLocalStream(true, function(stream) {
    localStream = stream;
    container.setState({ selfViewSrc: stream.toURL() });
    container.setState({
      status: "ready",
      info: "Please fill from and to user"
    });
  });
});

function logError(error) {
  console.log("logError", error);
}

function mapHash(hash, func) {
  console.log("## mapHash(hash,func) called");
  console.log(hash, "## hash");
  const array = [];
  for (const key in hash) {
    const obj = hash[key];
    array.push(func(obj, key));
  }
  return array;
}

function getStats() {
  console.log("getStats called");
  const pc = pcPeers[Object.keys(pcPeers)[0]];
  if (
    pc.getRemoteStreams()[0] &&
    pc.getRemoteStreams()[0].getAudioTracks()[0]
  ) {
    const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
    console.log("track", track);
    pc.getStats(
      track,
      function(report) {
        console.log("getStats report", report);
      },
      logError
    );
  }
}

const styles = StyleSheet.create({
  selfView: {
    width: 100,
    height: 150,
    backgroundColor: "blue"
  },
  remoteView: {
    width: "100%",
    height: 300,
    // height: 150,
    backgroundColor: "green"
  },
  container: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "#F5FCFF"
  },
  welcome: {
    fontSize: 20,
    textAlign: "center",
    margin: 10
  },
  listViewContainer: {
    height: 150
  }
});
