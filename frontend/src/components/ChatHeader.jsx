import { X, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const {
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    isPartnerTyping,
    groupTypingUsers,
  } = useChatStore();
  const { onlineUsers } = useAuthStore();

  if (!selectedUser && !selectedGroup) return null;

  // Group Header View
  if (selectedGroup) {
    return (
      <div className="p-2.5 border-b border-base-300 bg-base-100/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="size-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center border border-primary/30">
                {selectedGroup.groupPic ? (
                  <img src={selectedGroup.groupPic} alt={selectedGroup.name} className="size-full object-cover rounded-full" />
                ) : (
                  <span>{selectedGroup.name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-1.5">
                <span>{selectedGroup.name}</span>
                <span className="badge badge-xs badge-neutral text-[10px]">Group</span>
              </h3>
              <p className="text-xs transition-colors">
                {groupTypingUsers.length > 0 ? (
                  <span className="text-primary font-medium animate-pulse">
                    {groupTypingUsers.map((u) => u.userName).join(", ")} typing...
                  </span>
                ) : (
                  <span className="text-base-content/60 flex items-center gap-1">
                    <Users size={12} />
                    {selectedGroup.members?.length || 0} members
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedGroup(null)}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close group chat"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    );
  }

  // Direct User Header View
  const isOnline = onlineUsers.includes(selectedUser._id);

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-100/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.userName || "User"} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm sm:text-base">{selectedUser.userName || "Chat"}</h3>
            <p className="text-xs transition-colors">
              {isPartnerTyping ? (
                <span className="text-primary font-medium animate-pulse">typing...</span>
              ) : (
                <span className={isOnline ? "text-emerald-500 font-medium" : "text-base-content/60"}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setSelectedUser(null)}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Close chat"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
