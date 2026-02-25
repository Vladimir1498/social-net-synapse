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
  FocusSessionStart,
  FocusSession,
} from "./types";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
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
  return useQuery<{ is_connected: boolean }>({
    queryKey: ["connectionStatus", userId],
    queryFn: async () => {
      if (!userId) return { is_connected: false };
      const { data } = await api.get(`/matching/connection-status/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}
