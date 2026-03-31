import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import {
  User,
  UserStats,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  SyncGoalRequest,
  SyncGoalResponse,
  UpdateLocationRequest,
  UpdateLocationResponse,
  MatchesResponse,
  FeedResponse,
  PostCreate,
  Post,
  ImpactRequest,
  ImpactResponse,
  ConnectRequest,
  ConnectResponse,
  Connection,
  PendingConnection,
  FocusSessionStart,
  FocusSession,
  Notification,
} from "./types";

// Analytics types
interface SkillCategory {
  skill: string;
  score: number;
  post_count: number;
}

interface SkillMapResponse {
  skills: SkillCategory[];
  total_impact: number;
  focus_minutes: number;
  streak_days: number;
}

interface StreakResponse {
  current_streak: number;
  longest_streak: number;
  total_focus_days: number;
}

interface KnowledgeEntry {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  author_username: string;
  saved_at: string;
}

interface KnowledgeBaseResponse {
  entries: KnowledgeEntry[];
  total_count: number;
}

// Auth hooks
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation<TokenResponse, Error, LoginRequest>({
    mutationFn: async (credentials: LoginRequest) => {
      const { data } = await api.post<TokenResponse>("/auth/login", credentials);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.access_token);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation<TokenResponse, Error, RegisterRequest>({
    mutationFn: async (userData: RegisterRequest) => {
      const { data } = await api.post<User>("/auth/register", userData);
      // After registration, login automatically
      const { data: tokenData } = await api.post<TokenResponse>("/auth/login", {
        email: userData.email,
        password: userData.password,
      });
      return tokenData;
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.access_token);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUser() {
  return useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const { data } = await api.get<User>("/auth/me");
      return data;
    },
    enabled: typeof window !== "undefined" && !!localStorage.getItem("token"),
  });
}

// User hooks
export function useUserStats() {
  return useQuery<UserStats>({
    queryKey: ["userStats"],
    queryFn: async () => {
      const { data } = await api.get<UserStats>("/users/stats");
      return data;
    },
  });
}

export function useSyncGoal() {
  const queryClient = useQueryClient();
  
  return useMutation<SyncGoalResponse, Error, SyncGoalRequest>({
    mutationFn: async (request: SyncGoalRequest) => {
      const { data } = await api.post<SyncGoalResponse>("/users/sync-goal", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  
  return useMutation<UpdateLocationResponse, Error, UpdateLocationRequest>({
    mutationFn: async (request: UpdateLocationRequest) => {
      const { data } = await api.post<UpdateLocationResponse>("/users/update-location", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

// Matching hooks
export function useMatches(rings: number = 2, limit: number = 20) {
  return useQuery<MatchesResponse>({
    queryKey: ["matches", rings, limit],
    queryFn: async () => {
      const { data } = await api.get<MatchesResponse>("/matching/matches", {
        params: { rings, limit },
      });
      return data;
    },
  });
}

export function useGiveImpact() {
  const queryClient = useQueryClient();
  
  return useMutation<ImpactResponse, Error, ImpactRequest>({
    mutationFn: async (request: ImpactRequest) => {
      const { data } = await api.post<ImpactResponse>("/matching/impact", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
    },
  });
}

export function useConnect() {
  const queryClient = useQueryClient();
  
  return useMutation<ConnectResponse, Error, ConnectRequest>({
    mutationFn: async (request: ConnectRequest) => {
      const { data } = await api.post<ConnectResponse>("/matching/connect", request);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["connectionStatus", variables.to_user_id] });
    },
  });
}

// Connection hooks
export function useConnections() {
  return useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: async () => {
      const { data } = await api.get<Connection[]>("/matching/connections");
      return data;
    },
  });
}

export function usePendingConnections() {
  return useQuery<PendingConnection[]>({
    queryKey: ["pendingConnections"],
    queryFn: async () => {
      const { data } = await api.get<PendingConnection[]>("/matching/pending");
      return data;
    },
  });
}

// Feed hooks
export function useFeed(limit: number = 10) {
  return useQuery<FeedResponse>({
    queryKey: ["feed", limit],
    queryFn: async () => {
      const { data } = await api.get<FeedResponse>("/feed", {
        params: { limit },
      });
      return data;
    },
  });
}

export function useSuggestedPosts(limit: number = 5, excludePostIds: string[] = []) {
  return useQuery<FeedResponse>({
    queryKey: ["suggested", limit, excludePostIds.join(",")],
    queryFn: async () => {
      const { data } = await api.get<FeedResponse>("/feed/suggested", {
        params: { 
          limit, 
          exclude_post_ids: excludePostIds.join(",") 
        },
      });
      return data;
    },
    enabled: true, // Always fetch even if empty
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation<Post, Error, PostCreate>({
    mutationFn: async (postData: PostCreate) => {
      const { data } = await api.post<Post>("/feed/posts", postData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// Focus session hooks
export function useCurrentFocusSession() {
  return useQuery<FocusSession | null>({
    queryKey: ["focusSession"],
    queryFn: async () => {
      const { data } = await api.get<FocusSession | null>("/users/focus/current");
      return data;
    },
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();
  
  return useMutation<FocusSession, Error, FocusSessionStart>({
    mutationFn: async (request: FocusSessionStart) => {
      const { data } = await api.post<FocusSession>("/users/focus/start", request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSession"] });
    },
  });
}

export function useEndFocusSession() {
  const queryClient = useQueryClient();
  
  return useMutation<FocusSession, Error, void>({
    mutationFn: async () => {
      const { data } = await api.post<FocusSession>("/users/focus/end");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["focusSession"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
    },
  });
}

// Post impact hook
export function usePostImpact() {
  const queryClient = useQueryClient();
  
  return useMutation<{ message: string; is_constructive: boolean; impact_points: number; post_impact_count: number }, Error, { postId: string; feedback: string }>({
    mutationFn: async ({ postId, feedback }) => {
      const { data } = await api.post(`/feed/posts/${postId}/impact`, null, {
        params: { feedback },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
    },
  });
}

// Check connection status
export function useConnectionStatus(userId: string | null) {
  return useQuery<{ is_connected: boolean; is_pending?: boolean }>({
    queryKey: ["connectionStatus", userId],
    queryFn: async () => {
      if (!userId) return { is_connected: false };
      const { data } = await api.get(`/matching/connection-status/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

// Notifications hook
export function useNotifications(limit = 20, unreadOnly = false) {
  return useQuery<Notification[]>({
    queryKey: ["notifications", limit, unreadOnly],
    queryFn: async () => {
      const { data } = await api.get<Notification[]>("/users/notifications", {
        params: { limit, unread_only: unreadOnly },
      });
      return data;
    },
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await api.post("/users/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Analytics hooks
export function useSkillMap() {
  return useQuery<SkillMapResponse>({
    queryKey: ["skillMap"],
    queryFn: async () => {
      const { data } = await api.get<SkillMapResponse>("/analytics/skill-map");
      return data;
    },
  });
}

export function useFocusStreak() {
  return useQuery<StreakResponse>({
    queryKey: ["focusStreak"],
    queryFn: async () => {
      const { data } = await api.get<StreakResponse>("/analytics/streak");
      return data;
    },
  });
}

export function useKnowledgeBase() {
  return useQuery<KnowledgeBaseResponse>({
    queryKey: ["knowledgeBase"],
    queryFn: async () => {
      const { data } = await api.get<KnowledgeBaseResponse>("/analytics/knowledge");
      return data;
    },
  });
}

export function useSaveToKnowledge() {
  const queryClient = useQueryClient();
  
  return useMutation<{ message: string }, Error, { postId: string }>({
    mutationFn: async ({ postId }) => {
      const { data } = await api.post<{ message: string }>("/analytics/knowledge/save", { post_id: postId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBase"] });
    },
  });
}

export function useLiveFocusing() {
  return useQuery<{ count: number }>({
    queryKey: ["liveFocusing"],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>("/analytics/focusing-now");
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Impact History
export interface ImpactHistoryEntry {
  id: string;
  type: "given" | "received";
  target_username: string;
  source_username: string;
  feedback_content: string;
  impact_points: number;
  is_constructive: boolean;
  created_at: string;
}

export interface ImpactHistoryResponse {
  given: ImpactHistoryEntry[];
  received: ImpactHistoryEntry[];
  total_given: number;
  total_received: number;
}

export function useImpactHistory(limit: number = 20) {
  return useQuery<ImpactHistoryResponse>({
    queryKey: ["impactHistory", limit],
    queryFn: async () => {
      const { data } = await api.get<ImpactHistoryResponse>("/analytics/impact-history", {
        params: { limit },
      });
      return data;
    },
  });
}

// Update Profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, { username?: string; bio?: string }>({
    mutationFn: async (profileData) => {
      const { data } = await api.put<User>("/users/me", profileData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

// Comments
export function useComments(postId: string) {
  return useQuery<{ id: string; post_id: string; author_id: string; author_username: string; author_avatar_url: string | null; content: string; created_at: string }[]>({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data } = await api.get(`/social/posts/${postId}/comments`);
      return data;
    },
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { postId: string; content: string }>({
    mutationFn: async ({ postId, content }) => {
      await api.post(`/social/posts/${postId}/comments`, null, { params: { content } });
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });
}

// Messages
export function useConversations() {
  return useQuery<{ user_id: string; username: string; avatar_url: string | null; last_message: string; last_message_at: string | null; unread_count: number }[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await api.get("/social/conversations");
      return data;
    },
  });
}

export function useMessages(userId: string | null) {
  return useQuery<{ id: string; from_user_id: string; to_user_id: string; content: string; is_read: boolean; created_at: string }[]>({
    queryKey: ["messages", userId],
    queryFn: async () => {
      const { data } = await api.get(`/social/messages/${userId}`);
      return data;
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { userId: string; content: string }>({
    mutationFn: async ({ userId, content }) => {
      await api.post(`/social/messages/${userId}`, null, { params: { content } });
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Search
export function useSearch(q: string, type: "all" | "users" | "posts" = "all") {
  return useQuery<{ users: { id: string; username: string; avatar_url: string | null; bio: string | null; current_goal: string | null; impact_score: number }[]; posts: { id: string; author_id: string; author_username: string; author_avatar_url: string | null; content: string; image_url: string | null; impact_count: number; created_at: string }[] }>({
    queryKey: ["search", q, type],
    queryFn: async () => {
      const { data } = await api.get("/social/search", { params: { q, type } });
      return data;
    },
    enabled: q.length >= 2,
  });
}

// Leaderboard
export function useLeaderboard(limit = 20) {
  return useQuery<{ rank: number; id: string; username: string; avatar_url: string | null; current_goal: string | null; impact_score: number; is_focusing: boolean }[]>({
    queryKey: ["leaderboard", limit],
    queryFn: async () => {
      const { data } = await api.get("/social/leaderboard", { params: { limit } });
      return data;
    },
  });
}

// Saved Posts
export function useSavedPosts() {
  return useQuery<{ id: string; author_id: string; author_username: string; author_avatar_url: string | null; content: string; image_url: string | null; impact_count: number; created_at: string }[]>({
    queryKey: ["savedPosts"],
    queryFn: async () => {
      const { data } = await api.get("/social/saved");
      return data;
    },
  });
}

export function useSavePost() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (postId) => {
      await api.post(`/social/saved/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedPosts"] });
    },
  });
}

export function useUnsavePost() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (postId) => {
      await api.delete(`/social/saved/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedPosts"] });
    },
  });
}

// Public user profile
export function usePublicProfile(userId: string | null) {
  return useQuery<{ id: string; username: string; bio: string | null; avatar_url: string | null; current_goal: string | null; impact_score: number; is_focusing: boolean; current_focus_goal: string | null; created_at: string; posts_count: number }>({
    queryKey: ["publicProfile", userId],
    queryFn: async () => {
      const { data } = await api.get(`/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

// User posts
export function useUserPosts(userId: string | null) {
  return useQuery<{ posts: { id: string; author_id: string; author_username: string; author_avatar_url: string | null; content: string; image_url: string | null; impact_count: number; created_at: string }[] }>({
    queryKey: ["userPosts", userId],
    queryFn: async () => {
      const { data } = await api.get(`/feed/posts/user/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

// File upload hooks
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation<{ url: string }, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<{ url: string }>("/upload/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useUploadImage() {
  return useMutation<{ url: string }, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<{ url: string }>("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
  });
}
