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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allergies: {
        Row: {
          allergen: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          reaction: string | null
          severity: string | null
          updated_at: string
        }
        Insert: {
          allergen: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          reaction?: string | null
          severity?: string | null
          updated_at?: string
        }
        Update: {
          allergen?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reaction?: string | null
          severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          provider_id: string | null
          reason: string | null
          scheduled_at: string
          scheduled_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          provider_id?: string | null
          reason?: string | null
          scheduled_at: string
          scheduled_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string | null
          reason?: string | null
          scheduled_at?: string
          scheduled_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      escalation_history: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          acuity_score: number | null
          created_at: string
          id: string
          minutes_since_last_interaction: number
          patient_id: string
          reason: string
          triggered_at: string
          visit_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acuity_score?: number | null
          created_at?: string
          id?: string
          minutes_since_last_interaction: number
          patient_id: string
          reason?: string
          triggered_at?: string
          visit_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          acuity_score?: number | null
          created_at?: string
          id?: string
          minutes_since_last_interaction?: number
          patient_id?: string
          reason?: string
          triggered_at?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      medical_history: {
        Row: {
          condition: string
          created_at: string
          diagnosed_on: string | null
          id: string
          notes: string | null
          patient_id: string
          updated_at: string
        }
        Insert: {
          condition: string
          created_at?: string
          diagnosed_on?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          diagnosed_on?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          created_at: string
          dosage: string | null
          ended_on: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          patient_id: string
          started_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          ended_on?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          patient_id: string
          started_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          ended_on?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          patient_id?: string
          started_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicines_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          patient_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          patient_id: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          patient_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      patient_accounts: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          email: string
          id: string
          patient_id: string | null
          user_id: string
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          email: string
          id?: string
          patient_id?: string | null
          user_id: string
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          email?: string
          id?: string
          patient_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_accounts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_interactions: {
        Row: {
          created_at: string
          id: string
          logged_at: string
          logged_by: string | null
          note: string | null
          patient_id: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          note?: string | null
          patient_id: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          note?: string | null
          patient_id?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          age: number
          archived_at: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          name: string
          room_number: string | null
        }
        Insert: {
          age: number
          archived_at?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          name: string
          room_number?: string | null
        }
        Update: {
          age?: number
          archived_at?: string | null
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          room_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          id: string
          name: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      symptoms: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string | null
          patient_id: string
          reported_on: string
          severity: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          patient_id: string
          reported_on?: string
          severity?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reported_on?: string
          severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptoms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_statuses: {
        Row: {
          id: number
          level: string
          priority_score: number
        }
        Insert: {
          id?: number
          level: string
          priority_score: number
        }
        Update: {
          id?: number
          level?: string
          priority_score?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_statuses: {
        Row: {
          id: number
          status: string
        }
        Insert: {
          id?: number
          status: string
        }
        Update: {
          id?: number
          status?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          acuity_score: number | null
          admission_time: string
          completed_time: string | null
          created_at: string
          diastolic_bp: number | null
          documentation_complete: boolean
          heart_rate: number | null
          id: string
          last_interaction_at: string | null
          patient_id: string
          provider_id: string | null
          seen_time: string | null
          spo2: number | null
          status_id: number
          systolic_bp: number | null
          triage_id: number | null
        }
        Insert: {
          acuity_score?: number | null
          admission_time?: string
          completed_time?: string | null
          created_at?: string
          diastolic_bp?: number | null
          documentation_complete?: boolean
          heart_rate?: number | null
          id?: string
          last_interaction_at?: string | null
          patient_id: string
          provider_id?: string | null
          seen_time?: string | null
          spo2?: number | null
          status_id?: number
          systolic_bp?: number | null
          triage_id?: number | null
        }
        Update: {
          acuity_score?: number | null
          admission_time?: string
          completed_time?: string | null
          created_at?: string
          diastolic_bp?: number | null
          documentation_complete?: boolean
          heart_rate?: number | null
          id?: string
          last_interaction_at?: string | null
          patient_id?: string
          provider_id?: string | null
          seen_time?: string | null
          spo2?: number | null
          status_id?: number
          systolic_bp?: number | null
          triage_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "visit_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_triage_id_fkey"
            columns: ["triage_id"]
            isOneToOne: false
            referencedRelation: "triage_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "nurse" | "patient" | "charge_nurse"
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
      app_role: ["admin", "doctor", "nurse", "patient", "charge_nurse"],
    },
  },
} as const
