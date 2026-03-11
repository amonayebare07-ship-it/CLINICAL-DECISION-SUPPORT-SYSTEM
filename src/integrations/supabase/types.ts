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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          reason: string
          staff_id: string | null
          status: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          reason: string
          staff_id?: string | null
          status?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string
          staff_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_profiles_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_staff_id_profiles_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dispensed_medications: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          patient_id: string
          quantity_dispensed: number
          staff_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          patient_id: string
          quantity_dispensed: number
          staff_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          patient_id?: string
          quantity_dispensed?: number
          staff_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispensed_medications_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medication_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispensed_medications_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          reference_range: string | null
          result: string
          staff_id: string
          status: string
          test_category: string
          test_date: string
          test_name: string
          unit: string | null
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          reference_range?: string | null
          result: string
          staff_id: string
          status?: string
          test_category?: string
          test_date?: string
          test_name: string
          unit?: string | null
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reference_range?: string | null
          result?: string
          staff_id?: string
          status?: string
          test_category?: string
          test_date?: string
          test_name?: string
          unit?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          created_at: string
          diagnosis: string | null
          follow_up_date: string | null
          id: string
          is_referred: boolean
          notes: string | null
          patient_id: string
          prescription: string | null
          referral_hospital: string | null
          referral_notes: string | null
          referral_reason: string | null
          staff_id: string
          symptoms: string | null
          treatment: string | null
          visit_id: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          is_referred?: boolean
          notes?: string | null
          patient_id: string
          prescription?: string | null
          referral_hospital?: string | null
          referral_notes?: string | null
          referral_reason?: string | null
          staff_id: string
          symptoms?: string | null
          treatment?: string | null
          visit_id: string
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          follow_up_date?: string | null
          id?: string
          is_referred?: boolean
          notes?: string | null
          patient_id?: string
          prescription?: string | null
          referral_hospital?: string | null
          referral_notes?: string | null
          referral_reason?: string | null
          staff_id?: string
          symptoms?: string | null
          treatment?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_inventory: {
        Row: {
          created_at: string
          description: string | null
          expiry_date: string | null
          id: string
          name: string
          quantity: number
          reorder_level: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          name: string
          quantity?: number
          reorder_level?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          id?: string
          name?: string
          quantity?: number
          reorder_level?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_allergies: {
        Row: {
          allergy_type: string
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          patient_id: string
          severity: string
        }
        Insert: {
          allergy_type?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          patient_id: string
          severity?: string
        }
        Update: {
          allergy_type?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          patient_id?: string
          severity?: string
        }
        Relationships: []
      }
      patient_conditions: {
        Row: {
          condition_name: string
          created_at: string
          created_by: string
          diagnosed_date: string | null
          id: string
          notes: string | null
          patient_id: string
          status: string
        }
        Insert: {
          condition_name: string
          created_at?: string
          created_by: string
          diagnosed_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          status?: string
        }
        Update: {
          condition_name?: string
          created_at?: string
          created_by?: string
          diagnosed_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          course: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          faculty: string | null
          full_name: string
          gender: string | null
          id: string
          last_seen: string | null
          phone: string | null
          student_id: string | null
          updated_at: string
          user_id: string
          year_of_study: number | null
        }
        Insert: {
          avatar_url?: string | null
          course?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          faculty?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_seen?: string | null
          phone?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
          year_of_study?: number | null
        }
        Update: {
          avatar_url?: string | null
          course?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          faculty?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_seen?: string | null
          phone?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
          year_of_study?: number | null
        }
        Relationships: []
      }
      referral_documents: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          notes: string | null
          patient_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          notes?: string | null
          patient_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          notes?: string | null
          patient_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_documents_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
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
      visits: {
        Row: {
          check_in_time: string
          check_out_time: string | null
          chief_complaint: string
          created_at: string
          id: string
          location: string | null
          patient_id: string
          priority: string | null
          staff_id: string | null
          status: string
        }
        Insert: {
          check_in_time?: string
          check_out_time?: string | null
          chief_complaint: string
          created_at?: string
          id?: string
          location?: string | null
          patient_id: string
          priority?: string | null
          staff_id?: string | null
          status?: string
        }
        Update: {
          check_in_time?: string
          check_out_time?: string | null
          chief_complaint?: string
          created_at?: string
          id?: string
          location?: string | null
          patient_id?: string
          priority?: string | null
          staff_id?: string | null
          status?: string
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
      app_role: "admin" | "staff" | "student"
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
      app_role: ["admin", "staff", "student"],
    },
  },
} as const
