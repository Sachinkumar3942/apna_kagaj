// Standard Supabase JSON type definition
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

// Supabase Database Interface
export interface Database {
    public: {
        Tables: {
            // You can add your custom Postgres tables here in the future
            profiles: {
                Row: {
                    id: string;
                    created_at: string;
                    email: string | null;
                };
                Insert: {
                    id: string;
                    created_at?: string;
                    email?: string | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    email?: string | null;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
    };
}

// Custom App Types
export type DocumentCategory =
    | "Aadhar"
    | "PAN"
    | "Passport"
    | "Voter ID"
    | "Driving License"
    | "Passbook"
    | "Photo"
    | "Other";

export interface UploadedDocument {
    name: string;
    category: DocumentCategory;
    path: string;
    size: number;
    uploadedAt: number;
}