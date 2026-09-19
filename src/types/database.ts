export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_point_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          review_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          review_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          review_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          category: Database["public"]["Enums"]["opp_category"]
          created_at: string
          deadline: string | null
          deadline_precision:
            | Database["public"]["Enums"]["opp_deadline_precision"]
            | null
          deadline_type: Database["public"]["Enums"]["opp_deadline_type"]
          description: string | null
          id: string
          ingestion_method: Database["public"]["Enums"]["opp_ingestion_method"]
          is_korea_university_source: boolean
          last_checked_at: string
          organization: string
          review_note: string | null
          review_status: Database["public"]["Enums"]["opportunity_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          source_name: string
          source_url: string
          subject_id: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["opp_category"]
          created_at?: string
          deadline?: string | null
          deadline_precision?:
            | Database["public"]["Enums"]["opp_deadline_precision"]
            | null
          deadline_type: Database["public"]["Enums"]["opp_deadline_type"]
          description?: string | null
          id?: string
          ingestion_method?: Database["public"]["Enums"]["opp_ingestion_method"]
          is_korea_university_source?: boolean
          last_checked_at?: string
          organization: string
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["opportunity_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_name: string
          source_url: string
          subject_id: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["opp_category"]
          created_at?: string
          deadline?: string | null
          deadline_precision?:
            | Database["public"]["Enums"]["opp_deadline_precision"]
            | null
          deadline_type?: Database["public"]["Enums"]["opp_deadline_type"]
          description?: string | null
          id?: string
          ingestion_method?: Database["public"]["Enums"]["opp_ingestion_method"]
          is_korea_university_source?: boolean
          last_checked_at?: string
          organization?: string
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["opportunity_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_name?: string
          source_url?: string
          subject_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["profile_role"]
          review_access_until: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role?: Database["public"]["Enums"]["profile_role"]
          review_access_until?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["profile_role"]
          review_access_until?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_id: string
          body: string
          challenges: string | null
          created_at: string
          details: Json
          experience_year: number
          id: string
          is_anonymous: boolean
          is_demo: boolean
          opportunity_id: string | null
          period: string | null
          preparation: string | null
          pros: string | null
          result: string | null
          review_type: Database["public"]["Enums"]["review_kind"]
          role: string | null
          skills: string[]
          subject_id: string
          tips: string | null
          title: string
        }
        Insert: {
          author_id: string
          body: string
          challenges?: string | null
          created_at?: string
          details?: Json
          experience_year: number
          id?: string
          is_anonymous?: boolean
          is_demo?: boolean
          opportunity_id?: string | null
          period?: string | null
          preparation?: string | null
          pros?: string | null
          result?: string | null
          review_type: Database["public"]["Enums"]["review_kind"]
          role?: string | null
          skills?: string[]
          subject_id: string
          tips?: string | null
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          challenges?: string | null
          created_at?: string
          details?: Json
          experience_year?: number
          id?: string
          is_anonymous?: boolean
          is_demo?: boolean
          opportunity_id?: string | null
          period?: string | null
          preparation?: string | null
          pros?: string | null
          result?: string | null
          review_type?: Database["public"]["Enums"]["review_kind"]
          role?: string | null
          skills?: string[]
          subject_id?: string
          tips?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_opportunity_id_subject_id_fkey"
            columns: ["opportunity_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id", "subject_id"]
          },
          {
            foreignKeyName: "reviews_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["subject_kind"]
          name: string
          official_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["subject_kind"]
          name: string
          official_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["subject_kind"]
          name?: string
          official_url?: string | null
        }
        Relationships: []
      }
      team_contacts: {
        Row: {
          contact_link: string
          created_at: string
          id: string
          team_id: string
        }
        Insert: {
          contact_link: string
          created_at?: string
          id?: string
          team_id: string
        }
        Update: {
          contact_link?: string
          created_at?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_contacts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_contacts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_member_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["team_member_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_member_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["team_request_status"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["team_request_status"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["team_request_status"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          introduction: string | null
          max_members: number
          name: string
          opportunity_id: string
          owner_id: string
          roles: string[]
          skills: string[]
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          introduction?: string | null
          max_members: number
          name: string
          opportunity_id: string
          owner_id: string
          roles?: string[]
          skills?: string[]
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          introduction?: string | null
          max_members?: number
          name?: string
          opportunity_id?: string
          owner_id?: string
          roles?: string[]
          skills?: string[]
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_reviews: {
        Row: {
          author_display_name: string | null
          body: string | null
          challenges: string | null
          created_at: string | null
          details: Json | null
          experience_year: number | null
          id: string | null
          is_anonymous: boolean | null
          is_demo: boolean | null
          opportunity_id: string | null
          period: string | null
          preparation: string | null
          pros: string | null
          result: string | null
          review_type: Database["public"]["Enums"]["review_kind"] | null
          role: string | null
          skills: string[] | null
          subject_id: string | null
          tips: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_opportunity_id_subject_id_fkey"
            columns: ["opportunity_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id", "subject_id"]
          },
          {
            foreignKeyName: "reviews_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      public_teams: {
        Row: {
          created_at: string | null
          id: string | null
          introduction: string | null
          max_members: number | null
          member_count: number | null
          name: string | null
          opportunity_id: string | null
          roles: string[] | null
          skills: string[] | null
          status: Database["public"]["Enums"]["team_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          introduction?: string | null
          max_members?: number | null
          member_count?: never
          name?: string | null
          opportunity_id?: string | null
          roles?: string[] | null
          skills?: string[] | null
          status?: Database["public"]["Enums"]["team_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          introduction?: string | null
          max_members?: number | null
          member_count?: never
          name?: string | null
          opportunity_id?: string | null
          roles?: string[] | null
          skills?: string[] | null
          status?: Database["public"]["Enums"]["team_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_team_request: {
        Args: { p_actor_id: string; p_request_id: string; p_team_id: string }
        Returns: undefined
      }
      cancel_team_request: {
        Args: { p_actor_id: string; p_request_id: string; p_team_id: string }
        Returns: undefined
      }
      close_team: {
        Args: { p_actor_id: string; p_team_id: string }
        Returns: undefined
      }
      create_team: {
        Args: {
          p_actor_id: string
          p_contact_link: string
          p_introduction: string
          p_max_members: number
          p_name: string
          p_opportunity_id: string
          p_roles: string[]
          p_skills: string[]
        }
        Returns: string
      }
      create_team_request: {
        Args: { p_actor_id: string; p_message: string; p_team_id: string }
        Returns: string
      }
      purchase_review_access: {
        Args: { p_actor_id: string; p_product: string }
        Returns: { points: number; review_access_until: string }[]
      }
      reject_team_request: {
        Args: { p_actor_id: string; p_request_id: string; p_team_id: string }
        Returns: undefined
      }
      valid_text_array: {
        Args: { arr: string[]; max_items: number; max_len: number }
        Returns: boolean
      }
    }
    Enums: {
      opp_category:
        | "internship"
        | "hiring"
        | "hackathon"
        | "contest"
        | "lab"
        | "extracurricular"
      opp_deadline_precision: "time" | "date"
      opp_deadline_type: "fixed" | "rolling" | "tbd"
      opp_ingestion_method: "manual" | "script"
      opportunity_review_status: "pending" | "approved" | "rejected"
      profile_role: "member" | "operator"
      review_kind:
        | "contest"
        | "research"
        | "internship"
        | "employment"
        | "extracurricular"
      subject_kind:
        | "contest_series"
        | "company"
        | "lab"
        | "program"
        | "hackathon_series"
      team_member_role: "leader" | "member"
      team_request_status: "pending" | "accepted" | "rejected" | "cancelled"
      team_status: "open" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      opp_category: [
        "internship",
        "hiring",
        "hackathon",
        "contest",
        "lab",
        "extracurricular",
      ],
      opp_deadline_precision: ["time", "date"],
      opp_deadline_type: ["fixed", "rolling", "tbd"],
      opp_ingestion_method: ["manual", "script"],
      opportunity_review_status: ["pending", "approved", "rejected"],
      profile_role: ["member", "operator"],
      review_kind: [
        "contest",
        "research",
        "internship",
        "employment",
        "extracurricular",
      ],
      subject_kind: [
        "contest_series",
        "company",
        "lab",
        "program",
        "hackathon_series",
      ],
      team_member_role: ["leader", "member"],
      team_request_status: ["pending", "accepted", "rejected", "cancelled"],
      team_status: ["open", "closed"],
    },
  },
} as const
