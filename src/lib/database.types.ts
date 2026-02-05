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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'finance' | 'approver' | 'candidate'
          avatar_url: string | null
          department: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'finance' | 'approver' | 'candidate'
          avatar_url?: string | null
          department?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'finance' | 'approver' | 'candidate'
          avatar_url?: string | null
          department?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          requisition_id: string
          department: string
          location: string
          job_type: 'full_time' | 'part_time' | 'contract' | 'internship'
          description: string
          requirements: string | null
          salary_min: number | null
          salary_max: number | null
          status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'closed'
          hiring_manager_id: string | null
          recruiter_id: string | null
          created_by: string
          is_published: boolean
          number_of_openings: number | null
          role_type: 'new_role' | 'backfill'
          replacement_employee: string | null
          top_skills: string | null
          tools_required: string | null
          role_objective: string | null
          target_joining_timeline: string | null
          priority: 'high' | 'medium' | 'low'
          min_experience_years: number | null
          target_hire_date: string | null
          number_of_interview_rounds: number | null
          panelist_names: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          requisition_id?: string
          department: string
          location: string
          job_type?: 'full_time' | 'part_time' | 'contract' | 'internship'
          description: string
          requirements?: string | null
          salary_min?: number | null
          salary_max?: number | null
          status?: 'draft' | 'pending_approval' | 'approved' | 'published' | 'closed'
          hiring_manager_id?: string | null
          recruiter_id?: string | null
          created_by: string
          is_published?: boolean
          number_of_openings?: number | null
          role_type?: 'new_role' | 'backfill'
          replacement_employee?: string | null
          top_skills?: string | null
          tools_required?: string | null
          role_objective?: string | null
          target_joining_timeline?: string | null
          priority?: 'high' | 'medium' | 'low'
          min_experience_years?: number | null
          target_hire_date?: string | null
          number_of_interview_rounds?: number | null
          panelist_names?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          requisition_id?: string
          department?: string
          location?: string
          job_type?: 'full_time' | 'part_time' | 'contract' | 'internship'
          description?: string
          requirements?: string | null
          salary_min?: number | null
          salary_max?: number | null
          status?: 'draft' | 'pending_approval' | 'approved' | 'published' | 'closed'
          hiring_manager_id?: string | null
          recruiter_id?: string | null
          created_by?: string
          is_published?: boolean
          number_of_openings?: number | null
          role_type?: 'new_role' | 'backfill'
          replacement_employee?: string | null
          top_skills?: string | null
          tools_required?: string | null
          role_objective?: string | null
          target_joining_timeline?: string | null
          priority?: 'high' | 'medium' | 'low'
          min_experience_years?: number | null
          target_hire_date?: string | null
          number_of_interview_rounds?: number | null
          panelist_names?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      candidates: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          resume_url: string | null
          linkedin_url: string | null
          current_company: string | null
          current_title: string | null
          years_of_experience: number | null
          skills: string[]
          source: string | null
          current_stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          tags: string[]
          user_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string | null
          resume_url?: string | null
          linkedin_url?: string | null
          current_company?: string | null
          current_title?: string | null
          years_of_experience?: number | null
          skills?: string[]
          source?: string | null
          current_stage?: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          tags?: string[]
          user_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          resume_url?: string | null
          linkedin_url?: string | null
          current_company?: string | null
          current_title?: string | null
          years_of_experience?: number | null
          skills?: string[]
          source?: string | null
          current_stage?: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          tags?: string[]
          user_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      job_applications: {
        Row: {
          id: string
          job_id: string
          candidate_id: string
          stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          stage_order: number
          cover_letter: string | null
          applied_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          candidate_id: string
          stage?: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          stage_order?: number
          cover_letter?: string | null
          applied_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          candidate_id?: string
          stage?: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          stage_order?: number
          cover_letter?: string | null
          applied_at?: string
          updated_at?: string
        }
      }
      interviews: {
        Row: {
          id: string
          application_id: string
          title: string
          interview_type: string
          scheduled_at: string
          duration_minutes: number
          location: string | null
          meeting_link: string | null
          status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          title: string
          interview_type: string
          scheduled_at: string
          duration_minutes?: number
          location?: string | null
          meeting_link?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          title?: string
          interview_type?: string
          scheduled_at?: string
          duration_minutes?: number
          location?: string | null
          meeting_link?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      interview_panelists: {
        Row: {
          id: string
          interview_id: string
          panelist_id: string
          is_required: boolean
          created_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          panelist_id: string
          is_required?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          panelist_id?: string
          is_required?: boolean
          created_at?: string
        }
      }
      interview_feedback: {
        Row: {
          id: string
          interview_id: string
          panelist_id: string
          overall_rating: number | null
          technical_skills: number | null
          communication: number | null
          culture_fit: number | null
          recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no' | null
          comments: string | null
          submitted_at: string
          created_at: string
        }
        Insert: {
          id?: string
          interview_id: string
          panelist_id: string
          overall_rating?: number | null
          technical_skills?: number | null
          communication?: number | null
          culture_fit?: number | null
          recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no' | null
          comments?: string | null
          submitted_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          interview_id?: string
          panelist_id?: string
          overall_rating?: number | null
          technical_skills?: number | null
          communication?: number | null
          culture_fit?: number | null
          recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no' | null
          comments?: string | null
          submitted_at?: string
          created_at?: string
        }
      }
      offers: {
        Row: {
          id: string
          application_id: string
          offer_letter_url: string | null
          fixed_ctc: number
          variable_ctc: number
          joining_bonus: number
          equity: string | null
          start_date: string | null
          status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired'
          version: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          offer_letter_url?: string | null
          fixed_ctc: number
          variable_ctc?: number
          joining_bonus?: number
          equity?: string | null
          start_date?: string | null
          status?: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired'
          version?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          offer_letter_url?: string | null
          fixed_ctc?: number
          variable_ctc?: number
          joining_bonus?: number
          equity?: string | null
          start_date?: string | null
          status?: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired'
          version?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: string
          description: string
          metadata: Json
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: string
          description: string
          metadata?: Json
          performed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          action?: string
          description?: string
          metadata?: Json
          performed_by?: string | null
          created_at?: string
        }
      }
      candidate_notes: {
        Row: {
          id: string
          candidate_id: string
          application_id: string | null
          content: string
          mentions: string[]
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          application_id?: string | null
          content: string
          mentions?: string[]
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          application_id?: string | null
          content?: string
          mentions?: string[]
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      approvals: {
        Row: {
          id: string
          job_id: string
          approver_id: string | null
          status: 'pending' | 'approved' | 'rejected'
          comments: string | null
          approved_at: string | null
          approver_type: string | null
          approver_email: string | null
          notification_sent: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          approver_id?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          comments?: string | null
          approved_at?: string | null
          approver_type?: string | null
          approver_email?: string | null
          notification_sent?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          approver_id?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          comments?: string | null
          approved_at?: string | null
          approver_type?: string | null
          approver_email?: string | null
          notification_sent?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      interview_rounds: {
        Row: {
          id: string
          application_id: string
          round_number: number
          round_name: string | null
          status: 'pending' | 'scheduled' | 'completed' | 'cancelled'
          scheduled_at: string | null
          completed_at: string | null
          feedback: string | null
          result: 'passed' | 'failed' | 'pending' | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          round_number: number
          round_name?: string | null
          status?: 'pending' | 'scheduled' | 'completed' | 'cancelled'
          scheduled_at?: string | null
          completed_at?: string | null
          feedback?: string | null
          result?: 'passed' | 'failed' | 'pending' | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          round_number?: number
          round_name?: string | null
          status?: 'pending' | 'scheduled' | 'completed' | 'cancelled'
          scheduled_at?: string | null
          completed_at?: string | null
          feedback?: string | null
          result?: 'passed' | 'failed' | 'pending' | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      interview_round_panelists: {
        Row: {
          id: string
          interview_round_id: string
          panelist_name: string
          panelist_email: string
          panelist_role: string | null
          feedback: string | null
          rating: number | null
          recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          interview_round_id: string
          panelist_name: string
          panelist_email: string
          panelist_role?: string | null
          feedback?: string | null
          rating?: number | null
          recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          interview_round_id?: string
          panelist_name?: string
          panelist_email?: string
          panelist_role?: string | null
          feedback?: string | null
          rating?: number | null
          recommendation?: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no' | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'finance' | 'approver' | 'candidate'
      job_status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'closed'
      candidate_stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
      interview_status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
      offer_status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired'
    }
  }
}
