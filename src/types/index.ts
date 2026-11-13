/**
 * Core types for Market Platform
 */

export type UserStatus = "active" | "restricted" | "suspended" | "banned";

export type PlanCode = "free" | "silver" | "gold" | "special";

export interface BenefitsJson {
  schema_version: string;
  limits: {
    max_active_requests: number | null;
    max_monthly_offers: number | null;
    max_active_offers: number | null;
    max_products_in_supply: number | null;
    max_images_per_product: number | null;
    max_support_tickets_monthly: number | null;
    contact_view_quota_monthly: number | null;
  };
  features: {
    priority_support: boolean;
    advanced_analytics: boolean;
    bulk_request: boolean;
    featured_profile: boolean;
    priority_in_pool: "normal" | "high";
    api_access: boolean;
  };
  discounts: {
    commission_percent: number;
    featured_listing_percent: number;
  };
}

export interface AttributesJson {
  schema_version: string;
  attributes: Record<string, string | number | boolean | null>;
  specs: Array<{
    key: string;
    label: string;
    value: string | number | boolean;
    unit: string | null;
    filterable: boolean;
  }>;
  tags: string[];
}
