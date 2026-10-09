export interface ClinikoAppointment {
  id: number | string;
  created_at: string;
  updated_at?: string;
  starts_at?: string;
  ends_at?: string;
  patient?: {
    links?: {
      self?: string;
    };
    id?: number | string;
  };
}

export interface ClinikoAppointmentsResponse {
  individual_appointments: ClinikoAppointment[];
  total_entries?: number;
  links?: {
    self?: string;
    next?: string;
    previous?: string;
  };
}

export interface ClinikoPatientPhoneNumber {
  number: string;
  phone_type?: string;
}

export interface ClinikoPatient {
  id: number | string;
  created_at?: string;
  updated_at?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  patient_phone_numbers?: ClinikoPatientPhoneNumber[];
  date_of_birth?: string;
  gender_identity?: string;
  sex?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  post_code?: string;
  country?: string;
}

export interface ClinikoSyncResult {
  success: boolean;
  syncedCount: number;
  updatedCount: number;
  skippedCount: number;
  totalAppointments: number;
  lastSyncedAt?: string;
  message: string;
}
