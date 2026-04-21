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
      banners: {
        Row: {
          active: boolean
          badge: string | null
          badge_he: string | null
          created_at: string
          description: string | null
          description_he: string | null
          id: string
          image_url: string | null
          link: string | null
          sort_order: number
          subtitle: string | null
          subtitle_he: string | null
          tenant_id: string
          title: string | null
          title_he: string | null
        }
        Insert: {
          active?: boolean
          badge?: string | null
          badge_he?: string | null
          created_at?: string
          description?: string | null
          description_he?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          sort_order?: number
          subtitle?: string | null
          subtitle_he?: string | null
          tenant_id: string
          title?: string | null
          title_he?: string | null
        }
        Update: {
          active?: boolean
          badge?: string | null
          badge_he?: string | null
          created_at?: string
          description?: string | null
          description_he?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          sort_order?: number
          subtitle?: string | null
          subtitle_he?: string | null
          tenant_id?: string
          title?: string | null
          title_he?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          due_at: string | null
          id: string
          invoice_number: string | null
          invoice_url: string | null
          metadata: Json | null
          paid_at: string | null
          provider: string
          provider_invoice_id: string | null
          status: string
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          provider: string
          provider_invoice_id?: string | null
          status: string
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          provider?: string
          provider_invoice_id?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          id: string
          quantity: number
          tenant_id: string
          variation_id: string
        }
        Insert: {
          bundle_id: string
          id?: string
          quantity?: number
          tenant_id: string
          variation_id: string
        }
        Update: {
          bundle_id?: string
          id?: string
          quantity?: number
          tenant_id?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_variation_items: {
        Row: {
          bundle_variation_id: string
          id: string
          quantity: number
          tenant_id: string
          variation_id: string
        }
        Insert: {
          bundle_variation_id: string
          id?: string
          quantity?: number
          tenant_id: string
          variation_id: string
        }
        Update: {
          bundle_variation_id?: string
          id?: string
          quantity?: number
          tenant_id?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_variation_items_bundle_variation_id_fkey"
            columns: ["bundle_variation_id"]
            isOneToOne: false
            referencedRelation: "bundle_variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_variation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_variation_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_variations: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          name: string
          name_he: string | null
          price: number
          sku: string | null
          tenant_id: string
          woo_id: number | null
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          name: string
          name_he?: string | null
          price?: number
          sku?: string | null
          tenant_id: string
          woo_id?: number | null
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          name?: string
          name_he?: string | null
          price?: number
          sku?: string | null
          tenant_id?: string
          woo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bundle_variations_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_variations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bundles: {
        Row: {
          bundle_type: Database["public"]["Enums"]["bundle_type"]
          created_at: string
          id: string
          product_id: string
          tenant_id: string
        }
        Insert: {
          bundle_type?: Database["public"]["Enums"]["bundle_type"]
          created_at?: string
          id?: string
          product_id: string
          tenant_id: string
        }
        Update: {
          bundle_type?: Database["public"]["Enums"]["bundle_type"]
          created_at?: string
          id?: string
          product_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          from_register_id: string
          id: string
          notes: string | null
          tenant_id: string
          to_register_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          from_register_id: string
          id?: string
          notes?: string | null
          tenant_id: string
          to_register_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          from_register_id?: string
          id?: string
          notes?: string | null
          tenant_id?: string
          to_register_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_from_register_id_fkey"
            columns: ["from_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_to_register_id_fkey"
            columns: ["to_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_number: number
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          name: string
          name_he: string | null
          slug: string | null
          tenant_id: string
          woo_id: number | null
        }
        Insert: {
          category_number?: number
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name: string
          name_he?: string | null
          slug?: string | null
          tenant_id: string
          woo_id?: number | null
        }
        Update: {
          category_number?: number
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          name_he?: string | null
          slug?: string | null
          tenant_id?: string
          woo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          single_use: boolean
          tenant_id: string
          type: string
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          single_use?: boolean
          tenant_id: string
          type?: string
          used_count?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          single_use?: boolean
          tenant_id?: string
          type?: string
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_company_id: string
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_company_id: string
          id?: string
          notes?: string | null
          order_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_company_id?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_delivery_company_id_fkey"
            columns: ["delivery_company_id"]
            isOneToOne: false
            referencedRelation: "delivery_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_companies: {
        Row: {
          cash_register_id: string | null
          created_at: string
          id: string
          is_active: boolean
          is_internal: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          cash_register_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_internal?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          cash_register_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_internal?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_companies_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          doc_number: string | null
          doc_type: number
          doc_url: string | null
          doc_uuid: string | null
          error_message: string | null
          id: string
          order_id: string | null
          short_code: string | null
          status: string
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          doc_number?: string | null
          doc_type: number
          doc_url?: string | null
          doc_uuid?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          short_code?: string | null
          status?: string
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          doc_number?: string | null
          doc_type?: number
          doc_url?: string | null
          doc_uuid?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          short_code?: string | null
          status?: string
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          cash_register_id: string | null
          created_at: string
          created_by: string | null
          description: string
          document_file: string | null
          document_url: string | null
          id: string
          payment_source: Database["public"]["Enums"]["expense_payment_source"]
          tenant_id: string
        }
        Insert: {
          amount: number
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          document_file?: string | null
          document_url?: string | null
          id?: string
          payment_source: Database["public"]["Enums"]["expense_payment_source"]
          tenant_id: string
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          document_file?: string | null
          document_url?: string | null
          id?: string
          payment_source?: Database["public"]["Enums"]["expense_payment_source"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_session_items: {
        Row: {
          cost_price: number
          id: string
          quantity: number
          session_id: string
          tenant_id: string
          variation_id: string
        }
        Insert: {
          cost_price?: number
          id?: string
          quantity?: number
          session_id: string
          tenant_id: string
          variation_id: string
        }
        Update: {
          cost_price?: number
          id?: string
          quantity?: number
          session_id?: string
          tenant_id?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_session_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_session_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_session_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["intake_status"]
          supplier_name: string | null
          tenant_id: string
          total_items: number
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["intake_status"]
          supplier_name?: string | null
          tenant_id: string
          total_items?: number
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["intake_status"]
          supplier_name?: string | null
          tenant_id?: string
          total_items?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          id: string
          quantity: number
          tenant_id: string
          updated_at: string
          variation_id: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          quantity?: number
          tenant_id: string
          updated_at?: string
          variation_id: string
          warehouse_id: string
        }
        Update: {
          id?: string
          quantity?: number
          tenant_id?: string
          updated_at?: string
          variation_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_log: {
        Row: {
          action_type: Database["public"]["Enums"]["inventory_action_type"]
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          quantity_after: number
          quantity_change: number
          reference_id: string | null
          tenant_id: string
          variation_id: string | null
          warehouse_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["inventory_action_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity_after: number
          quantity_change: number
          reference_id?: string | null
          tenant_id: string
          variation_id?: string | null
          warehouse_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["inventory_action_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity_after?: number
          quantity_change?: number
          reference_id?: string | null
          tenant_id?: string
          variation_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_items: {
        Row: {
          id: string
          quantity: number
          tenant_id: string
          transfer_id: string
          variation_id: string
        }
        Insert: {
          id?: string
          quantity: number
          tenant_id: string
          transfer_id: string
          variation_id: string
        }
        Update: {
          id?: string
          quantity?: number
          tenant_id?: string
          transfer_id?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_warehouse_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          tenant_id: string
          to_warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          tenant_id: string
          to_warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          tenant_id?: string
          to_warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          body: string | null
          channel: string
          context: Json | null
          created_at: string | null
          error: string | null
          event_key: string
          id: string
          locale: string | null
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
          tenant_id: string
        }
        Insert: {
          body?: string | null
          channel: string
          context?: Json | null
          created_at?: string | null
          error?: string | null
          event_key: string
          id?: string
          locale?: string | null
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status: string
          subject?: string | null
          tenant_id: string
        }
        Update: {
          body?: string | null
          channel?: string
          context?: Json | null
          created_at?: string | null
          error?: string | null
          event_key?: string
          id?: string
          locale?: string | null
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          enabled: boolean
          event_key: string
          id: string
          locale: string
          subject: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          body: string
          channel: string
          created_at?: string | null
          enabled?: boolean
          event_key: string
          id?: string
          locale?: string
          subject?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          enabled?: boolean
          event_key?: string
          id?: string
          locale?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          bundle_variation_id: string | null
          created_at: string
          id: string
          order_id: string
          quantity: number
          tenant_id: string
          total_price: number
          unit_price: number
          variation_id: string | null
        }
        Insert: {
          bundle_variation_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          quantity?: number
          tenant_id: string
          total_price?: number
          unit_price?: number
          variation_id?: string | null
        }
        Update: {
          bundle_variation_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_bundle_variation_id_fkey"
            columns: ["bundle_variation_id"]
            isOneToOne: false
            referencedRelation: "bundle_variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_picking_items: {
        Row: {
          id: string
          order_id: string
          order_item_id: string
          picked: boolean
          picked_at: string | null
          picked_by: string | null
          quantity: number
          tenant_id: string
          variation_id: string | null
        }
        Insert: {
          id?: string
          order_id: string
          order_item_id: string
          picked?: boolean
          picked_at?: string | null
          picked_by?: string | null
          quantity?: number
          tenant_id: string
          variation_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          order_item_id?: string
          picked?: boolean
          picked_at?: string | null
          picked_by?: string | null
          quantity?: number
          tenant_id?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_picking_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_picking_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_picking_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_picking_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          assigned_user_id: string | null
          assigned_warehouse_id: string | null
          cash_register_id: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          discount_type: string | null
          discount_value: number | null
          hyp_transaction_id: string | null
          id: string
          includes_vat: boolean | null
          invoice_url: string | null
          notes: string | null
          order_number: number
          payment_link_url: string | null
          payment_method: string | null
          picking_status: Database["public"]["Enums"]["picking_status"] | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_country: string | null
          shipping_postcode: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          total: number
          updated_at: string
          woo_sync_error: string | null
          woo_sync_status: string | null
        }
        Insert: {
          access_token?: string
          assigned_user_id?: string | null
          assigned_warehouse_id?: string | null
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          hyp_transaction_id?: string | null
          id?: string
          includes_vat?: boolean | null
          invoice_url?: string | null
          notes?: string | null
          order_number?: number
          payment_link_url?: string | null
          payment_method?: string | null
          picking_status?: Database["public"]["Enums"]["picking_status"] | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_postcode?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          total?: number
          updated_at?: string
          woo_sync_error?: string | null
          woo_sync_status?: string | null
        }
        Update: {
          access_token?: string
          assigned_user_id?: string | null
          assigned_warehouse_id?: string | null
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          discount_type?: string | null
          discount_value?: number | null
          hyp_transaction_id?: string | null
          id?: string
          includes_vat?: boolean | null
          invoice_url?: string | null
          notes?: string | null
          order_number?: number
          payment_link_url?: string | null
          payment_method?: string | null
          picking_status?: Database["public"]["Enums"]["picking_status"] | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_postcode?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id?: string
          total?: number
          updated_at?: string
          woo_sync_error?: string | null
          woo_sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_warehouse_id_fkey"
            columns: ["assigned_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          order_id: string | null
          success: boolean
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          order_id?: string | null
          success: boolean
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          order_id?: string | null
          success?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          cash_register_id: string | null
          created_at: string
          id: string
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json
          id: string
          is_public: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          sort_order: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_public?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          sort_order?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
          tenant_id: string
        }
        Insert: {
          category_id: string
          product_id: string
          tenant_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          cost_price: number
          created_at: string
          id: string
          image_url: string | null
          name: string
          name_ar: string | null
          price: number
          product_id: string
          sku: string | null
          tenant_id: string
          updated_at: string
          woo_id: number | null
        }
        Insert: {
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          name_ar?: string | null
          price?: number
          product_id: string
          sku?: string | null
          tenant_id: string
          updated_at?: string
          woo_id?: number | null
        }
        Update: {
          cost_price?: number
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          name_ar?: string | null
          price?: number
          product_id?: string
          sku?: string | null
          tenant_id?: string
          updated_at?: string
          woo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          description_ar: string | null
          gallery_images: Json | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          name: string
          name_ar: string | null
          product_number: number
          product_type: Database["public"]["Enums"]["product_type"]
          sale_price: number
          shipping_price: number
          short_description: string | null
          short_description_ar: string | null
          sku: string | null
          tenant_id: string
          updated_at: string
          woo_id: number | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          description_ar?: string | null
          gallery_images?: Json | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          name: string
          name_ar?: string | null
          product_number?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          sale_price?: number
          shipping_price?: number
          short_description?: string | null
          short_description_ar?: string | null
          sku?: string | null
          tenant_id: string
          updated_at?: string
          woo_id?: number | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          description_ar?: string | null
          gallery_images?: Json | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          name?: string
          name_ar?: string | null
          product_number?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          sale_price?: number
          shipping_price?: number
          short_description?: string | null
          short_description_ar?: string | null
          sku?: string | null
          tenant_id?: string
          updated_at?: string
          woo_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reserved_slugs: {
        Row: {
          slug: string
        }
        Insert: {
          slug: string
        }
        Update: {
          slug?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: Json
          id: string
          page: string
          section: string
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          page: string
          section: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          page?: string
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          active: boolean
          created_at: string
          id: string
          recipient_phone: string | null
          recipient_type: string
          template_text: string
          tenant_id: string
          trigger: Database["public"]["Enums"]["sms_trigger"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          recipient_phone?: string | null
          recipient_type?: string
          template_text?: string
          tenant_id: string
          trigger: Database["public"]["Enums"]["sms_trigger"]
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          recipient_phone?: string | null
          recipient_type?: string
          template_text?: string
          tenant_id?: string
          trigger?: Database["public"]["Enums"]["sms_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json | null
          plan_id: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          plan_id: string
          provider: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          branding: Json
          contact_info: Json
          created_at: string | null
          default_locale: string
          feature_flags: Json
          integrations: Json
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          branding?: Json
          contact_info?: Json
          created_at?: string | null
          default_locale?: string
          feature_flags?: Json
          integrations?: Json
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          branding?: Json
          contact_info?: Json
          created_at?: string | null
          default_locale?: string
          feature_flags?: Json
          integrations?: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          id: string
          name: string
          owner_user_id: string | null
          plan_id: string | null
          slug: string
          status: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          plan_id?: string | null
          slug: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          plan_id?: string | null
          slug?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          count: number
          metric: string
          period: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          count?: number
          metric: string
          period: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          count?: number
          metric?: string
          period?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      warehouses: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_payment_links: {
        Row: {
          order_number: number | null
          payment_link_url: string | null
          status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          order_number?: number | null
          payment_link_url?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          order_number?: number | null
          payment_link_url?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_user_tenants: {
        Args: never
        Returns: {
          name: string
          role: string
          slug: string
          status: string
          tenant_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: { p_role: string; p_tenant_id: string }
        Returns: boolean
      }
      increment_cash_register: {
        Args: { delta: number; reg_id: string }
        Returns: number
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_tenant_member: { Args: { p_tenant_id: string }; Returns: boolean }
      resolve_tenant_by_host: {
        Args: { p_host: string }
        Returns: {
          branding: Json
          default_locale: string
          feature_flags: Json
          name: string
          plan_features: Json
          slug: string
          status: string
          tenant_id: string
        }[]
      }
      resolve_tenant_by_slug: {
        Args: { p_slug: string }
        Returns: {
          branding: Json
          default_locale: string
          feature_flags: Json
          name: string
          plan_features: Json
          slug: string
          status: string
          tenant_id: string
        }[]
      }
      switch_active_tenant: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "platform_admin"
      bundle_type: "simple_bundle" | "variable_bundle"
      delivery_status: "pending" | "in_transit" | "delivered"
      expense_payment_source: "credit_card" | "cash_register"
      intake_status: "draft" | "completed"
      inventory_action_type:
        | "intake"
        | "sale"
        | "transfer_in"
        | "transfer_out"
        | "adjustment"
        | "write_off"
      order_source: "manual" | "pos" | "website"
      order_status:
        | "pending"
        | "processing"
        | "completed"
        | "cancelled"
        | "pending_payment"
        | "picking"
        | "shipping"
      payment_method: "cash" | "bit" | "credit"
      picking_status: "not_started" | "in_progress" | "completed"
      product_type: "simple" | "variable"
      sms_trigger:
        | "order_created"
        | "order_shipped"
        | "order_completed"
        | "order_picking"
        | "order_shipping"
      transfer_status: "pending" | "completed"
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
      app_role: ["admin", "user", "platform_admin"],
      bundle_type: ["simple_bundle", "variable_bundle"],
      delivery_status: ["pending", "in_transit", "delivered"],
      expense_payment_source: ["credit_card", "cash_register"],
      intake_status: ["draft", "completed"],
      inventory_action_type: [
        "intake",
        "sale",
        "transfer_in",
        "transfer_out",
        "adjustment",
        "write_off",
      ],
      order_source: ["manual", "pos", "website"],
      order_status: [
        "pending",
        "processing",
        "completed",
        "cancelled",
        "pending_payment",
        "picking",
        "shipping",
      ],
      payment_method: ["cash", "bit", "credit"],
      picking_status: ["not_started", "in_progress", "completed"],
      product_type: ["simple", "variable"],
      sms_trigger: [
        "order_created",
        "order_shipped",
        "order_completed",
        "order_picking",
        "order_shipping",
      ],
      transfer_status: ["pending", "completed"],
    },
  },
} as const
