(() => {
  function create({
    onInput = () => {},
    onStatus = () => {},
    onState = () => {},
  } = {}) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synthesis = window.speechSynthesis;
    let autoListen = false;
    let muted = false;
    let listening = false;
    let speaking = false;
    let lastReply = "";
    let recognizer = null;
    let playback = null;

    function state() {
      onState({ listening, speaking, muted });
    }

    function stopPlayback() {
      if (playback) {
        playback = null;
        synthesis.cancel();
      }
      speaking = false;
    }

    function startRecognition() {
      const recognition = new Recognition();
      recognizer = recognition;
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        if (recognizer !== recognition) return;
        listening = true;
        onStatus("Listening…");
        state();
      };
      let outcome = "No speech was detected. Try again or type your response.";
      recognition.onresult = (event) => {
        if (recognizer !== recognition) return;
        const transcript = Array.from(event.results)
          .filter((result) => result.isFinal)
          .map((result) => result[0].transcript.trim()).join(" ").trim();
        if (transcript) {
          outcome = "Review your transcript before sending.";
          onInput(transcript, true);
        }
      };
      recognition.onerror = ({ error }) => {
        outcome = ["not-allowed", "service-not-allowed"].includes(error)
          ? "Microphone or speech recognition permission was denied. You can type your response."
          : "Speech recognition was unavailable. Try again or type your response.";
      };
      recognition.onend = () => {
        if (recognizer !== recognition) return;
        recognizer = null;
        listening = false;
        onStatus(outcome);
        state();
      };
      try {
        recognition.start();
      } catch {
        recognizer = null;
        onStatus("Speech recognition could not start. You can type your response.");
        state();
      }
    }

    function start() {
      if (recognizer) return;
      stopPlayback();
      if (Recognition) startRecognition();
      else {
        onStatus("Speech recognition is unavailable in this browser. You can type your response.");
        state();
      }
    }

    function pause() {
      stopPlayback();
      if (recognizer) {
        const previous = recognizer;
        recognizer = null;
        previous.abort();
      }
      listening = false;
      state();
    }

    function stop() {
      if (recognizer) recognizer.stop();
      else pause();
    }

    function speak(text, resume = true) {
      lastReply = text || lastReply;
      if (muted || !synthesis || !window.SpeechSynthesisUtterance || !lastReply) return;
      pause();
      const utterance = new SpeechSynthesisUtterance(lastReply);
      playback = utterance;
      utterance.lang = "en-US";
      utterance.rate = 0.94;
      speaking = true;
      onStatus("AI student is speaking…");
      state();
      utterance.onend = () => {
        if (playback !== utterance) return;
        playback = null;
        speaking = false;
        onStatus("");
        state();
        if (resume && autoListen) start();
      };
      utterance.onerror = () => {
        if (playback !== utterance) return;
        playback = null;
        speaking = false;
        onStatus("Playback is unavailable. Read the AI student’s reply in the conversation.");
        state();
      };
      synthesis.speak(utterance);
    }

    return {
      get supported() { return Boolean(Recognition); },
      get playbackSupported() { return Boolean(synthesis && window.SpeechSynthesisUtterance); },
      start,
      stop,
      pause,
      speak,
      repeat: () => speak(lastReply, false),
      setAutoListen(value) { autoListen = Boolean(value); },
      setMuted(value) {
        muted = Boolean(value);
        if (muted) stopPlayback();
        state();
      },
    };
  }

  window.BansayVoice = { create };
})();
