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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      appointment: {
        Row: {
          created_at: string
          duration_minutes: number
          encounter_id: string
          id: string
          scheduled_at: string
          status_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          encounter_id: string
          id?: string
          scheduled_at: string
          status_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          encounter_id?: string
          id?: string
          scheduled_at?: string
          status_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "encounter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ref_code"
            referencedColumns: ["id"]
          },
        ]
      }
      // Additional table types would continue here...
      // Note: Full types are available in the generated output
    }
    Views: {
      active_admissions: {
        Row: {
          admission_date: string | null
          bed_number: string | null
          department_name: string | null
          doctor_name: string | null
          patient_name: string | null
          room_number: string | null
          status: string | null
        }
        Relationships: []
      }
      appointments_legacy: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          doctor_name: string | null
          patient_name: string | null
          status: string | null
        }
        Relationships: []
      }
      billing_items_details: {
        Row: {
          billing_summary_id: string | null
          item_type: string | null
          quantity: number | null
          service_name: string | null
          total_amount: number | null
          unit_rate: number | null
        }
        Relationships: []
      }
      billing_items_legacy: {
        Row: {
          billing_id: string | null
          description: string | null
          line_type: string | null
          qty: number | null
          total_amount: number | null
          unit_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_item_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
            referencedRelation: "billing"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_summary_details: {
        Row: {
          bill_number: string | null
          patient_name: string | null
          status: string | null
          subtotal: number | null
          total_amount: number | null
        }
        Relationships: []
      }
      lab_results_legacy: {
        Row: {
          patient_name: string | null
          result_date: string | null
          test_name: string | null
          test_result: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  core: {
    Tables: {
      departments: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_id: string
          description: string | null
          facility_id: string
          head_of_department: string | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string
          description?: string | null
          facility_id: string
          head_of_department?: string | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string
          description?: string | null
          facility_id?: string
          head_of_department?: string | null
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "departments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["facility_id"]
          },
          {
            foreignKeyName: "departments_head_of_department_fkey"
            columns: ["head_of_department"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "departments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: Json | null
          contact_info: Json | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          facility_id: string
          facility_type: string | null
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: Json | null
          contact_info?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          facility_id?: string
          facility_type?: string | null
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: Json | null
          contact_info?: Json | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          facility_id?: string
          facility_type?: string | null
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facilities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facilities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          patient_id: string
          person_id: string
          uhid: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          patient_id?: string
          person_id: string
          uhid: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          patient_id?: string
          person_id?: string
          uhid?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "patients_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "patients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      persons: {
        Row: {
          address: Json | null
          dob: string | null
          email: string | null
          first_name: string
          last_name: string
          person_id: string
          phone: string | null
          sex: string | null
        }
        Insert: {
          address?: Json | null
          dob?: string | null
          email?: string | null
          first_name: string
          last_name: string
          person_id?: string
          phone?: string | null
          sex?: string | null
        }
        Update: {
          address?: Json | null
          dob?: string | null
          email?: string | null
          first_name?: string
          last_name?: string
          person_id?: string
          phone?: string | null
          sex?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department_id: string | null
          employee_id: string
          hire_date: string
          person_id: string
          staff_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          employee_id: string
          hire_date: string
          person_id: string
          staff_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department_id?: string | null
          employee_id?: string
          hire_date?: string
          person_id?: string
          staff_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["department_id"]
          },
          {
            foreignKeyName: "staff_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "staff_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          role_id: string
          role_name: string
          staff_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          role_id?: string
          role_name: string
          staff_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          role_id?: string
          role_name?: string
          staff_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_roles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_roles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          end_time: string
          schedule_date: string
          schedule_id: string
          staff_id: string
          start_time: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_time: string
          schedule_date: string
          schedule_id?: string
          staff_id: string
          start_time: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          end_time?: string
          schedule_date?: string
          schedule_id?: string
          staff_id?: string
          start_time?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_schedules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          party_id: string
          updated_at: string
          updated_by: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          party_id: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          party_id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "users_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "party"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["core"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
        ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : {})
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Row: infer R
      }
      ? R
      : never
    : never
  : PublicTableNameOrOptions extends keyof (
      Database["public"]["Tables"] &
      Database["core"]["Tables"]
    )
  ? (
      Database["public"]["Tables"] &
      Database["core"]["Tables"]
    )[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["core"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
        ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : {})
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
      }
      ? I
      : never
    : never
  : PublicTableNameOrOptions extends keyof (
      Database["public"]["Tables"] &
      Database["core"]["Tables"]
    )
  ? (
      Database["public"]["Tables"] &
      Database["core"]["Tables"]
    )[PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["core"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
        ? Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : {})
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]] extends { Tables: any }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
      }
      ? U
      : never
    : never
  : PublicTableNameOrOptions extends keyof (
      Database["public"]["Tables"] &
      Database["core"]["Tables"]
    )
  ? (
      Database["public"]["Tables"] &
      Database["core"]["Tables"]
    )[PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof (Database["public"]["Enums"] & Database["core"]["Enums"])
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicEnumNameOrOptions["schema"]] extends { Enums: any }
        ? Database[PublicEnumNameOrOptions["schema"]]["Enums"]
        : {})
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]] extends { Enums: any }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : never
  : PublicEnumNameOrOptions extends keyof (
      Database["public"]["Enums"] &
      Database["core"]["Enums"]
    )
  ? (
      Database["public"]["Enums"] &
      Database["core"]["Enums"]
    )[PublicEnumNameOrOptions]
  : never