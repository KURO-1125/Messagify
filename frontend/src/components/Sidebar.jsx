import React, { useEffect, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import SidebarSkeleton from './skeletons/SidebarSkeleton';
import { Users, Search, MessageSquare, Plus, UserPlus, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    getGroups,
    groups,
    selectedGroup,
    setSelectedGroup,
    createGroup,
    activeTab,
    setActiveTab,
    isUsersLoading,
    isGroupsLoading,
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const onlineCount = Math.max(
    0,
    onlineUsers.filter((id) => id !== authUser?._id).length
  );

  const filteredUsers = users.filter((user) => {
    const isOnline = onlineUsers.includes(user._id);
    if (showOnlineOnly && !isOnline) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = user.userName?.toLowerCase().includes(query);
      const emailMatch = user.email?.toLowerCase().includes(query);
      return nameMatch || emailMatch;
    }
    return true;
  });

  const filteredGroups = groups.filter((g) => {
    if (searchQuery.trim()) {
      return g.name?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  const toggleMemberSelection = (userId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      return toast.error("Please enter a group name");
    }
    if (selectedMemberIds.length === 0) {
      return toast.error("Please select at least 1 member for the group");
    }

    try {
      setIsCreatingGroup(true);
      await createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        memberIds: selectedMemberIds,
      });
      setIsGroupModalOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setSelectedMemberIds([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const isChatOpen = Boolean(selectedUser || selectedGroup);

  if (isUsersLoading && isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside
      className={`h-full border-r border-base-300 flex flex-col transition-all duration-200 ${
        isChatOpen ? "hidden md:flex md:w-20 lg:w-72" : "w-full md:w-20 lg:w-72"
      }`}
    >
      {/* Create Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-base-300 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-base-300">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus className="text-primary size-5" />
                <span>Create New Group</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="flex flex-col gap-4 pt-4 flex-1 overflow-hidden">
              <div>
                <label className="label label-text font-medium text-xs text-base-content">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Project Team, Friends..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="input input-bordered input-sm w-full bg-base-100 text-base-content border-base-300"
                  required
                />
              </div>

              <div>
                <label className="label label-text font-medium text-xs text-base-content">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="What is this group about?"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="input input-bordered input-sm w-full bg-base-100 text-base-content border-base-300"
                />
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <label className="label label-text font-medium text-xs flex justify-between">
                  <span>Select Members</span>
                  <span className="text-primary font-bold">({selectedMemberIds.length} selected)</span>
                </label>

                <div className="overflow-y-auto border border-base-300 rounded-xl divide-y divide-base-200 flex-1 max-h-48">
                  {users.map((u) => {
                    const isSelected = selectedMemberIds.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => toggleMemberSelection(u._id)}
                        className={`flex items-center justify-between p-2.5 cursor-pointer hover:bg-base-200 transition-colors ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={u.profilePic || "/avatar.png"}
                            alt={u.userName}
                            className="size-8 rounded-full object-cover"
                          />
                          <span className="text-sm font-medium truncate">{u.userName}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="checkbox checkbox-primary checkbox-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-base-300">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="btn btn-sm btn-ghost"
                  disabled={isCreatingGroup}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                  disabled={isCreatingGroup || !newGroupName.trim()}
                >
                  {isCreatingGroup ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar Header & Tabs */}
      <div className="border-b border-base-300 w-full p-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-base-200 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "direct"
                ? "bg-base-100 text-primary shadow-sm"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <Users size={15} />
            <span className="block md:hidden lg:block">Direct</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "groups"
                ? "bg-base-100 text-primary shadow-sm"
                : "text-base-content/60 hover:text-base-content"
            }`}
          >
            <MessageSquare size={15} />
            <span className="block md:hidden lg:block">Groups</span>
            {groups.length > 0 && (
              <span className="badge badge-xs badge-neutral text-[9px] px-1 hidden lg:inline">
                {groups.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-3 block md:hidden lg:block">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input
              type="text"
              placeholder={activeTab === "direct" ? "Search contacts..." : "Search groups..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-9"
            />
          </div>
        </div>

        {/* Action Row */}
        {activeTab === "direct" ? (
          <div className="mt-3 flex md:hidden lg:flex items-center justify-between">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm checkbox-primary"
              />
              <span className="text-xs font-medium">Online only</span>
            </label>
            <span className="text-xs text-base-content/60">({onlineCount} online)</span>
          </div>
        ) : (
          <div className="mt-3 flex md:hidden lg:flex items-center justify-between">
            <span className="text-xs font-medium text-base-content/60">{groups.length} groups</span>
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(true)}
              className="btn btn-xs btn-primary gap-1"
            >
              <Plus size={13} />
              <span>New Group</span>
            </button>
          </div>
        )}
      </div>

      {/* Contact or Group List */}
      <div className="overflow-y-auto w-full py-2 flex-1">
        {activeTab === "direct" ? (
          // Direct Users List
          <>
            {filteredUsers.map((user) => {
              const isOnline = onlineUsers.includes(user._id);
              const isSelected = selectedUser?._id === user._id;

              return (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-300/60 transition-colors
                    ${isSelected ? "bg-base-300 ring-1 ring-base-300" : ""}
                  `}
                >
                  <div className="relative mx-0 md:mx-auto lg:mx-0 shrink-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.userName || "Contact"}
                      className="size-12 object-cover rounded-full"
                    />
                    {isOnline && (
                      <span
                        className="absolute bottom-0 right-0 size-3 bg-emerald-500 
                        rounded-full ring-2 ring-base-100"
                      />
                    )}
                    {user.unreadCount > 0 && (
                      <span className="hidden md:flex lg:hidden absolute -top-1 -right-1 badge badge-primary badge-xs size-4.5 p-0 items-center justify-center text-[10px] font-bold">
                        {user.unreadCount > 9 ? "9+" : user.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="block md:hidden lg:block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-medium truncate">{user.userName}</div>
                      {user.unreadCount > 0 && (
                        <span className="badge badge-primary badge-sm font-semibold shrink-0">
                          {user.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-base-content/60 truncate mt-0.5">
                      {user.lastMessage ? (
                        user.lastMessage.audio ? (
                          <span className="italic">🎤 Voice note</span>
                        ) : user.lastMessage.image && !user.lastMessage.text ? (
                          <span className="italic">📷 Photo</span>
                        ) : (
                          user.lastMessage.text
                        )
                      ) : isOnline ? (
                        <span className="text-emerald-500 font-medium">Online</span>
                      ) : (
                        "Offline"
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center text-base-content/50 py-6 text-sm px-4">
                {searchQuery
                  ? "No contacts found"
                  : showOnlineOnly
                  ? "No online contacts"
                  : "No contacts yet"}
              </div>
            )}
          </>
        ) : (
          // Groups List
          <>
            {filteredGroups.map((group) => {
              const isSelected = selectedGroup?._id === group._id;

              return (
                <button
                  key={group._id}
                  onClick={() => setSelectedGroup(group)}
                  className={`
                    w-full p-3 flex items-center gap-3
                    hover:bg-base-300/60 transition-colors
                    ${isSelected ? "bg-base-300 ring-1 ring-base-300" : ""}
                  `}
                >
                  <div className="relative mx-0 md:mx-auto lg:mx-0 shrink-0">
                    <div className="size-12 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center border border-primary/30">
                      {group.groupPic ? (
                        <img src={group.groupPic} alt={group.name} className="size-full object-cover rounded-full" />
                      ) : (
                        <span className="text-sm">{group.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                  </div>

                  <div className="block md:hidden lg:block text-left min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-medium truncate">{group.name}</div>
                      <span className="text-[10px] text-base-content/50 shrink-0">
                        {group.members?.length} members
                      </span>
                    </div>
                    <div className="text-xs text-base-content/60 truncate mt-0.5">
                      {group.lastMessage ? (
                        <span>
                          {group.lastMessage.sender?.userName ? `${group.lastMessage.sender.userName}: ` : ""}
                          {group.lastMessage.audio ? "🎤 Voice note" : group.lastMessage.image ? "📷 Photo" : group.lastMessage.text}
                        </span>
                      ) : (
                        <span className="italic opacity-50">No messages yet</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredGroups.length === 0 && (
              <div className="text-center text-base-content/50 py-8 px-4 text-sm flex flex-col items-center gap-2">
                <span>No groups yet</span>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(true)}
                  className="btn btn-xs btn-primary mt-1"
                >
                  <Plus size={13} />
                  <span>Create First Group</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
