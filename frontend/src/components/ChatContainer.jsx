import React, { useRef, useEffect, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeletons/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { formatMessageTime } from '../lib/utils';
import { 
  Check, 
  CheckCheck, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Smile, 
  Play, 
  Pause, 
  Download, 
  X, 
  ZoomIn, 
  Volume2 
} from 'lucide-react';

const QUICK_EMOJIS = ["❤️", "👍", "😂", "🔥", "😮", "😢"];

// Custom Inline Audio Player for Voice Notes
const AudioMessage = ({ audioSrc, duration, isFromMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    const dur = audioRef.current.duration || duration || 1;
    setCurrentTime(curr);
    setProgress((curr / dur) * 100);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const seekTime = (e.target.value / 100) * (audioRef.current.duration || duration || 1);
    audioRef.current.currentTime = seekTime;
    setProgress(e.target.value);
  };

  const formatAudioTime = (sec) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl min-w-[200px] sm:min-w-[240px] ${
      isFromMe ? "bg-primary-content/15 text-primary-content" : "bg-base-300/80 text-base-content"
    }`}>
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`btn btn-circle btn-sm shrink-0 shadow-sm ${
          isFromMe 
            ? "bg-primary-content text-primary hover:bg-primary-content/90 border-none" 
            : "btn-primary text-primary-content"
        }`}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleSeek}
          className={`range range-xs cursor-pointer w-full ${
            isFromMe ? "accent-primary-content" : "range-primary"
          }`}
        />
        <div className={`flex justify-between items-center text-[10px] px-0.5 ${
          isFromMe ? "text-primary-content/80" : "text-base-content/70"
        }`}>
          <span>{formatAudioTime(currentTime)}</span>
          <span className="flex items-center gap-0.5">
            <Volume2 size={10} />
            {formatAudioTime(duration || audioRef.current?.duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    getGroupMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    subscribeToMessages,
    unsubscribeFromMessages,
    isPartnerTyping,
    groupTypingUsers,
    editMessage,
    deleteMessage,
    reactToMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  // Local state for actions
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    } else if (selectedGroup?._id) {
      getGroupMessages(selectedGroup._id);
      subscribeToMessages();
    }

    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, selectedGroup?._id]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isPartnerTyping, groupTypingUsers]);

  // Handle Escape key to close lightbox and delete modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLightboxImage(null);
        setMessageToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleStartEdit = (message) => {
    setEditingMessageId(message._id);
    setEditText(message.text || "");
  };

  const handleSaveEdit = async (messageId) => {
    if (!editText.trim()) return;
    try {
      await editMessage(messageId, editText.trim());
      setEditingMessageId(null);
      setEditText("");
    } catch (e) {
      // error handled in store
    }
  };

  const promptDelete = (message) => {
    setMessageToDelete(message);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    const id = messageToDelete._id;
    setMessageToDelete(null);
    await deleteMessage(id);
  };

  const handleReaction = (messageId, emoji) => {
    reactToMessage(messageId, emoji);
  };

  // Group reactions by emoji and count
  const getReactionGroups = (reactions = []) => {
    const groups = {};
    reactions.forEach((r) => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = { emoji: r.emoji, count: 0, hasReacted: false };
      }
      groups[r.emoji].count += 1;
      if (r.userId === authUser?._id || r.userId?._id === authUser?._id) {
        groups[r.emoji].hasReacted = true;
      }
    });
    return Object.values(groups);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto relative">
      <ChatHeader />

      {/* In-Site Delete Confirmation Modal */}
      {messageToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setMessageToDelete(null)}
        >
          <div 
            className="bg-base-100 border border-base-300 rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 text-base-content animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-base-content leading-tight">Delete Message?</h3>
                <p className="text-xs text-base-content/60">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-base-content/80 leading-relaxed">
              Are you sure you want to delete this message? The content will be permanently removed for everyone in this chat.
            </p>

            {(messageToDelete.text || messageToDelete.audio || messageToDelete.image) && (
              <div className="bg-base-200 border-l-2 border-error/70 p-2.5 rounded-lg text-xs text-base-content/70 italic line-clamp-2">
                {messageToDelete.text ? (
                  <span>"{messageToDelete.text}"</span>
                ) : messageToDelete.audio ? (
                  <span>🎤 Voice note ({messageToDelete.audioDuration || 0}s)</span>
                ) : (
                  <span>📷 Image attachment</span>
                )}
              </div>
            )}

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="btn btn-sm btn-ghost hover:bg-base-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="btn btn-sm btn-error text-white font-medium shadow-sm"
              >
                Delete Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
              <a
                href={lightboxImage}
                target="_blank"
                rel="noreferrer"
                download
                className="btn btn-circle btn-sm bg-base-100/80 text-base-content hover:bg-base-100 border border-base-300 backdrop-blur-sm shadow-md"
                title="Open original"
              >
                <Download size={16} />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="btn btn-circle btn-sm bg-base-100/80 text-base-content hover:bg-base-100 border border-base-300 backdrop-blur-sm shadow-md"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Enlarged preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-base-300/40"
            />
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const senderObj = message.senderId;
          const senderId = senderObj?._id || senderObj;
          const isFromMe = String(senderId) === String(authUser?._id);
          const isEditing = editingMessageId === message._id;
          const isDeleted = message.isDeleted;
          const reactionGroups = getReactionGroups(message.reactions);

          const senderPic = isFromMe
            ? authUser?.profilePic || "/avatar.png"
            : senderObj?.profilePic || selectedUser?.profilePic || "/avatar.png";

          const senderName = isFromMe
            ? authUser?.userName
            : senderObj?.userName || selectedUser?.userName || "Member";

          return (
            <div
              key={message._id}
              className={`chat ${isFromMe ? "chat-end" : "chat-start"} group relative`}
              onMouseEnter={() => setHoveredMessageId(message._id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img src={senderPic} alt={senderName} />
                </div>
              </div>

              {/* Header: Sender name (if group) and timestamp */}
              <div className="chat-header mb-1 flex items-center gap-1.5 text-xs opacity-60">
                {selectedGroup && !isFromMe && (
                  <span className="font-semibold text-primary">{senderName}</span>
                )}
                <time>{formatMessageTime(message.createdAt)}</time>
                {message.isEdited && !isDeleted && (
                  <span className="italic text-[10px] opacity-75">(edited)</span>
                )}
                {isFromMe && (
                  <span title={message.isRead ? "Read" : "Sent"}>
                    {message.isRead ? (
                      <CheckCheck className="size-3.5 text-sky-400 inline" />
                    ) : (
                      <Check className="size-3.5 opacity-50 inline" />
                    )}
                  </span>
                )}
              </div>

              {/* Bubble Body */}
              <div
                className={`chat-bubble flex flex-col relative max-w-[85%] sm:max-w-[70%] ${
                  isDeleted
                    ? "bg-base-200 text-base-content/50 italic border border-dashed border-base-300"
                    : isFromMe
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content"
                }`}
              >
                {/* Image Attachment */}
                {message.image && !isDeleted && (
                  <div className="relative group/img cursor-pointer mb-2 overflow-hidden rounded-lg">
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="max-h-60 rounded-md object-cover w-full transition-transform duration-200 group-hover/img:scale-105"
                      onClick={() => setLightboxImage(message.image)}
                    />
                    <div 
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity"
                      onClick={() => setLightboxImage(message.image)}
                    >
                      <ZoomIn className="text-white size-6" />
                    </div>
                  </div>
                )}

                {/* Voice Note Audio */}
                {message.audio && !isDeleted && (
                  <AudioMessage
                    audioSrc={message.audio}
                    duration={message.audioDuration}
                    isFromMe={isFromMe}
                  />
                )}

                {/* Message Text or Edit Input */}
                {isEditing ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="input input-sm input-bordered text-base-content bg-base-100 w-full"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(message._id);
                        if (e.key === "Escape") setEditingMessageId(null);
                      }}
                    />
                    <div className="flex justify-end gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditingMessageId(null)}
                        className="btn btn-xs btn-ghost"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(message._id)}
                        className="btn btn-xs btn-primary text-primary-content font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  message.text && (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.text}
                    </p>
                  )
                )}

                {/* Hover Action Floating Menu */}
                {!isDeleted && hoveredMessageId === message._id && !isEditing && (
                  <div
                    className={`absolute -top-7 ${
                      isFromMe ? "right-2" : "left-2"
                    } z-20 flex items-center gap-0.5 bg-base-100 border border-base-300 shadow-md rounded-full px-2 py-0.5 text-base-content`}
                  >
                    {/* Quick Reaction Emojis */}
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReaction(message._id, emoji)}
                        className="hover:scale-125 transition-transform text-xs p-1"
                        title={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}

                    {/* Edit button (Only if sent by me) */}
                    {isFromMe && message.text && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(message)}
                        className="p-1 hover:text-primary transition-colors"
                        title="Edit message"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}

                    {/* Delete button (Only if sent by me) */}
                    {isFromMe && (
                      <button
                        type="button"
                        onClick={() => promptDelete(message)}
                        className="p-1 hover:text-error transition-colors text-base-content/70"
                        title="Delete message"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Reaction Badges Row */}
              {reactionGroups.length > 0 && !isDeleted && (
                <div
                  className={`flex flex-wrap gap-1 mt-1 ${
                    isFromMe ? "justify-end" : "justify-start"
                  }`}
                >
                  {reactionGroups.map((grp) => (
                    <button
                      key={grp.emoji}
                      type="button"
                      onClick={() => handleReaction(message._id, grp.emoji)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-transform hover:scale-105 ${
                        grp.hasReacted
                          ? "bg-primary/20 border-primary text-primary font-bold"
                          : "bg-base-200 border-base-300 text-base-content/80"
                      }`}
                    >
                      <span>{grp.emoji}</span>
                      <span className="text-[10px]">{grp.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* 1-on-1 Typing Bubble */}
        {isPartnerTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={selectedUser?.profilePic || "/avatar.png"}
                  alt="typing user"
                />
              </div>
            </div>
            <div className="chat-bubble bg-base-200 text-base-content flex items-center gap-1.5 py-3 px-4">
              <span className="size-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="size-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="size-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}

        {/* Group Typing Indicator */}
        {selectedGroup && groupTypingUsers.length > 0 && (
          <div className="chat chat-start">
            <div className="text-xs text-primary animate-pulse ml-12">
              {groupTypingUsers.map((u) => u.userName).join(", ")} {groupTypingUsers.length > 1 ? "are" : "is"} typing...
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
