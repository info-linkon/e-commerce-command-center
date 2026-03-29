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
      bundle_items: {
        Row: {
          bundle_id: string
          id: string
          quantity: number
          variation_id: string
        }
        Insert: {
          bundle_id: string
          id?: string
          quantity?: number
          variation_id: string
        }
        Update: {
          bundle_id?: string
          id?: string
          quantity?: number
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
          variation_id: string
        }
        Insert: {
          bundle_variation_id: string
          id?: string
          quantity?: number
          variation_id: string
        }
        Update: {
          bundle_variation_id?: string
          id?: string
          quantity?: number
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
          price: number
          woo_id: number | null
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          name: string
          price?: number
          woo_id?: number | null
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
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
        ]
      }
      bundles: {
        Row: {
          bundle_type: Database["public"]["Enums"]["bundle_type"]
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          bundle_type?: Database["public"]["Enums"]["bundle_type"]
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          bundle_type?: Database["public"]["Enums"]["bundle_type"]
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundles_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
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
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      cash_transfers: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          from_register_id: string
          id: string
          notes: string | null
          to_register_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          from_register_id: string
          id?: string
          notes?: string | null
          to_register_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          from_register_id?: string
          id?: string
          notes?: string | null
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
          created_at: string
          display_order: number
          id: string
          name: string
          woo_id: number | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          woo_id?: number | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          woo_id?: number | null
        }
        Relationships: []
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
        }
        Insert: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_company_id: string
          id?: string
          notes?: string | null
          order_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_company_id?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
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
        }
        Insert: {
          cash_register_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_internal?: boolean
          name: string
        }
        Update: {
          cash_register_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_internal?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_companies_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
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
          status: string
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
          status?: string
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
          status?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
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
          variation_id: string
        }
        Insert: {
          cost_price?: number
          id?: string
          quantity?: number
          session_id: string
          variation_id: string
        }
        Update: {
          cost_price?: number
          id?: string
          quantity?: number
          session_id?: string
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
          total_items?: number
          warehouse_id?: string
        }
        Relationships: [
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
          updated_at: string
          variation_id: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          quantity?: number
          updated_at?: string
          variation_id: string
          warehouse_id: string
        }
        Update: {
          id?: string
          quantity?: number
          updated_at?: string
          variation_id?: string
          warehouse_id?: string
        }
        Relationships: [
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
          variation_id: string
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
          variation_id: string
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
          variation_id?: string
          warehouse_id?: string
        }
        Relationships: [
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
          transfer_id: string
          variation_id: string
        }
        Insert: {
          id?: string
          quantity: number
          transfer_id: string
          variation_id: string
        }
        Update: {
          id?: string
          quantity?: number
          transfer_id?: string
          variation_id?: string
        }
        Relationships: [
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
          to_warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
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
            foreignKeyName: "inventory_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
          variation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
        }
        Insert: {
          id?: string
          order_id: string
          order_item_id: string
          picked?: boolean
          picked_at?: string | null
          picked_by?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          order_item_id?: string
          picked?: boolean
          picked_at?: string | null
          picked_by?: string | null
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
        ]
      }
      orders: {
        Row: {
          assigned_user_id: string | null
          assigned_warehouse_id: string | null
          cash_register_id: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          includes_vat: boolean | null
          notes: string | null
          order_number: number
          picking_status: Database["public"]["Enums"]["picking_status"] | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postcode: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
          woo_sync_error: string | null
          woo_sync_status: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          assigned_warehouse_id?: string | null
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          includes_vat?: boolean | null
          notes?: string | null
          order_number?: number
          picking_status?: Database["public"]["Enums"]["picking_status"] | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postcode?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          woo_sync_error?: string | null
          woo_sync_status?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          assigned_warehouse_id?: string | null
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          includes_vat?: boolean | null
          notes?: string | null
          order_number?: number
          picking_status?: Database["public"]["Enums"]["picking_status"] | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postcode?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
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
        }
        Insert: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference?: string | null
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
          is_published: boolean
          name: string
          name_ar: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          sale_price: number
          short_description: string | null
          short_description_ar: string | null
          sku: string | null
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
          is_published?: boolean
          name: string
          name_ar?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          sale_price?: number
          short_description?: string | null
          short_description_ar?: string | null
          sku?: string | null
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
          is_published?: boolean
          name?: string
          name_ar?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          sale_price?: number
          short_description?: string | null
          short_description_ar?: string | null
          sku?: string | null
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
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
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
      app_role: "admin" | "user"
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
      order_status: "pending" | "processing" | "completed" | "cancelled"
      payment_method: "cash" | "bit" | "credit"
      picking_status: "not_started" | "in_progress" | "completed"
      product_type: "simple" | "variable"
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
      app_role: ["admin", "user"],
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
      order_status: ["pending", "processing", "completed", "cancelled"],
      payment_method: ["cash", "bit", "credit"],
      picking_status: ["not_started", "in_progress", "completed"],
      product_type: ["simple", "variable"],
      transfer_status: ["pending", "completed"],
    },
  },
} as const
