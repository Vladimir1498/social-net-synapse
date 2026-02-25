// User types
export interface User {
  id: string;
  email: string;
  username: string;
  bio?: string;
  current_goal?: string;
  impact_score: number;
  created_at: string;
}

export interface UserPublic {
  id: string;
  username: string;
  bio?: string;
  current_goal?: string;
  impact_score: number;
  similarity_score?: number;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  bio?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Goal types
export interface SyncGoalRequest {
  goal: string;
}

export interface SyncGoalResponse {
  message: string;
  goal: string;
  vector_updated: boolean;
}

// Location types
export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
}

export interface UpdateLocationResponse {
  message: string;
  h3_index: string;
  latitude: number;
  longitude: number;
}

// Matching types
export interface MatchResult {
  user: UserPublic;
  similarity_percentage: number;
  h3_distance: number;
  is_neighbor: boolean;
}

export interface MatchesResponse {
  matches: MatchResult[];
  total_count: number;
  user_h3_index: string;
}

// Post types
export interface Post {
  id: string;
  author_id: string;
  author_username?: string;
  content: string;
  impact_count: number;
  created_at: string;
  similarity_score?: number;
  is_impacted_by_me?: boolean;
}

export interface PostCreate {
  content: string;
}

export interface FeedResponse {
  posts: Post[];
  total_count: number;
  curated_by: string;
}

// Impact types
export interface ImpactRequest {
  to_user_id: string;
  feedback_content: string;
}

export interface ImpactResponse {
  message: string;
  is_constructive: boolean;
  impact_given: number;
}

// Connect types
export interface ConnectRequest {
  to_user_id: string;
  message?: string;
}

export interface ConnectResponse {
  message: string;
  connection_id: string;
}

// Focus session types
export interface FocusSessionStart {
  goal: string;
}

export interface FocusSession {
  id: string;
  goal: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  is_active: boolean;
}

// Stats types
export interface UserStats {
  impact_score: number;
  connections_count: number;
  posts_count: number;
  focus_sessions_count: number;
  total_focus_minutes: number;
}

// WebSocket types
export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
}
