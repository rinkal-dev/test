import { EventType } from '../event-types';

export interface WebhookEvent {
  event: EventType | string;
  timestamp: string;
  id: string;
  data: any;
}

export interface BookingEventData {
  booking_uuid: string;
  booking_reference: string;
  guest: {
    uuid: string;
    name: string;
    email: string;
    phone?: string;
  };
  wedding: {
    uuid: string;
    slug?: string;
    name: string;
    bride_name?: string;
    groom_name?: string;
    event_date?: string;
    timezone?: string;
  };
  hotel?: {
    uuid: string;
    name: string;
    address?: string;
  };
  check_in_date: string;
  check_out_date: string;
  total_rooms: number;
  total_nights: number;
  total_amount: number;
  deposit_amount: number;
  final_amount: number;
  currency: string;
  status: string;
  special_requests?: string;
  created_at?: string;
}

export interface PaymentEventData {
  payment_uuid: string;
  booking_uuid?: string;
  booking_reference?: string;
  guest: {
    uuid: string;
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  payment_type: 'deposit' | 'final_payment' | 'full_payment';
  payment_method?: string;
  status: string;
  stripe_payment_intent_id?: string;
  invoice_uuid?: string;
  processed_at?: string;
}

export interface GuestEventData {
  guest_uuid: string;
  name: string;
  email: string;
  phone?: string;
  wedding: {
    uuid: string;
    name: string;
  };
  event_type_specific?: any;
}

export interface WeddingEventData {
  wedding_uuid: string;
  name: string;
  slug?: string;
  bride_name?: string;
  groom_name?: string;
  event_start_date?: string;
  event_end_date?: string;
  hotel?: {
    uuid: string;
    name: string;
  };
  coordinator?: {
    name: string;
    email: string;
  };
  public_url?: string;
  status?: string;
}

export interface InventoryEventData {
  wedding_uuid: string;
  wedding_name: string;
  room_type: {
    uuid: string;
    name: string;
  };
  rooms_allocated: number;
  rooms_booked: number;
  rooms_available: number;
  threshold?: number;
}

export interface InvoiceEventData {
  invoice_uuid: string;
  invoice_number: string;
  booking_uuid?: string;
  booking_reference?: string;
  guest: {
    uuid: string;
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  status: string;
  due_date?: string;
  download_url?: string;
}
