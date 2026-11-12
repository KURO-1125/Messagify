import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useThemeStore } from "../store/useThemeStore";
import { Image, Send, X, Loader2, Smile, Mic, Square } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";

const DARK_THEMES = new Set([
  "dark", "synthwave", "halloween", "forest", "black", "luxury",
  "dracula", "business", "night", "coffee", "dim", "sunset"
]);

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const {
    sendMessage,
    sendGroupMessage,
    sendTypingStatus,
    selectedUser,
    selectedGroup,
  } = useChatStore();
  const { theme } = useThemeStore();
  const isDark = DARK_THEMES.has(theme);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    if (!selectedUser && !selectedGroup) return;

    // Send typing status with debounce
    sendTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [showEmojiPicker]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone permission denied or unavailable");
    }
  };

  // Stop recording and send audio
  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current) return;

    clearInterval(recordingIntervalRef.current);
    const duration = recordingTime;

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        setIsSending(true);
        try {
          if (selectedGroup) {
            await sendGroupMessage(selectedGroup._id, {
              audio: base64Audio,
              audioDuration: duration,
            });
          } else if (selectedUser) {
            await sendMessage({
              audio: base64Audio,
              audioDuration: duration,
            });
          }
        } catch (e) {
          console.error("Failed to send audio message:", e);
        } finally {
          setIsSending(false);
          setIsRecording(false);
          setRecordingTime(0);
        }
      };
      reader.readAsDataURL(audioBlob);

      // Stop audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorderRef.current.stop();
  };

  // Cancel recording without sending
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      clearInterval(recordingIntervalRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !imagePreview) || isSending) return;

    try {
      setIsSending(true);
      setShowEmojiPicker(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendTypingStatus(false);

      const messagePayload = {
        text: text.trim(),
        image: imagePreview,
      };

      if (selectedGroup) {
        await sendGroupMessage(selectedGroup._id, messagePayload);
      } else if (selectedUser) {
        await sendMessage(messagePayload);
      }

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const formatRecordingTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="p-4 w-full relative">
      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-20 right-4 sm:right-12 z-50 shadow-2xl rounded-2xl overflow-hidden border border-base-300"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={isDark ? "dark" : "light"}
            searchDisabled={false}
            skinTonesDisabled
            width={320}
            height={380}
          />
        </div>
      )}

      {/* Image Preview Thumbnail */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-base-300"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-base-300 text-base-content
              flex items-center justify-center hover:bg-base-content/20"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Voice Recording Active UI */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 bg-base-200 p-2.5 rounded-xl border border-error/40 animate-pulse">
          <div className="flex items-center gap-2 text-error font-medium">
            <span className="size-3 rounded-full bg-error animate-ping inline-block"></span>
            <span>Recording audio: {formatRecordingTime(recordingTime)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="btn btn-sm btn-ghost text-base-content/70 hover:bg-base-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopAndSendRecording}
              className="btn btn-sm btn-error text-white font-medium"
              disabled={isSending}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send Audio
            </button>
          </div>
        </div>
      ) : (
        /* Standard Message Input Form */
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <div className="flex-1 flex gap-2 relative">
            <input
              type="text"
              className="w-full input input-bordered rounded-lg input-sm sm:input-md pr-10 bg-base-100 text-base-content border-base-300"
              placeholder={selectedGroup ? `Message #${selectedGroup.name}...` : "Type a message..."}
              value={text}
              onChange={handleTextChange}
              disabled={isSending}
            />

            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
              disabled={isSending}
            />

            {/* Emoji toggle button */}
            <button
              type="button"
              className={`btn btn-circle btn-sm sm:btn-md btn-ghost ${
                showEmojiPicker ? "text-primary" : "text-base-content/60"
              }`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={isSending}
              title="Emoji picker"
            >
              <Smile size={20} />
            </button>

            {/* Image attach button */}
            <button
              type="button"
              className={`hidden sm:flex btn btn-circle btn-sm sm:btn-md btn-ghost ${
                imagePreview ? "text-primary" : "text-base-content/60"
              }`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              title="Attach image"
            >
              <Image size={20} />
            </button>

            {/* Voice record button */}
            <button
              type="button"
              className="btn btn-circle btn-sm sm:btn-md btn-ghost text-base-content/60 hover:text-error"
              onClick={startRecording}
              disabled={isSending}
              title="Record voice note"
            >
              <Mic size={20} />
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-sm btn-circle btn-primary"
            disabled={(!text.trim() && !imagePreview) || isSending}
            title="Send"
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      )}
    </div>
  );
};

export default MessageInput;
