export type AuthorType = "user" | "bot";
export type NotificationType = "like" | "reply" | "follow" | "bot_reply";
export type BotTrigger = "auto" | "mention";
export type BotJobStatus = "pending" | "processing" | "done" | "failed";

export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  email_verified_at: string | null;
  verification_sent_at: string | null;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
};

export type Bot = {
  id: string;
  handle: string;
  name: string;
  persona_prompt: string;
  avatar_url: string;
  accent_color: string;
  auto_reply_weight: number;
  is_generated?: boolean;
  archetype?: string | null;
  spawn_batch_id?: string | null;
  active?: boolean;
  created_at: string;
};

export type Post = {
  id: string;
  content: string;
  author_type: AuthorType;
  author_id: string | null;
  bot_id: string | null;
  parent_post_id: string | null;
  root_post_id: string | null;
  like_count: number;
  reply_count: number;
  repost_count: number;
  created_at: string;
  updated_at: string;
};

export type PostWithAuthor = Post & {
  profiles?: Profile | null;
  bots?: Bot | null;
  liked_by_me?: boolean;
  bookmarked_by_me?: boolean;
  reposted_by_me?: boolean;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  bot_id: string | null;
  type: NotificationType;
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile | null;
  bot?: Bot | null;
  post?: Post | null;
};

export type BotReplyJob = {
  id: string;
  post_id: string;
  bot_id: string;
  root_post_id: string | null;
  trigger: BotTrigger;
  status: BotJobStatus;
  error: string | null;
  created_at: string;
  processed_at: string | null;
};

export type Conversation = {
  id: string;
  user_id: string;
  bot_id: string;
  last_message_at: string | null;
  created_at: string;
  bots?: Bot | null;
};

export type ChatSenderType = "user" | "bot";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: ChatSenderType;
  sender_user_id: string | null;
  sender_bot_id: string | null;
  content: string;
  created_at: string;
  profiles?: Profile | null;
  bots?: Bot | null;
};

export type BotConversationState = {
  conversation_id: string;
  mood: string;
  mood_intensity: number;
  summary: string | null;
  updated_at: string;
};

export type ChatReplyJob = {
  id: string;
  conversation_id: string;
  message_id: string;
  bot_id: string;
  status: BotJobStatus;
  error: string | null;
  created_at: string;
  processed_at: string | null;
};

export type BotSpawnDaily = {
  date: string;
  spawned_count: number;
  daily_cap: number;
  last_spawn_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      bots: { Row: Bot; Insert: Partial<Bot>; Update: Partial<Bot> };
      posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post> };
      post_likes: {
        Row: { id: string; post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string };
        Update: never;
      };
      follows: {
        Row: { id: string; follower_id: string; following_id: string; created_at: string };
        Insert: { follower_id: string; following_id: string };
        Update: never;
      };
      bot_follows: {
        Row: { id: string; follower_id: string; bot_id: string; created_at: string };
        Insert: { follower_id: string; bot_id: string };
        Update: never;
      };
      bookmarks: {
        Row: { id: string; user_id: string; post_id: string; created_at: string };
        Insert: { user_id: string; post_id: string };
        Update: never;
      };
      reposts: {
        Row: { id: string; user_id: string; post_id: string; created_at: string };
        Insert: { user_id: string; post_id: string };
        Update: never;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification>;
        Update: Partial<Notification>;
      };
      bot_reply_jobs: {
        Row: BotReplyJob;
        Insert: Partial<BotReplyJob>;
        Update: Partial<BotReplyJob>;
      };
      conversations: {
        Row: Conversation;
        Insert: Partial<Conversation>;
        Update: Partial<Conversation>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Partial<ChatMessage>;
        Update: Partial<ChatMessage>;
      };
      bot_conversation_state: {
        Row: BotConversationState;
        Insert: Partial<BotConversationState>;
        Update: Partial<BotConversationState>;
      };
      chat_reply_jobs: {
        Row: ChatReplyJob;
        Insert: Partial<ChatReplyJob>;
        Update: Partial<ChatReplyJob>;
      };
      bot_spawn_daily: {
        Row: BotSpawnDaily;
        Insert: Partial<BotSpawnDaily>;
        Update: Partial<BotSpawnDaily>;
      };
    };
  };
};
