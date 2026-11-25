"use strict";

window.BansayLive = {
  supported: Boolean(window.WebSocket),

  create({ getTicket, onStatus, onCaption, onTurn, onError, onDiscard }) {
    let active;
    let muted = false;

    function clearPlayback(session) {
      for (const source of session.playing) {
        source.stop();
        source.disconnect();
      }
      session.playing.clear();
      session.playAt = 0;
    }

    function stop() {
      const session = active;
      active = undefined;
      if (!session) return;
      clearTimeout(session.timer);
      clearTimeout(session.finishTimer);
      clearTimeout(session.turnTimer);
      clearPlayback(session);
      session.mic?.port.close();
      session.mic?.disconnect();
      session.input?.disconnect();
      session.stream?.getTracks().forEach((track) => track.stop());
      if (session.socket?.readyState === WebSocket.OPEN) {
        session.socket.send(JSON.stringify({ type: "stop" }));
      }
      session.socket?.close();
      session.context?.close().catch(() => {});
    }

    function fail(session, error, sampleAvailable = true) {
      if (active !== session) return;
      stop();
      onError(error, sampleAvailable);
    }

    function play(session, bytes) {
      if (muted || !session.context || !bytes.byteLength || bytes.byteLength % 2) return;
      const frames = bytes.byteLength / 2;
      if (Math.max(0, session.playAt - session.context.currentTime) + frames / session.outputRate > 12) {
        fail(session, "Live playback fell behind. Reconnect or use the offline sample.");
        return;
      }
      const view = new DataView(bytes);
      const buffer = session.context.createBuffer(1, frames, session.outputRate);
      const channel = buffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = view.getInt16(index * 2, true) / 32768;
      }
      const source = session.context.createBufferSource();
      source.buffer = buffer;
      source.connect(session.context.destination);
      session.playing.add(source);
      source.onended = () => {
        session.playing.delete(source);
        source.disconnect();
      };
      session.playAt = Math.max(session.playAt, session.context.currentTime + 0.015);
      source.start(session.playAt);
      session.playAt += buffer.duration;
    }

    function readyStatus(session) {
      if (!session.ready || session.typedPending) return;
      if (session.micPaused) onStatus("Live · microphone paused, type to continue");
      else if (session.mic) onStatus("Live · speak naturally or type");
      else onStatus(session.micStatus || "Live · type while microphone access is requested");
    }

    function receive(session, event) {
      if (active !== session) return;
      if (event.data instanceof ArrayBuffer) {
        play(session, event.data);
        return;
      }
      let result;
      try {
        result = JSON.parse(event.data);
      } catch {
        fail(session, "Live voice returned an unreadable message. Type a response or reconnect.");
        return;
      }
      switch (result.type) {
        case "ready":
          clearTimeout(session.timer);
          session.ready = true;
          readyStatus(session);
          break;
        case "input_transcript":
          onCaption("teacher", result.text);
          break;
        case "output_transcript":
          onCaption("student", result.text);
          break;
        case "interrupted":
          clearTimeout(session.turnTimer);
          session.typedPending = false;
          clearPlayback(session);
          onDiscard("Learner interrupted · listening for your next response");
          break;
        case "turn_complete": {
          clearTimeout(session.turnTimer);
          session.typedPending = false;
          const continueListening = onTurn(result.state);
          if (continueListening) {
            readyStatus(session);
          } else {
            const delay = Math.max(0, session.playAt - (session.context?.currentTime || 0));
            session.ready = false;
            session.stream?.getTracks().forEach((track) => track.stop());
            session.finishTimer = setTimeout(() => {
              if (active === session) {
                stop();
                onStatus("Live rehearsal ended.");
              }
            }, delay * 1000 + 100);
          }
          break;
        }
        case "turn_discarded":
          clearTimeout(session.turnTimer);
          session.typedPending = false;
          clearPlayback(session);
          onDiscard(result.error);
          break;
        case "error":
          fail(session, result.error, result.sampleAvailable !== false);
          break;
        case "session_end":
          fail(session, result.error || "Live voice ended. Reconnect or use the offline sample.");
          break;
      }
    }

    async function capture(session, ticket) {
      const { context, socket } = session;
      try {
        if (!context?.audioWorklet || !window.AudioWorkletNode || !navigator.mediaDevices?.getUserMedia) {
          session.micStatus = "Microphone unavailable · type to continue live";
          readyStatus(session);
          return;
        }
        await context.audioWorklet.addModule("/static/live-pcm.js");
        if (active !== session) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });
        if (active !== session) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        session.stream = stream;
        for (const track of stream.getTracks()) {
          track.addEventListener("ended", () => {
            session.micStatus = "Microphone disconnected · type to continue live";
            session.mic?.port.close();
            session.mic?.disconnect();
            session.mic = undefined;
            session.micPaused = false;
            readyStatus(session);
          });
        }
        session.input = context.createMediaStreamSource(stream);
        session.mic = new AudioWorkletNode(context, "bansay-pcm-capture", {
          channelCount: 1, channelCountMode: "explicit",
          processorOptions: { outputRate: ticket.inputRate },
        });
        session.input.connect(session.mic);
        session.mic.connect(context.destination);
        session.mic.port.onmessage = ({ data }) => {
          if (active !== session || !session.ready || session.micPaused ||
              session.typedPending || socket.readyState !== WebSocket.OPEN) return;
          if (socket.bufferedAmount > ticket.inputRate * 2 * 2) {
            fail(session, "Live voice fell behind. Type a response or reconnect.");
            return;
          }
          socket.send(data);
        };
        readyStatus(session);
      } catch (error) {
        if (active !== session) return;
        session.stream?.getTracks().forEach((track) => track.stop());
        session.micStatus = error.name === "NotAllowedError" ?
          "Microphone access was denied · type to continue live" :
          "Microphone unavailable · type to continue live";
        readyStatus(session);
      }
    }

    async function start(caseId) {
      stop();
      let context;
      try {
        if (window.AudioContext) {
          context = new AudioContext();
          context.resume().catch(() => {});
        }
      } catch {}
      const session = { context, playing: new Set(), playAt: 0 };
      active = session;
      onStatus("Connecting live voice…");
      try {
        const ticket = await getTicket(caseId);
        if (active !== session) return;
        session.outputRate = ticket.outputRate;
        const url = new URL(ticket.url, location.href);
        if (url.origin !== location.origin) throw new Error("Live voice returned an invalid connection.");
        url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
        const socket = new WebSocket(url);
        session.socket = socket;
        socket.binaryType = "arraybuffer";
        session.timer = setTimeout(() => fail(session, "Live voice did not connect. Try again or type."), 15000);
        socket.addEventListener("open", () => {
          if (active === session) socket.send(JSON.stringify({ type: "authenticate", ticket: ticket.ticket }));
        });
        socket.addEventListener("message", (event) => receive(session, event));
        socket.addEventListener("error", () => fail(session, "Live voice could not connect. Type a response or reconnect."));
        socket.addEventListener("close", () => {
          if (session.finishTimer || active !== session) return;
          fail(session, "Live voice disconnected. Type a response or reconnect.");
        });
        capture(session, ticket);
      } catch (error) {
        fail(session, error.message || "Live voice could not start. Type a response or reconnect.");
      }
    }

    return {
      get active() { return Boolean(active); },
      get micAvailable() { return Boolean(active?.mic && active.ready); },
      get micPaused() { return Boolean(active?.micPaused); },
      start,
      stop,
      toggleMic() {
        const session = active;
        if (!session?.mic || !session.ready) return;
        session.micPaused = !session.micPaused;
        session.stream.getAudioTracks().forEach((track) => { track.enabled = !session.micPaused; });
        if (session.micPaused && session.socket.readyState === WebSocket.OPEN) {
          session.socket.send(JSON.stringify({ type: "end_audio" }));
        }
        readyStatus(session);
      },
      sendText(text) {
        const session = active;
        if (!session?.ready || session.typedPending || session.socket.readyState !== WebSocket.OPEN) return false;
        session.typedPending = true;
        session.socket.send(JSON.stringify({ type: "text", text }));
        session.turnTimer = setTimeout(() => {
          fail(session, "The learner did not reply. Reconnect or use the offline sample.");
        }, 30000);
        onStatus("Waiting for the live learner…");
        return true;
      },
      setMuted(value) {
        muted = Boolean(value);
        if (muted && active) clearPlayback(active);
      },
    };
  },
};
