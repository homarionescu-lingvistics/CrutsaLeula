import type { Listing, ListingStatus, ListingType } from "@/lib/listings/types";

export type UserRole = "citizen" | "entrepreneur" | "producer" | "transporter";

export type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  role: UserRole | null;
  cui_number: string | null;
  is_verified_sme: boolean;
  ron_local_balance: number;
  koson_balance: number;
  xp_points: number;
  phone: string | null;
  trust_score: number;
  created_at: string;
};

export type BusinessRequest = {
  id: string;
  category: string;
  city: string;
  neighborhood: string;
  upvotes_count: number;
  ai_insights_summary: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type BusinessPostMortem = {
  id: string;
  category: string;
  city: string;
  failure_reasons: string;
  pricing_strategy_notes: string | null;
  min_capital_required: number | null;
  created_by: string | null;
  created_at: string;
};

export type GroupDeal = {
  id: string;
  title: string;
  category: string;
  target_units: number;
  current_units: number;
  unit_price: number;
  status: string;
  created_by: string | null;
};

export type InvestmentOpportunity = {
  id: string;
  company_name: string;
  founder_name: string;
  sector: string;
  city: string;
  description: string | null;
  min_investment: number;
  max_investment: number;
  equity_percentage: number | null;
  timeline_months: number | null;
  risk_score: number;
  co_investors_count: number;
  iban_recipient: string | null;
  crypto_wallet: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  status: "active" | "funded" | "closed" | "paused";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandRomanitate = {
  id: string;
  cod_bare_prefix: string | null;
  cui: string | null;
  nume_brand: string;
  categorie_tip: 1 | 2 | 3 | 4 | 5;
  procent_retentie_ron: number | null;
  brand_alternativ_id: string | null;
  created_at: string;
};

export type InvestmentSubscription = {
  id: string;
  opportunity_id: string;
  investor_id: string;
  amount_invested: number;
  investment_type: "equity" | "loan" | "revenue_share" | "crypto";
  status: "pending" | "confirmed" | "cancelled";
  payment_method: string | null;
  transaction_hash: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          company_name?: string | null;
          role?: UserRole | null;
          cui_number?: string | null;
          is_verified_sme?: boolean;
          ron_local_balance?: number;
          koson_balance?: number;
          xp_points?: number;
          phone?: string | null;
          trust_score?: number;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          company_name?: string | null;
          role?: UserRole | null;
          cui_number?: string | null;
          is_verified_sme?: boolean;
          ron_local_balance?: number;
          koson_balance?: number;
          xp_points?: number;
          phone?: string | null;
          trust_score?: number;
        };
        Relationships: [];
      };
      business_requests: {
        Row: BusinessRequest;
        Insert: {
          id?: string;
          category: string;
          city: string;
          neighborhood: string;
          upvotes_count?: number;
          ai_insights_summary?: Record<string, unknown>;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<BusinessRequest, "id">>;
        Relationships: [];
      };
      business_post_mortems: {
        Row: BusinessPostMortem;
        Insert: {
          id?: string;
          category: string;
          city: string;
          failure_reasons: string;
          pricing_strategy_notes?: string | null;
          min_capital_required?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<BusinessPostMortem, "id">>;
        Relationships: [];
      };
      group_deals: {
        Row: GroupDeal;
        Insert: {
          id?: string;
          title: string;
          category: string;
          target_units: number;
          current_units?: number;
          unit_price: number;
          status?: string;
          created_by?: string | null;
        };
        Update: Partial<Omit<GroupDeal, "id">>;
        Relationships: [];
      };
      listings: {
        Row: Listing;
        Insert: {
          id?: string;
          user_id: string;
          type?: ListingType;
          title: string;
          description?: string | null;
          photo_url?: string | null;
          city?: string | null;
          neighborhood?: string | null;
          price_ron?: number | null;
          barter_ok?: boolean;
          contact_phone?: string | null;
          status?: ListingStatus;
          created_at?: string;
        };
        Update: Partial<Omit<Listing, "id" | "user_id">>;
        Relationships: [];
      };
      phone_login_tokens: {
        Row: {
          id: string;
          phone: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          used_at?: string | null;
        };
        Relationships: [];
      };
      trusted_devices: {
        Row: {
          id: string;
          user_id: string;
          phone: string;
          device_token: string;
          user_agent: string | null;
          last_seen: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          phone: string;
          device_token: string;
          user_agent?: string | null;
          last_seen?: string;
          created_at?: string;
        };
        Update: {
          last_seen?: string;
        };
        Relationships: [];
      };
      handshakes: {
        Row: {
          id: string;
          listing_id: string;
          owner_id: string;
          code: string;
          partner_id: string | null;
          owner_confirmed_at: string | null;
          partner_confirmed_at: string | null;
          confirmed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          owner_id: string;
          code: string;
          partner_id?: string | null;
          owner_confirmed_at?: string | null;
          partner_confirmed_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
        };
        Update: {
          partner_id?: string | null;
          owner_confirmed_at?: string | null;
          partner_confirmed_at?: string | null;
          confirmed_at?: string | null;
        };
        Relationships: [];
      };
      ron_local_ledger: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          amount?: number;
          reason?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      branduri_romanitate: {
        Row: BrandRomanitate;
        Insert: {
          id?: string;
          cod_bare_prefix?: string | null;
          cui?: string | null;
          nume_brand: string;
          categorie_tip: 1 | 2 | 3 | 4 | 5;
          procent_retentie_ron?: number | null;
          brand_alternativ_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<BrandRomanitate, "id">>;
        Relationships: [];
      };
      clearing_offers: {
        Row: {
          id: string;
          user_id: string;
          gives: string;
          wants: string;
          contact_phone: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gives: string;
          wants: string;
          contact_phone?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          gives?: string;
          wants?: string;
          contact_phone?: string | null;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
