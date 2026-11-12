import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from "./useAuthStore";
import { playMessageSound } from "../lib/sound";

export const useChatStore = create((set, get) => ({
    messages: [],
    users: [],
    groups: [],
    selectedUser: null,
    selectedGroup: null,
    activeTab: "direct", // 'direct' | 'groups'
    isUsersLoading: false,
    isGroupsLoading: false,
    isMessagesLoading: false,
    isPartnerTyping: false,
    groupTypingUsers: [], // Array of { userId, userName }

    setActiveTab: (tab) => set({ activeTab: tab }),

    getUsers: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get('/messages/users');
            set({ users: res.data || [] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load users");
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getGroups: async () => {
        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstance.get('/groups');
            set({ groups: res.data || [] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load groups");
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    createGroup: async (groupData) => {
        try {
            const res = await axiosInstance.post('/groups', groupData);
            const newGroup = res.data;
            set((state) => ({ groups: [newGroup, ...state.groups] }));
            toast.success("Group created successfully!");
            get().setSelectedGroup(newGroup);
            return newGroup;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create group");
            throw error;
        }
    },

    getMessages: async (userId) => {
        if (!userId) return;
        set({ isMessagesLoading: true, messages: [] });
        try {
            const res = await axiosInstance.get(`/messages/conversation/${userId}`);
            set({ messages: res.data || [] });
            set((state) => ({
                users: state.users.map((u) => (u._id === userId ? { ...u, unreadCount: 0 } : u))
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    getGroupMessages: async (groupId) => {
        if (!groupId) return;
        set({ isMessagesLoading: true, messages: [] });
        try {
            const res = await axiosInstance.get(`/groups/${groupId}/messages`);
            set({ messages: res.data || [] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load group messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    markAsRead: async (userId) => {
        if (!userId) return;
        try {
            await axiosInstance.put(`/messages/read/${userId}`);
            set((state) => ({
                users: state.users.map((u) => (u._id === userId ? { ...u, unreadCount: 0 } : u))
            }));
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages, users } = get();
        if (!selectedUser) return;
        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            const newMessage = res.data;
            set({
                messages: [...messages, newMessage],
                users: users.map((u) => {
                    if (u._id === selectedUser._id) {
                        return {
                            ...u,
                            lastMessage: {
                                text: newMessage.text,
                                image: newMessage.image,
                                audio: newMessage.audio,
                                createdAt: newMessage.createdAt,
                                isRead: false,
                                senderId: newMessage.senderId
                            }
                        };
                    }
                    return u;
                })
            });
            return newMessage;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
            throw error;
        }
    },

    sendGroupMessage: async (groupId, messageData) => {
        const { messages, groups } = get();
        try {
            const res = await axiosInstance.post(`/groups/${groupId}/send`, messageData);
            const newMessage = res.data;
            set({
                messages: [...messages, newMessage],
                groups: groups.map((g) => {
                    if (g._id === groupId) {
                        return {
                            ...g,
                            lastMessage: {
                                text: newMessage.text,
                                image: newMessage.image,
                                audio: newMessage.audio,
                                createdAt: newMessage.createdAt,
                                sender: newMessage.senderId
                            }
                        };
                    }
                    return g;
                })
            });
            return newMessage;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send group message");
            throw error;
        }
    },

    editMessage: async (messageId, newText) => {
        try {
            const res = await axiosInstance.put(`/messages/${messageId}`, { text: newText });
            const updated = res.data;
            set((state) => ({
                messages: state.messages.map((m) =>
                    m._id === messageId ? { ...m, text: updated.text, isEdited: true } : m
                )
            }));
            toast.success("Message edited");
            return updated;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to edit message");
            throw error;
        }
    },

    deleteMessage: async (messageId) => {
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            set((state) => ({
                messages: state.messages.map((m) =>
                    m._id === messageId
                        ? { ...m, isDeleted: true, text: "This message was deleted", image: null, audio: null }
                        : m
                )
            }));
            toast.success("Message deleted");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete message");
            throw error;
        }
    },

    reactToMessage: async (messageId, emoji) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
            const updated = res.data;
            set((state) => ({
                messages: state.messages.map((m) =>
                    m._id === messageId ? { ...m, reactions: updated.reactions } : m
                )
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to react");
        }
    },

    sendTypingStatus: (isTyping) => {
        const { selectedUser, selectedGroup } = get();
        const socket = useAuthStore.getState().socket;
        const authUser = useAuthStore.getState().authUser;
        if (!socket) return;

        if (selectedUser) {
            socket.emit(isTyping ? "typing" : "stopTyping", { toUserId: selectedUser._id });
        } else if (selectedGroup) {
            socket.emit(isTyping ? "groupTyping" : "groupStopTyping", {
                groupId: selectedGroup._id,
                userName: authUser?.userName || "Someone"
            });
        }
    },

    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");
        socket.off("messageSent");
        socket.off("messagesRead");
        socket.off("userTyping");
        socket.off("userStoppedTyping");
        socket.off("messageEdited");
        socket.off("messageDeleted");
        socket.off("messageReaction");
        socket.off("newGroupCreated");
        socket.off("newGroupMessage");
        socket.off("groupUserTyping");
        socket.off("groupUserStoppedTyping");

        socket.on("newMessage", (newMessage) => {
            const currentSelectedUser = get().selectedUser;
            const isFromCurrentChat = currentSelectedUser && newMessage.senderId === currentSelectedUser._id;

            if (isFromCurrentChat) {
                set({
                    messages: [...get().messages, newMessage],
                    isPartnerTyping: false
                });
                playMessageSound();
                get().markAsRead(currentSelectedUser._id);
            } else {
                playMessageSound();
                set((state) => ({
                    users: state.users.map((u) => {
                        if (u._id === newMessage.senderId) {
                            return {
                                ...u,
                                unreadCount: (u.unreadCount || 0) + 1,
                                lastMessage: {
                                    text: newMessage.text,
                                    image: newMessage.image,
                                    audio: newMessage.audio,
                                    createdAt: newMessage.createdAt,
                                    senderId: newMessage.senderId,
                                    isRead: false
                                }
                            };
                        }
                        return u;
                    })
                }));
            }
        });

        socket.on("messageSent", (sentMessage) => {
            const currentSelectedUser = get().selectedUser;
            if (currentSelectedUser && sentMessage.receiverId === currentSelectedUser._id) {
                const exists = get().messages.some((m) => m._id === sentMessage._id);
                if (!exists) {
                    set({ messages: [...get().messages, sentMessage] });
                }
            }
        });

        socket.on("messagesRead", ({ byUserId }) => {
            const currentSelectedUser = get().selectedUser;
            if (currentSelectedUser && byUserId === currentSelectedUser._id) {
                set((state) => ({
                    messages: state.messages.map((m) => ({ ...m, isRead: true }))
                }));
            }
        });

        socket.on("userTyping", ({ fromUserId }) => {
            const currentSelectedUser = get().selectedUser;
            if (currentSelectedUser && fromUserId === currentSelectedUser._id) {
                set({ isPartnerTyping: true });
            }
        });

        socket.on("userStoppedTyping", ({ fromUserId }) => {
            const currentSelectedUser = get().selectedUser;
            if (currentSelectedUser && fromUserId === currentSelectedUser._id) {
                set({ isPartnerTyping: false });
            }
        });

        socket.on("messageEdited", ({ messageId, text, isEdited }) => {
            set((state) => ({
                messages: state.messages.map((m) =>
                    m._id === messageId ? { ...m, text, isEdited } : m
                )
            }));
        });

        socket.on("messageDeleted", ({ messageId, text, isDeleted }) => {
            set((state) => ({
                messages: state.messages.map((m) =>
                    m._id === messageId
                        ? { ...m, isDeleted, text, image: null, audio: null }
                        : m
                )
            }));
        });

        socket.on("messageReaction", ({ messageId, reactions }) => {
            set((state) => ({
                messages: state.messages.map((m) =>
                    m._id === messageId ? { ...m, reactions } : m
                )
            }));
        });

        socket.on("newGroupCreated", (newGroup) => {
            set((state) => {
                const exists = state.groups.some((g) => g._id === newGroup._id);
                return exists ? state : { groups: [newGroup, ...state.groups] };
            });
        });

        socket.on("newGroupMessage", (message) => {
            const currentSelectedGroup = get().selectedGroup;
            const authUser = useAuthStore.getState().authUser;
            const isFromCurrentGroup = currentSelectedGroup && message.groupId === currentSelectedGroup._id;

            if (isFromCurrentGroup) {
                // If message isn't already added optimistically
                const exists = get().messages.some((m) => m._id === message._id);
                if (!exists) {
                    set({ messages: [...get().messages, message] });
                }
                if (message.senderId?._id !== authUser?._id && message.senderId !== authUser?._id) {
                    playMessageSound();
                }
            } else {
                playMessageSound();
                set((state) => ({
                    groups: state.groups.map((g) => {
                        if (g._id === message.groupId) {
                            return {
                                ...g,
                                lastMessage: {
                                    text: message.text,
                                    image: message.image,
                                    audio: message.audio,
                                    createdAt: message.createdAt,
                                    sender: message.senderId
                                }
                            };
                        }
                        return g;
                    })
                }));
            }
        });

        socket.on("groupUserTyping", ({ groupId, fromUserId, userName }) => {
            const currentSelectedGroup = get().selectedGroup;
            if (currentSelectedGroup && groupId === currentSelectedGroup._id) {
                set((state) => {
                    const alreadyPresent = state.groupTypingUsers.some((u) => u.userId === fromUserId);
                    if (alreadyPresent) return state;
                    return { groupTypingUsers: [...state.groupTypingUsers, { userId: fromUserId, userName }] };
                });
            }
        });

        socket.on("groupUserStoppedTyping", ({ groupId, fromUserId }) => {
            const currentSelectedGroup = get().selectedGroup;
            if (currentSelectedGroup && groupId === currentSelectedGroup._id) {
                set((state) => ({
                    groupTypingUsers: state.groupTypingUsers.filter((u) => u.userId !== fromUserId)
                }));
            }
        });
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("newMessage");
            socket.off("messageSent");
            socket.off("messagesRead");
            socket.off("userTyping");
            socket.off("userStoppedTyping");
            socket.off("messageEdited");
            socket.off("messageDeleted");
            socket.off("messageReaction");
            socket.off("newGroupCreated");
            socket.off("newGroupMessage");
            socket.off("groupUserTyping");
            socket.off("groupUserStoppedTyping");
        }
        set({ isPartnerTyping: false, groupTypingUsers: [] });
    },

    setSelectedUser: (selectedUser) => {
        get().unsubscribeFromMessages();
        if (selectedUser) {
            set((state) => ({
                selectedUser,
                selectedGroup: null,
                isPartnerTyping: false,
                groupTypingUsers: [],
                users: state.users.map((u) => (u._id === selectedUser._id ? { ...u, unreadCount: 0 } : u))
            }));
            get().markAsRead(selectedUser._id);
        } else {
            set({ selectedUser: null, isPartnerTyping: false });
        }
    },

    setSelectedGroup: (selectedGroup) => {
        get().unsubscribeFromMessages();
        if (selectedGroup) {
            set({
                selectedGroup,
                selectedUser: null,
                isPartnerTyping: false,
                groupTypingUsers: []
            });
            const socket = useAuthStore.getState().socket;
            if (socket) {
                socket.emit("joinGroup", selectedGroup._id);
            }
        } else {
            set({ selectedGroup: null, groupTypingUsers: [] });
        }
    },
}));
