export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cars: {
        Row: {
          chassis: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          chassis: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          chassis?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      containers: {
        Row: {
          capacity: number
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          capacity: number
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          nickname: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          nickname?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          nickname?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      season_driver_associations: {
        Row: {
          car_id: string
          car_number: number
          category: Database["public"]["Enums"]["driver_category"]
          created_at: string | null
          driver_id: string
          id: string
          season_id: string
          updated_at: string | null
        }
        Insert: {
          car_id: string
          car_number: number
          category: Database["public"]["Enums"]["driver_category"]
          created_at?: string | null
          driver_id: string
          id?: string
          season_id: string
          updated_at?: string | null
        }
        Update: {
          car_id?: string
          car_number?: number
          category?: Database["public"]["Enums"]["driver_category"]
          created_at?: string | null
          driver_id?: string
          id?: string
          season_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_driver_associations_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_driver_associations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_driver_associations_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          year?: number
        }
        Relationships: []
      }
      tire_history: {
        Row: {
          created_at: string | null
          driver_id: string | null
          event_type: Database["public"]["Enums"]["tire_event_type"]
          from_location_id: string | null
          from_location_type:
            | Database["public"]["Enums"]["location_type"]
            | null
          from_status: Database["public"]["Enums"]["tire_status"] | null
          id: string
          metadata: Json | null
          performed_by: string | null
          position: string | null
          tire_id: string
          to_location_id: string | null
          to_location_type: Database["public"]["Enums"]["location_type"] | null
          to_status: Database["public"]["Enums"]["tire_status"] | null
        }
        Insert: {
          created_at?: string | null
          driver_id?: string | null
          event_type: Database["public"]["Enums"]["tire_event_type"]
          from_location_id?: string | null
          from_location_type?:
            | Database["public"]["Enums"]["location_type"]
            | null
          from_status?: Database["public"]["Enums"]["tire_status"] | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          position?: string | null
          tire_id: string
          to_location_id?: string | null
          to_location_type?: Database["public"]["Enums"]["location_type"] | null
          to_status?: Database["public"]["Enums"]["tire_status"] | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string | null
          event_type?: Database["public"]["Enums"]["tire_event_type"]
          from_location_id?: string | null
          from_location_type?:
            | Database["public"]["Enums"]["location_type"]
            | null
          from_status?: Database["public"]["Enums"]["tire_status"] | null
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          position?: string | null
          tire_id?: string
          to_location_id?: string | null
          to_location_type?: Database["public"]["Enums"]["location_type"] | null
          to_status?: Database["public"]["Enums"]["tire_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "tire_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tire_history_tire_id_fkey"
            columns: ["tire_id"]
            isOneToOne: false
            referencedRelation: "tires"
            referencedColumns: ["id"]
          },
        ]
      }
      tire_models: {
        Row: {
          compound: string | null
          created_at: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          compound?: string | null
          created_at?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          compound?: string | null
          created_at?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tires: {
        Row: {
          barcode: string
          created_at: string | null
          current_driver_id: string | null
          current_location_id: string | null
          current_location_type: Database["public"]["Enums"]["location_type"]
          id: string
          model_id: string
          position: string | null
          status: Database["public"]["Enums"]["tire_status"]
          updated_at: string | null
        }
        Insert: {
          barcode: string
          created_at?: string | null
          current_driver_id?: string | null
          current_location_id?: string | null
          current_location_type?: Database["public"]["Enums"]["location_type"]
          id?: string
          model_id: string
          position?: string | null
          status?: Database["public"]["Enums"]["tire_status"]
          updated_at?: string | null
        }
        Update: {
          barcode?: string
          created_at?: string | null
          current_driver_id?: string | null
          current_location_id?: string | null
          current_location_type?: Database["public"]["Enums"]["location_type"]
          id?: string
          model_id?: string
          position?: string | null
          status?: Database["public"]["Enums"]["tire_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tires_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tires_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tire_models"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator"
      driver_category: "carrera" | "challenge" | "trophy"
      location_type: "container" | "piloto" | "none"
      tire_event_type:
        | "created"
        | "moved"
        | "status_changed"
        | "assigned_to_driver"
        | "returned"
      tire_status: "estoque" | "piloto" | "cup" | "dsi"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "operator"],
      driver_category: ["carrera", "challenge", "trophy"],
      location_type: ["container", "piloto", "none"],
      tire_event_type: [
        "created",
        "moved",
        "status_changed",
        "assigned_to_driver",
        "returned",
      ],
      tire_status: ["estoque", "piloto", "cup", "dsi"],
    },
  },
} as const
