// Supabase Database Types
// Bu dosya veritabanı yapısını TypeScript'e tanıtır

export type UserType = 'individual' | 'corporate';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          bio: string | null;
          avatar_url: string | null;
          user_type: UserType;
          talents: string[];
          last_talents_change: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          user_type: UserType;
          talents?: string[];
          last_talents_change?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          user_type?: UserType;
          talents?: string[];
          last_talents_change?: string | null;
          updated_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          user_id: string;
          video_url: string;
          thumbnail_url: string | null;
          description: string;
          topic: string | null;
          likes_count: number;
          comments_count: number;
          shares_count: number;
          views_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_url: string;
          thumbnail_url?: string | null;
          description?: string;
          topic?: string | null;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          views_count?: number;
          created_at?: string;
        };
        Update: {
          video_url?: string;
          thumbnail_url?: string | null;
          description?: string;
          topic?: string | null;
          likes_count?: number;
          comments_count?: number;
          shares_count?: number;
          views_count?: number;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          created_at?: string;
        };
        Update: never;
      };
      saves: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          created_at?: string;
        };
        Update: never;
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          text?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'like' | 'comment' | 'follow' | 'radar';
          from_user_id: string;
          video_id: string | null;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'like' | 'comment' | 'follow' | 'radar';
          from_user_id: string;
          video_id?: string | null;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      radar: {
        Row: {
          id: string;
          corporate_id: string;
          individual_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          corporate_id: string;
          individual_id: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_type: UserType;
      notification_type: 'like' | 'comment' | 'follow' | 'radar';
    };
  };
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Video = Database['public']['Tables']['videos']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Save = Database['public']['Tables']['saves']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Follow = Database['public']['Tables']['follows']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Radar = Database['public']['Tables']['radar']['Row'];

// Extended types with relations
export interface VideoWithUser extends Video {
  user: Profile;
  is_liked?: boolean;
  is_saved?: boolean;
}

export interface CommentWithUser extends Comment {
  user: Profile;
}

export interface NotificationWithUser extends Notification {
  from_user: Profile;
  video?: Video;
}

