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
      _migrations: {
        Row: {
          applied_at: string
          filename: string
        }
        Insert: {
          applied_at?: string
          filename: string
        }
        Update: {
          applied_at?: string
          filename?: string
        }
        Relationships: []
      }
      agent_skip_rules: {
        Row: {
          case_sensitive: boolean
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          match_type: string
          pattern: string
          updated_at: string
        }
        Insert: {
          case_sensitive?: boolean
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          match_type?: string
          pattern?: string
          updated_at?: string
        }
        Update: {
          case_sensitive?: boolean
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          match_type?: string
          pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_tools: {
        Row: {
          body_template: Json | null
          created_at: string
          description: string
          enabled: boolean
          headers: Json
          http_method: string | null
          id: string
          input_schema: Json
          name: string
          timeout_ms: number
          tool_type: string
          updated_at: string
          url_template: string | null
        }
        Insert: {
          body_template?: Json | null
          created_at?: string
          description: string
          enabled?: boolean
          headers?: Json
          http_method?: string | null
          id?: string
          input_schema?: Json
          name: string
          timeout_ms?: number
          tool_type?: string
          updated_at?: string
          url_template?: string | null
        }
        Update: {
          body_template?: Json | null
          created_at?: string
          description?: string
          enabled?: boolean
          headers?: Json
          http_method?: string | null
          id?: string
          input_schema?: Json
          name?: string
          timeout_ms?: number
          tool_type?: string
          updated_at?: string
          url_template?: string | null
        }
        Relationships: []
      }
      alert_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          webhook_enabled: boolean
          webhook_kinds: string[]
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_enabled?: boolean
          webhook_kinds?: string[]
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          webhook_enabled?: boolean
          webhook_kinds?: string[]
          webhook_url?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          description: string | null
          id: string
          kind: string
          metadata: Json
          ref_id: string | null
          ref_table: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          metadata?: Json
          ref_id?: string | null
          ref_table?: string | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          metadata?: Json
          ref_id?: string | null
          ref_table?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          client_email: string
          client_name: string
          client_phone: string
          coverage: string
          created_at: string
          id: string
          insurance_type: string
          insurer: string
          notes: string
          premium: number
          status: string
        }
        Insert: {
          client_email?: string
          client_name: string
          client_phone?: string
          coverage?: string
          created_at?: string
          id?: string
          insurance_type: string
          insurer: string
          notes?: string
          premium?: number
          status?: string
        }
        Update: {
          client_email?: string
          client_name?: string
          client_phone?: string
          coverage?: string
          created_at?: string
          id?: string
          insurance_type?: string
          insurer?: string
          notes?: string
          premium?: number
          status?: string
        }
        Relationships: []
      }
      cotizaciones_diarias: {
        Row: {
          aseguradoras: Json
          categoria: string
          codigo: string | null
          ejecutado_en: string
          error_message: string | null
          fecha: string
          id: string
          id_cotizacion: number | null
          pdf_filename: string | null
          pdf_url: string | null
          rango_edad: string
          status: string
          total_planes: number
        }
        Insert: {
          aseguradoras?: Json
          categoria?: string
          codigo?: string | null
          ejecutado_en?: string
          error_message?: string | null
          fecha?: string
          id?: string
          id_cotizacion?: number | null
          pdf_filename?: string | null
          pdf_url?: string | null
          rango_edad?: string
          status?: string
          total_planes?: number
        }
        Update: {
          aseguradoras?: Json
          categoria?: string
          codigo?: string | null
          ejecutado_en?: string
          error_message?: string | null
          fecha?: string
          id?: string
          id_cotizacion?: number | null
          pdf_filename?: string | null
          pdf_url?: string | null
          rango_edad?: string
          status?: string
          total_planes?: number
        }
        Relationships: []
      }
      daily_plan_catalog: {
        Row: {
          ejecutado_en: string
          fecha: string
          id: string
          id_aseguradora: number
          id_plan: number
          nombre_aseguradora: string
          nombre_plan: string
          subcategoria: string | null
          suma_asegurada: number
          tipo: number
        }
        Insert: {
          ejecutado_en?: string
          fecha?: string
          id?: string
          id_aseguradora: number
          id_plan: number
          nombre_aseguradora: string
          nombre_plan: string
          subcategoria?: string | null
          suma_asegurada?: number
          tipo: number
        }
        Update: {
          ejecutado_en?: string
          fecha?: string
          id?: string
          id_aseguradora?: number
          id_plan?: number
          nombre_aseguradora?: string
          nombre_plan?: string
          subcategoria?: string | null
          suma_asegurada?: number
          tipo?: number
        }
        Relationships: []
      }
      daily_prices: {
        Row: {
          aseguradora: string
          ejecutado_en: string
          fecha: string
          id: string
          nombre_plan: string | null
          prima_anual: number
          prima_mensual: number
          prima_semestral: number
          prima_trimestral: number
          rango_edad: string
          subcategoria: string
          suma_asegurada: number
        }
        Insert: {
          aseguradora?: string
          ejecutado_en?: string
          fecha: string
          id?: string
          nombre_plan?: string | null
          prima_anual: number
          prima_mensual: number
          prima_semestral: number
          prima_trimestral: number
          rango_edad: string
          subcategoria: string
          suma_asegurada: number
        }
        Update: {
          aseguradora?: string
          ejecutado_en?: string
          fecha?: string
          id?: string
          nombre_plan?: string | null
          prima_anual?: number
          prima_mensual?: number
          prima_semestral?: number
          prima_trimestral?: number
          rango_edad?: string
          subcategoria?: string
          suma_asegurada?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      drafts: {
        Row: {
          agent_metadata: Json
          body: string
          created_at: string
          edited_body: string | null
          id: string
          message_id: string
          reviewer_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_metadata?: Json
          body: string
          created_at?: string
          edited_body?: string | null
          id?: string
          message_id: string
          reviewer_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_metadata?: Json
          body?: string
          created_at?: string
          edited_body?: string | null
          id?: string
          message_id?: string
          reviewer_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_config: {
        Row: {
          active_days: number[]
          business_hours: Json | null
          business_hours_end: number
          business_hours_start: number
          created_at: string
          enabled: boolean
          id: string
          is_active: boolean
          max_follow_ups: number
          min_gap_hours: number
          notes: string | null
          run_stage_ids: number[]
          run_user_ids: number[]
          stop_stage_ids: number[]
          timezone: string
          updated_at: string
        }
        Insert: {
          active_days?: number[]
          business_hours?: Json | null
          business_hours_end?: number
          business_hours_start?: number
          created_at?: string
          enabled?: boolean
          id?: string
          is_active?: boolean
          max_follow_ups?: number
          min_gap_hours?: number
          notes?: string | null
          run_stage_ids?: number[]
          run_user_ids?: number[]
          stop_stage_ids?: number[]
          timezone?: string
          updated_at?: string
        }
        Update: {
          active_days?: number[]
          business_hours?: Json | null
          business_hours_end?: number
          business_hours_start?: number
          created_at?: string
          enabled?: boolean
          id?: string
          is_active?: boolean
          max_follow_ups?: number
          min_gap_hours?: number
          notes?: string | null
          run_stage_ids?: number[]
          run_user_ids?: number[]
          stop_stage_ids?: number[]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      follow_up_fields: {
        Row: {
          created_at: string
          id: string
          kommo_field_id: number
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          kommo_field_id: number
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          kommo_field_id?: number
          label?: string
        }
        Relationships: []
      }
      follow_up_steps: {
        Row: {
          created_at: string
          delay_hours: number
          enabled: boolean
          id: string
          step_number: number
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_hours: number
          enabled?: boolean
          id?: string
          step_number: number
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_hours?: number
          enabled?: boolean
          id?: string
          step_number?: number
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "follow_up_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_templates: {
        Row: {
          body: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          salesbot_id: number | null
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          salesbot_id?: number | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          salesbot_id?: number | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          error: string | null
          id: string
          lead_id: string
          sent_at: string
          status: string
          step: number
          template_id: string | null
          variables: Json
        }
        Insert: {
          error?: string | null
          id?: string
          lead_id: string
          sent_at?: string
          status: string
          step: number
          template_id?: string | null
          variables?: Json
        }
        Update: {
          error?: string | null
          id?: string
          lead_id?: string
          sent_at?: string
          status?: string
          step?: number
          template_id?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "follow_up_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      graders: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          prompt: string
          scale: string
          slug: string
          source: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          prompt: string
          scale?: string
          slug: string
          source?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          prompt?: string
          scale?: string
          slug?: string
          source?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      inbound_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          source: string
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload: Json
          processed_at?: string | null
          source?: string
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      kb_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          collection: string | null
          created_at: string
          embeddings_dim: number | null
          embeddings_provider: string | null
          error_message: string | null
          id: string
          metadata: Json
          policy_type: string | null
          raw_text: string | null
          source_filename: string | null
          source_type: string
          status: string
          storage_path: string | null
          title: string
          total_chunks: number
          updated_at: string
        }
        Insert: {
          collection?: string | null
          created_at?: string
          embeddings_dim?: number | null
          embeddings_provider?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          policy_type?: string | null
          raw_text?: string | null
          source_filename?: string | null
          source_type: string
          status?: string
          storage_path?: string | null
          title: string
          total_chunks?: number
          updated_at?: string
        }
        Update: {
          collection?: string | null
          created_at?: string
          embeddings_dim?: number | null
          embeddings_provider?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          policy_type?: string | null
          raw_text?: string | null
          source_filename?: string | null
          source_type?: string
          status?: string
          storage_path?: string | null
          title?: string
          total_chunks?: number
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_files: {
        Row: {
          chunks_count: number | null
          collection: string
          created_at: string | null
          error_message: string | null
          id: string
          name: string
          policy_type: string | null
          size: number | null
          status: string | null
          storage_path: string | null
          type: string
        }
        Insert: {
          chunks_count?: number | null
          collection: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          name: string
          policy_type?: string | null
          size?: number | null
          status?: string | null
          storage_path?: string | null
          type: string
        }
        Update: {
          chunks_count?: number | null
          collection?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          name?: string
          policy_type?: string | null
          size?: number | null
          status?: string | null
          storage_path?: string | null
          type?: string
        }
        Relationships: []
      }
      kommo_credentials: {
        Row: {
          account_id: number | null
          api_domain: string | null
          client_id: string
          created_at: string
          encrypted_access_token: string
          encrypted_refresh_token: string | null
          id: string
          is_active: boolean
          scope: string | null
          subdomain: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          account_id?: number | null
          api_domain?: string | null
          client_id: string
          created_at?: string
          encrypted_access_token: string
          encrypted_refresh_token?: string | null
          id?: string
          is_active?: boolean
          scope?: string | null
          subdomain: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          account_id?: number | null
          api_domain?: string | null
          client_id?: string
          created_at?: string
          encrypted_access_token?: string
          encrypted_refresh_token?: string | null
          id?: string
          is_active?: boolean
          scope?: string | null
          subdomain?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kommo_publish_config: {
        Row: {
          agent_enabled: boolean
          agent_off_field_id: number | null
          agent_off_field_name: string | null
          answer_max_age_hours: number
          auto_reply_mode: string
          bcv_rate_enabled: boolean
          bypass_review: boolean
          comment_field_id: number | null
          comment_instructions: string | null
          comment_reply_enabled: boolean
          comment_reply_rules: string | null
          comment_salesbot_id: number | null
          comment_source_ids: number[]
          cooldown_window_hours: number
          created_at: string
          crm_actions_enabled: boolean
          crm_can_move_stage: boolean
          crm_can_update_contact: boolean
          crm_can_update_lead: boolean
          id: string
          ignored_channels: string[]
          ignored_stage_ids: number[]
          is_active: boolean
          max_responses_per_lead: number
          notes: string | null
          publish_from: string | null
          publishing_enabled: boolean
          respond_to_audio: boolean
          respond_to_documents: boolean
          respond_to_images: boolean
          response_cooldown_seconds: number
          response_custom_field_id: number | null
          response_debounce_seconds: number
          salesbot_id: number | null
          shopify_actions_enabled: boolean
          shopify_can_checkout: boolean
          shopify_can_orders: boolean
          shopify_can_search: boolean
          updated_at: string
        }
        Insert: {
          agent_enabled?: boolean
          agent_off_field_id?: number | null
          agent_off_field_name?: string | null
          answer_max_age_hours?: number
          auto_reply_mode?: string
          bcv_rate_enabled?: boolean
          bypass_review?: boolean
          comment_field_id?: number | null
          comment_instructions?: string | null
          comment_reply_enabled?: boolean
          comment_reply_rules?: string | null
          comment_salesbot_id?: number | null
          comment_source_ids?: number[]
          cooldown_window_hours?: number
          created_at?: string
          crm_actions_enabled?: boolean
          crm_can_move_stage?: boolean
          crm_can_update_contact?: boolean
          crm_can_update_lead?: boolean
          id?: string
          ignored_channels?: string[]
          ignored_stage_ids?: number[]
          is_active?: boolean
          max_responses_per_lead?: number
          notes?: string | null
          publish_from?: string | null
          publishing_enabled?: boolean
          respond_to_audio?: boolean
          respond_to_documents?: boolean
          respond_to_images?: boolean
          response_cooldown_seconds?: number
          response_custom_field_id?: number | null
          response_debounce_seconds?: number
          salesbot_id?: number | null
          shopify_actions_enabled?: boolean
          shopify_can_checkout?: boolean
          shopify_can_orders?: boolean
          shopify_can_search?: boolean
          updated_at?: string
        }
        Update: {
          agent_enabled?: boolean
          agent_off_field_id?: number | null
          agent_off_field_name?: string | null
          answer_max_age_hours?: number
          auto_reply_mode?: string
          bcv_rate_enabled?: boolean
          bypass_review?: boolean
          comment_field_id?: number | null
          comment_instructions?: string | null
          comment_reply_enabled?: boolean
          comment_reply_rules?: string | null
          comment_salesbot_id?: number | null
          comment_source_ids?: number[]
          cooldown_window_hours?: number
          created_at?: string
          crm_actions_enabled?: boolean
          crm_can_move_stage?: boolean
          crm_can_update_contact?: boolean
          crm_can_update_lead?: boolean
          id?: string
          ignored_channels?: string[]
          ignored_stage_ids?: number[]
          is_active?: boolean
          max_responses_per_lead?: number
          notes?: string | null
          publish_from?: string | null
          publishing_enabled?: boolean
          respond_to_audio?: boolean
          respond_to_documents?: boolean
          respond_to_images?: boolean
          response_cooldown_seconds?: number
          response_custom_field_id?: number | null
          response_debounce_seconds?: number
          salesbot_id?: number | null
          shopify_actions_enabled?: boolean
          shopify_can_checkout?: boolean
          shopify_can_orders?: boolean
          shopify_can_search?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      lead_stage_events: {
        Row: {
          created_at: string
          draft_id: string | null
          from_stage_id: number | null
          from_stage_name: string | null
          id: string
          lead_id: string
          moved_by: string
          pipeline_name: string | null
          to_stage_id: number
          to_stage_name: string | null
        }
        Insert: {
          created_at?: string
          draft_id?: string | null
          from_stage_id?: number | null
          from_stage_name?: string | null
          id?: string
          lead_id: string
          moved_by: string
          pipeline_name?: string | null
          to_stage_id: number
          to_stage_name?: string | null
        }
        Update: {
          created_at?: string
          draft_id?: string | null
          from_stage_id?: number | null
          from_stage_name?: string | null
          id?: string
          lead_id?: string
          moved_by?: string
          pipeline_name?: string | null
          to_stage_id?: number
          to_stage_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          channel: string | null
          created_at: string
          display_name: string | null
          first_seen_at: string
          follow_up_last_sent_at: string | null
          follow_up_status: string | null
          follow_up_step: number
          id: string
          kommo_contact_id: number | null
          kommo_lead_id: number | null
          kommo_stage_id: number | null
          last_inbound_at: string | null
          last_message_at: string | null
          metadata: Json
          opted_out: boolean
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          display_name?: string | null
          first_seen_at?: string
          follow_up_last_sent_at?: string | null
          follow_up_status?: string | null
          follow_up_step?: number
          id?: string
          kommo_contact_id?: number | null
          kommo_lead_id?: number | null
          kommo_stage_id?: number | null
          last_inbound_at?: string | null
          last_message_at?: string | null
          metadata?: Json
          opted_out?: boolean
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          display_name?: string | null
          first_seen_at?: string
          follow_up_last_sent_at?: string | null
          follow_up_status?: string | null
          follow_up_step?: number
          id?: string
          kommo_contact_id?: number | null
          kommo_lead_id?: number | null
          kommo_stage_id?: number | null
          last_inbound_at?: string | null
          last_message_at?: string | null
          metadata?: Json
          opted_out?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      memory_items: {
        Row: {
          anthropic_memory_id: string | null
          content: string
          content_tsv: unknown
          created_at: string
          id: string
          lead_id: string | null
          metadata: Json
          source_id: string | null
          source_kind: string
          store_name: string
        }
        Insert: {
          anthropic_memory_id?: string | null
          content: string
          content_tsv?: unknown
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          source_id?: string | null
          source_kind: string
          store_name: string
        }
        Update: {
          anthropic_memory_id?: string | null
          content?: string
          content_tsv?: unknown
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json
          source_id?: string | null
          source_kind?: string
          store_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          answered_by_draft_id: string | null
          classification: Json | null
          content: string
          created_at: string
          direction: string
          id: string
          ignored: boolean
          ignored_reason: string | null
          is_comment: boolean
          kommo_message_id: string | null
          lead_id: string
          media_kind: string | null
          media_url: string | null
          requires_human_review: boolean
          source: string | null
          vertical_id: string | null
        }
        Insert: {
          answered_by_draft_id?: string | null
          classification?: Json | null
          content: string
          created_at?: string
          direction: string
          id?: string
          ignored?: boolean
          ignored_reason?: string | null
          is_comment?: boolean
          kommo_message_id?: string | null
          lead_id: string
          media_kind?: string | null
          media_url?: string | null
          requires_human_review?: boolean
          source?: string | null
          vertical_id?: string | null
        }
        Update: {
          answered_by_draft_id?: string | null
          classification?: Json | null
          content?: string
          created_at?: string
          direction?: string
          id?: string
          ignored?: boolean
          ignored_reason?: string | null
          is_comment?: boolean
          kommo_message_id?: string | null
          lead_id?: string
          media_kind?: string | null
          media_url?: string | null
          requires_human_review?: boolean
          source?: string | null
          vertical_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_answered_by_draft_id_fkey"
            columns: ["answered_by_draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["id"]
          },
        ]
      }
      outcomes: {
        Row: {
          created_at: string
          draft_id: string
          grader_id: string
          id: string
          metadata: Json
          passed: boolean | null
          reasoning: string | null
          score: number | null
        }
        Insert: {
          created_at?: string
          draft_id: string
          grader_id: string
          id?: string
          metadata?: Json
          passed?: boolean | null
          reasoning?: string | null
          score?: number | null
        }
        Update: {
          created_at?: string
          draft_id?: string
          grader_id?: string
          id?: string
          metadata?: Json
          passed?: boolean | null
          reasoning?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcomes_grader_id_fkey"
            columns: ["grader_id"]
            isOneToOne: false
            referencedRelation: "graders"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          content: string
          created_at: string
          enabled: boolean
          ends_at: string | null
          id: string
          kind: string
          name: string
          starts_at: string | null
          updated_at: string
          weekdays: number[] | null
        }
        Insert: {
          content: string
          created_at?: string
          enabled?: boolean
          ends_at?: string | null
          id?: string
          kind?: string
          name: string
          starts_at?: string | null
          updated_at?: string
          weekdays?: number[] | null
        }
        Update: {
          content?: string
          created_at?: string
          enabled?: boolean
          ends_at?: string | null
          id?: string
          kind?: string
          name?: string
          starts_at?: string | null
          updated_at?: string
          weekdays?: number[] | null
        }
        Relationships: []
      }
      runtime_config: {
        Row: {
          is_secret: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          is_secret?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          is_secret?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          cache_creation_tokens: number | null
          cache_read_tokens: number | null
          component: string
          created_at: string
          draft_id: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          is_estimated: boolean
          lead_id: string | null
          metadata: Json | null
          model: string
          output_tokens: number | null
          runtime_ms: number | null
          session_id: string | null
        }
        Insert: {
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          component: string
          created_at?: string
          draft_id?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          is_estimated?: boolean
          lead_id?: string | null
          metadata?: Json | null
          model: string
          output_tokens?: number | null
          runtime_ms?: number | null
          session_id?: string | null
        }
        Update: {
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          component?: string
          created_at?: string
          draft_id?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          is_estimated?: boolean
          lead_id?: string | null
          metadata?: Json | null
          model?: string
          output_tokens?: number | null
          runtime_ms?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      verticals: {
        Row: {
          auto_reply: boolean
          created_at: string
          description: string | null
          examples: Json
          id: string
          ignore: boolean
          name: string
          requires_review: boolean
          slug: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          auto_reply?: boolean
          created_at?: string
          description?: string | null
          examples?: Json
          id?: string
          ignore?: boolean
          name: string
          requires_review?: boolean
          slug: string
          system_prompt: string
          updated_at?: string
        }
        Update: {
          auto_reply?: boolean
          created_at?: string
          description?: string | null
          examples?: Json
          id?: string
          ignore?: boolean
          name?: string
          requires_review?: boolean
          slug?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_samples: {
        Row: {
          anthropic_memory_id: string | null
          content: string
          created_at: string
          id: string
          ingested_at: string | null
          metadata: Json
          source_filename: string | null
          title: string
          type: string
        }
        Insert: {
          anthropic_memory_id?: string | null
          content: string
          created_at?: string
          id?: string
          ingested_at?: string | null
          metadata?: Json
          source_filename?: string | null
          title: string
          type: string
        }
        Update: {
          anthropic_memory_id?: string | null
          content?: string
          created_at?: string
          id?: string
          ingested_at?: string | null
          metadata?: Json
          source_filename?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      usage_daily: {
        Row: {
          calls: number | null
          component: string | null
          day: string | null
          has_estimates: boolean | null
          model: string | null
          total_cache_creation: number | null
          total_cache_read: number | null
          total_cost_usd: number | null
          total_input: number | null
          total_output: number | null
          total_runtime_ms: number | null
        }
        Relationships: []
      }
      usage_hourly_heatmap: {
        Row: {
          calls: number | null
          cost_usd: number | null
          dow: number | null
          hour: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      buscar_precios_seguros: {
        Args: { p_rango_edad: string; p_subcategoria: string }
        Returns: {
          aseguradora: string
          fecha: string
          id_plan: number
          nombre_plan: string
          prima_anual: number
          prima_mensual: number
          suma_asegurada: number
        }[]
      }
      claim_inbound_batch: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          payload: Json
        }[]
      }
      follow_up_due_leads: {
        Args: { p_limit?: number }
        Returns: {
          delay_hours: number
          lead_id: string
          step_number: number
          template_id: string
        }[]
      }
      list_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      retag_kb_document: {
        Args: { p_collection: string; p_doc: string; p_policy_type: string }
        Returns: undefined
      }
      search_kb: {
        Args: {
          p_filter?: Json
          p_limit?: number
          p_min_similarity?: number
          p_query_embedding: string
          p_query_text: string
        }
        Returns: {
          chunk_id: string
          content: string
          document_id: string
          document_title: string
          fts_rank: number
          metadata: Json
          similarity: number
        }[]
      }
      search_knowledge: {
        Args: {
          match_count?: number
          min_similarity?: number
          p_collection?: string
          p_policy_type?: string
          query_embedding: string
        }
        Returns: {
          collection: string
          content: string
          id: number
          policy_type: string
          similarity: number
          source: string
        }[]
      }
      search_memory: {
        Args: {
          p_lead_id: string
          p_limit?: number
          p_query: string
          p_store_name: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          rank: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      trigger_alerts_scan: { Args: never; Returns: undefined }
      trigger_dreams: { Args: { p_period: string }; Returns: undefined }
      trigger_evaluate_outcomes: { Args: never; Returns: undefined }
      trigger_follow_up_scan: { Args: never; Returns: undefined }
      trigger_generate_response: { Args: never; Returns: undefined }
      trigger_process_inbound: { Args: never; Returns: undefined }
      trigger_publish_to_kommo: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
