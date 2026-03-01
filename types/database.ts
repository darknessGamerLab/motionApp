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
          tax_office: string | null;
          tax_number: string | null;
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
          tax_office?: string | null;
          tax_number?: string | null;
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
          tax_office?: string | null;
          tax_number?: string | null;
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
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
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
          type: 'like' | 'comment' | 'follow' | 'system';
          actor_id: string | null;
          video_id: string | null;
          content: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'like' | 'comment' | 'follow' | 'system';
          actor_id?: string | null;
          video_id?: string | null;
          content?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      corporate_applications: {
        Row: {
          id: string;
          user_id: string;
          user_email: string;
          company_name: string;
          tax_office: string;
          tax_number: string;
          phone: string;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_email: string;
          company_name: string;
          tax_office: string;
          tax_number: string;
          phone: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
        };
        Update: {
          status?: 'pending' | 'approved' | 'rejected';
        };
      };
      sponsor_banners: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string;
          brand: string | null;
          target_url: string | null;
          clicks: number;
          views: number;
          is_active: boolean;
          slider_pos: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          image_url: string;
          brand?: string | null;
          target_url?: string | null;
          clicks?: number;
          views?: number;
          is_active?: boolean;
          slider_pos?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          subtitle?: string | null;
          image_url?: string;
          brand?: string | null;
          target_url?: string | null;
          clicks?: number;
          views?: number;
          is_active?: boolean;
          slider_pos?: number;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: 'account' | 'content';
          target_id: string;
          reason: string | null;
          details: string | null;
          status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: 'account' | 'content';
          target_id: string;
          reason?: string | null;
          details?: string | null;
          status?: 'pending' | 'investigating' | 'resolved' | 'dismissed';
          created_at?: string;
        };
        Update: {
          status?: 'pending' | 'investigating' | 'resolved' | 'dismissed';
        };
      };
      radars: {
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
      radar: { // Legacy spotlight, can be removed eventually but keeping for now
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          video_url: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          video_url?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          video_url?: string | null;
          image_url?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_type: UserType;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Video = Database['public']['Tables']['videos']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Save = Database['public']['Tables']['saves']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Follow = Database['public']['Tables']['follows']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Radar = Database['public']['Tables']['radars']['Row'];
export type CorporateApplication = Database['public']['Tables']['corporate_applications']['Row'];
export type SponsorBanner = Database['public']['Tables']['sponsor_banners']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];

// Extended types with relations
export interface VideoWithUser extends Video {
  user: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}
